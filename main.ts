/**
 * MakeCode extension for Elecfreak IOT ESP8266 Wifi modules and Azure IOT
 */
//% color=#11497B icon="\uf1eb" block="ESP8266 Azure"
namespace ESP8266Azure {

    let wifi_connected: boolean = false
    let azure_connected: boolean = false
    let last_upload_successful: boolean = false

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
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
            if (serial_str.length > 200) serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 30000) break
        }
        return result
    }

    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% block="Initialize ESP8266|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID = %ssid|Wifi PW = %pw"
    //% tx.defl=SerialPin.P0
    //% rx.defl=SerialPin.P1
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    export function connectWifi(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, ssid: string, pw: string) {
        wifi_connected = false
        azure_connected = false
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        sendAT("AT+RST", 1000) // reset
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(100)
    }

   
    /**
     * Get Workday
     */
    //% block="Get workday "
    export function GetWorkDay() {
        if (wifi_connected) {
            sendAT("AT+CIPSTART=\"TCP\",\"https://workassistantapi.azurewebsites.net\",443", 0) // connect to website server
            azure_connected = waitResponse()
            basic.pause(100)

            if (azure_connected) {
                let str: string = "GET /api/workday"
                sendAT("AT+CIPSEND=" + str.length +2)
                sendAT(str, 0)

                last_upload_successful = waitResponse()
                basic.pause(100)

                return true
            }
        }

        return false
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
    //% block="Wifi connected ?"
    export function isWifiConnected() {
        return wifi_connected
    }

    /**
    * Check if ESP8266 successfully connected to Azure
    */
    //% block="Azure connected ?"
    export function isAzureConnected() {
        return azure_connected
    }

    /**
    * Check if ESP8266 successfully uploaded data to Azure
    */
    //% block="Last data upload successful ?"
    export function isLastUploadSuccessful() {
        return last_upload_successful
    }

}
