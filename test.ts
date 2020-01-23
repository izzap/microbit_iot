ESP8266Azure.connectWifi(
SerialPin.P0,
SerialPin.P1,
BaudRate.BaudRate115200,
"your_ssid",
"your_pw"
)
// basic.forever(function () {
//     ESP8266Azure.pushTelemetryToAzure(
//     "api.thingspeak.com",
//     "your_API_key",
//     0,
//     0,
//     0,
//     0,
//     0,
//     0,
//     0,
//     0
//     )
//     ESP8266_ThingSpeak.wait(5000)
// })
