enum HttpMethod {
    GET,
    POST,
    PUT,
    HEAD,
    DELETE,
    PATCH,
    OPTIONS,
    CONNECT,
    TRACE
}

enum Newline {
    CRLF,
    LF,
    CR
}

OLED.init(128, 64)
OLED.writeStringNewLine("Booting up")
PIT.initWIFI(SerialPin.P8, SerialPin.P12, BaudRate.BaudRate115200)
OLED.writeStringNewLine("Ready")
PIT.connectWifi("SSID", "PWD")
OLED.writeStringNewLine("Connecting")
PIT.wait(5000)
basic.forever(function () {
    OLED.clear()
    if (PIT.wifiState(true)) {
        OLED.writeStringNewLine("Connected")
        OLED.writeStringNewLine("Get")
        PIT.testGet("http://gf-web-site-pitapprentices-s.azurewebsites.net", 80)
        PIT.wait(5000)
        PIT.testPost("http://gf-web-site-pitapprentices-s.azurewebsites.net", 80)
        /*PIT.executeHttpMethod(
            HttpMethod.GET,
            "http://gf-web-site-pitapprentices-s.azurewebsites.net",
            80,
            "/data"
        )
        PIT.wait(5000)
        OLED.writeStringNewLine("Post")
        PIT.executeHttpMethod(
            HttpMethod.POST,
            "http://gf-web-site-pitapprentices-s.azurewebsites.net",
            80,
            "data",
            "Content-Type: application/json, Content-lenght: 12",
            "{'data': 'BanjoNinja'}"
        )
        OLED.writeStringNewLine("Done posting")*/
    } else {
        OLED.writeStringNewLine("Disconnected")
        PIT.connectWifi("JensLyn", "BobaFett")
        OLED.writeStringNewLine("Connecting")
    }
    PIT.wait(5000)
})

/**
 * MakeCode extension for Elecfreak IOT ESP8266 Wifi modules and Azure IOT
 */
//% color=#11497B icon="\uf1eb" block="PIT"
namespace PIT {

    let wifi_connected: boolean = false
    let api_connected: boolean = false
    let last_upload_successful: boolean = false
    let userToken_def: string = ""
    let topic_def: string = ""
    let pauseBaseValue: number = 1000

    const EVENT_ON_ID = 100
    const EVENT_ON_Value = 200
    const EVENT_OFF_ID = 110
    const EVENT_OFF_Value = 210
    let toSendStr = ""

    export enum State {
        //% block="Success"
        Success,
        //% block="Fail"
        Fail
    }

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 0) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200)
                serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            }
            if (serial_str.includes("ERROR") || serial_str.includes("FAIL")) {
                break
            }
            if (input.runningTime() - time > 30000) {
                break
            }
        }
        return result
    }

    /**
    * Initialize ESP8266 module 
    */
    //% block="set ESP8266|RX %tx|TX %rx|Baud rate %baudrate"
    //% tx.defl=SerialPin.P8
    //% rx.defl=SerialPin.P12
    //% ssid.defl=your_ssid
    //% pw.defl=your_password
    export function initWIFI(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        sendAT("AT+RST", 1000) // reset
        basic.pause(100)
    }

    /**
    * connect to Wifi router
    */
    //% block="connect Wifi SSID = %ssid|KEY = %pw"
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    export function connectWifi(ssid: string, pw: string) {

        wifi_connected = false
        api_connected = false
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(100)
    }

    export function testGet(host: string, port: number): void {
        let data: string = "AT+CIPSTART=\"TCP\",\"" + host + "\"," + port
        sendAT(data, pauseBaseValue * 6)
        sendAT("AT+CIPSEND=9", 5000)
        sendAT("GET /data")

    }

    export function testPost(host: string, port: number): void {
        let data: string = "AT+CIPSTART=\"TCP\",\"" + host + "\"," + port
        sendAT(data, pauseBaseValue * 6)

        data = "POST /data HTTP/1.1\r\nHost: " + host + "\r\n" + "Content-Type: application/json\r\nContent-Length: 18\r\n"
            + "{\"data\":\"Eurika!\"}"

        sendAT("AT+CIPSEND=" + data.length + 2, 5000)
        sendAT(data + "\u000D" + "\u000A")

    }

    /**
     * Execute HTTP method.
     * @param method HTTP method, eg: HttpMethod.GET
     * @param host Host, eg: "google.com"
     * @param port Port, eg: 80
     * @param urlPath Path, eg: "/search?q=something"
     * @param headers Headers
     * @param body Body
     */
    //% weight=96
    //% blockId="wfb_http" block="execute HTTP method %method|host: %host|port: %port|path: %urlPath||headers: %headers|body: %body"
    export function executeHttpMethod(method: HttpMethod, host: string, port: number, urlPath: string, headers?: string, body?: string): void {
        let myMethod: string
        switch (method) {
            case HttpMethod.GET: myMethod = "GET"; break;
            case HttpMethod.POST: myMethod = "POST"; break;
            case HttpMethod.PUT: myMethod = "PUT"; break;
            case HttpMethod.HEAD: myMethod = "HEAD"; break;
            case HttpMethod.DELETE: myMethod = "DELETE"; break;
            case HttpMethod.PATCH: myMethod = "PATCH"; break;
            case HttpMethod.OPTIONS: myMethod = "OPTIONS"; break;
            case HttpMethod.CONNECT: myMethod = "CONNECT"; break;
            case HttpMethod.TRACE: myMethod = "TRACE";
        }
        // Establish TCP connection:
        let data: string = "AT+CIPSTART=\"TCP\",\"" + host + "\"," + port
        OLED.clear()
        OLED.writeStringNewLine(data)

        sendAT(data, pauseBaseValue * 6)

        api_connected = waitResponse()
        basic.pause(100)

        if (api_connected) {
            OLED.writeStringNewLine("API connected")
        } else {
            OLED.writeStringNewLine("API not connected")
        }

        //OLED.clear()

        data = myMethod + " " + urlPath + " HTTP/1.1" + "\u000D" + "\u000A" // + "Host: " + host + "\u000D" + "\u000A"

        // data = "GET /data"

        if (headers && headers.length > 0) {
            data += headers + "\u000D" + "\u000A"
        }
        if (data && data.length > 0) {
            data += "\u000D" + "\u000A" + body + "\u000D" + "\u000A"
        }

        data += "\u000D" + "\u000A"
        // Send data:
        sendAT("AT+CIPSEND=" + (data.length), pauseBaseValue * 3)
        sendAT(data, pauseBaseValue * 6)
        OLED.writeStringNewLine(data)
        last_upload_successful = waitResponse()

        // Close TCP connection:
        sendAT("AT+CIPCLOSE", pauseBaseValue * 3)
    }

    /**
    * Wait between uploads
    */
    //% block="Wait %delay ms"
    //% delay.min=0 delay.defl=5000
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected %State"
    export function wifiState(state: boolean) {
        if (wifi_connected == state) {
            return true
        }
        else {
            return false
        }
    }


    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="ThingSpeak Last data upload %State"
    //% subcategory="ThingSpeak"
    export function tsLastUploadState(state: boolean) {
        if (last_upload_successful == state) {
            return true
        }
        else {
            return false
        }
    }
}
