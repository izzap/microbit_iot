/**
 * MakeCode extension for Elecfreak IOT ESP8266 Wifi modules and Azure IOT
 */
//% color=#11497B icon="\uf1eb" block="ESP8266 Azure"
namespace ESP8266Azure {

    let wifi_connected: boolean = false
    let azure_connected: boolean = false
    let last_upload_successful: boolean = false
    let serial_str: string = ""

    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function wait_for_response(str: string): boolean {
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200) {
                serial_str = serial_str.substr(serial_str.length - 200)
            }
            if (serial_str.includes(str)) {
                result = true
                break
            }
            if (input.runningTime() - time > 300000) break
        }
        return result
    }

    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% block="Initialize ESP8266|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID = %ssid|Wifi PW = %pw"
    //% tx.defl=SerialPin.P8
    //% rx.defl=SerialPin.P12
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    export function connectWifi(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, ssid: string, pw: string) {
        wifi_connected = false
        azure_connected = false
        serial.redirect(tx, rx, baudrate)

        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+RST", 1000)
        sendAT("AT+CWMODE=1") // set to STA mode
        
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router

        wifi_connected = wait_for_response("OK")

        if (!wifi_connected) 
            control.reset()

        // display IP (you'll need this in STA mode; in AP mode it would be default 192.168.4.1)
        sendAT("AT+CIFSR")
        
        // startup completed
        basic.showIcon(IconNames.Yes)
    }
z
   
    /**
     * Get Workday
     */
    //% block="Get workday "
    export function GetWorkDay() : string {
        if (wifi_connected) {
            sendAT('AT+CIPSTART="TCP","104.41.216.137",80', 0) // connect to website server
            azure_connected = waitResponse("OK")
            basic.pause(100)

            if (azure_connected) {
                let str: string = "GET /api/workday"
                sendAT("AT+CIPSEND=" + str.length +2)
                sendAT(str, 0)

                last_upload_successful = waitResponse("SEND OK")
                basic.pause(100)

                if(last_upload_successful) {
                    sendAT(AT+CIPCLOSE)

                    if(wait_for_response("CLOSED\nOK")) {
                        azure_connected = false;
                    }
                }

                return "success http"
            }
            return "no server"
        }

        return "no wifi"
    }

        /**
     * Read response
     */
    //% block="Read response"
    export function readResponse(): string {
        let response: string = ""
        let time: number = input.runningTime()
        while (true) {
            response += serial.readString()
            if (response.length > 10) {
                break;
            }

            if (input.runningTime() - time > 30000) {
                break
            }
        }
        return response
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
