# O.MG Cable Communication Protocol

This document describes the communication protocol used by O.MG Cable devices. It serves as a reference for implementing the WebSerial API integration in our application.

## 1. Connection Specifications

- **Connection Type**: Serial over USB
- **Baud Rate**: 115200
- **Data Bits**: 8
- **Stop Bits**: 1
- **Parity**: None
- **Flow Control**: None
- **Line Ending**: CR+LF (\r\n)

## 2. Command Structure

All commands follow a simple text-based structure:

```
COMMAND [PARAMETERS]\r\n
```

The device responds with:

```
RESPONSE_DATA\r\n
OK\r\n
```

or in case of an error:

```
ERROR: ERROR_MESSAGE\r\n
```

## 3. Command Reference

### Device Information

#### GET_INFO
Returns basic information about the device.

```
GET_INFO\r\n
```

Response:
```
O.MG Elite Cable
FW: 2.4.0
ID: OMG-XXXX-YYYY-ZZZZ
OK
```

#### GET_VERSION
Returns firmware version information.

```
GET_VERSION\r\n
```

Response:
```
2.4.0
OK
```

#### GET_CAPABILITIES
Returns device capabilities.

```
GET_CAPABILITIES\r\n
```

Response:
```
USB_HID: ENABLED
WIFI: ENABLED
BT: DISABLED
STORAGE: 512KB
OK
```

### DuckyScript Commands

#### DUCKY_MODE
Enter DuckyScript mode to prepare for payload transmission.

```
DUCKY_MODE\r\n
```

Response:
```
READY FOR DUCKYSCRIPT
OK
```

#### DUCKY_WRITE
Write a DuckyScript payload to the device memory. Must be called after DUCKY_MODE.

```
DUCKY_WRITE\r\n
[RAW DUCKYSCRIPT PAYLOAD DATA]
END\r\n
```

Response:
```
PAYLOAD RECEIVED (X BYTES)
OK
```

#### DUCKY_EXECUTE
Execute the stored DuckyScript payload.

```
DUCKY_EXECUTE\r\n
```

Response:
```
EXECUTING PAYLOAD
OK
```

#### DUCKY_SAVE
Save the current DuckyScript payload to a slot.

```
DUCKY_SAVE [SLOT_NUMBER]\r\n
```

Response:
```
PAYLOAD SAVED TO SLOT X
OK
```

#### DUCKY_LOAD
Load a DuckyScript payload from a slot.

```
DUCKY_LOAD [SLOT_NUMBER]\r\n
```

Response:
```
PAYLOAD LOADED FROM SLOT X
OK
```

### Wi-Fi Configuration

#### WIFI_SCAN
Scan for available Wi-Fi networks.

```
WIFI_SCAN\r\n
```

Response:
```
NETWORK: MyNetwork1, RSSI: -67, SECURE: YES
NETWORK: MyNetwork2, RSSI: -85, SECURE: YES
NETWORK: OpenWifi, RSSI: -72, SECURE: NO
OK
```

#### WIFI_CONNECT
Connect to a Wi-Fi network.

```
WIFI_CONNECT [SSID] [PASSWORD]\r\n
```

Response:
```
CONNECTING...
CONNECTED TO [SSID]
IP: 192.168.1.100
OK
```

#### WIFI_STATUS
Get current Wi-Fi connection status.

```
WIFI_STATUS\r\n
```

Response:
```
STATUS: CONNECTED
SSID: MyNetwork
IP: 192.168.1.100
RSSI: -65
OK
```

### Device Control

#### RESTART
Restart the device.

```
RESTART\r\n
```

Response:
```
RESTARTING...
```

#### FACTORY_RESET
Reset the device to factory defaults.

```
FACTORY_RESET\r\n
```

Response:
```
WARNING: ALL DATA WILL BE ERASED
CONFIRM WITH 'YES' TO CONTINUE
```

After sending "YES\r\n":
```
FACTORY RESET IN PROGRESS...
```

## 4. Error Handling

Common error messages include:

- `ERROR: COMMAND NOT RECOGNIZED`: Unknown command
- `ERROR: INVALID PARAMETERS`: Command parameters are incorrect
- `ERROR: NOT IN DUCKY MODE`: Trying to send a DuckyScript command when not in DuckyScript mode
- `ERROR: PAYLOAD TOO LARGE`: DuckyScript payload exceeds available memory
- `ERROR: WIFI NOT AVAILABLE`: Wi-Fi functionality not available
- `ERROR: CONNECTION FAILED`: Failed to connect to Wi-Fi network
- `ERROR: INVALID SLOT`: Referenced an invalid storage slot

## 5. Command Flow Examples

### Example 1: Deploy a DuckyScript Payload

```
GET_INFO\r\n
O.MG Elite Cable
FW: 2.4.0
ID: OMG-XXXX-YYYY-ZZZZ
OK

DUCKY_MODE\r\n
READY FOR DUCKYSCRIPT
OK

DUCKY_WRITE\r\n
DELAY 1000
STRING Hello, world!
ENTER
END\r\n
PAYLOAD RECEIVED (36 BYTES)
OK

DUCKY_EXECUTE\r\n
EXECUTING PAYLOAD
OK
```

### Example 2: Configure Wi-Fi

```
WIFI_SCAN\r\n
NETWORK: MyNetwork, RSSI: -67, SECURE: YES
NETWORK: OpenWifi, RSSI: -72, SECURE: NO
OK

WIFI_CONNECT MyNetwork MyPassword\r\n
CONNECTING...
CONNECTED TO MyNetwork
IP: 192.168.1.100
OK
```

## 6. USB HID Protocol Details

When executing payloads, the O.MG Cable switches to USB HID mode to simulate keyboard inputs. The device handles the conversion of DuckyScript commands to the appropriate USB HID reports. The application doesn't need to handle the USB HID protocol directly but should be aware of the capabilities and limitations:

- Up to 890 keystrokes per second
- Support for all standard keyboard keys and modifiers
- Support for language-specific keyboard layouts
- No driver installation required on target systems 