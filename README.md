# MCP AppsFlyer SDK MCP Server

A robust Model Context Protocol (MCP) server for integrating, testing, and validating the [AppsFlyer Android SDK](https://dev.appsflyer.com/hc/docs/android-sdk) in Android applications. This tool provides real-time log streaming, event detection, and automated validation to ensure your AppsFlyer integration is correct and reliable.

---

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Running the Server](#running-the-server)
  - [Available Tools & Commands](#available-tools--commands)
- [Log Analysis & Event Validation](#log-analysis--event-validation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support & Reference](#support--reference)

---

## Features
- **Easy AppsFlyer SDK integration guidance**
- **Real-time logcat streaming and filtering** for AppsFlyer logs
- **Automated detection** of key events: conversion, launch, in-app, and deep links
- **Structured log output** for analysis and debugging
- **SDK validation**: test your integration and event logging
- **Error detection**: scan for common AppsFlyer SDK errors
- **Lightweight, modular, and scriptable**

---

## Prerequisites
- **Node.js** (v16+ recommended)
- **TypeScript** (`npx tsc` for build)
- **Android SDK** with `adb` installed and accessible
- At least one Android device (emulator or physical) connected via ADB
- [Model Context Protocol (MCP)](https://github.com/modelcontextprotocol) compatible IDE (e.g., Copilot, Cursor)

---

## Installation
1. **Clone the repository:**
   ```sh
   git clone <repo-url> && cd mcp-AppsFlyer-sdk
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Build the project:**
   ```sh
   npx tsc
   ```

---

## Configuration

### 1. MCP Integration
Add the following to your `mcp.json` (in your IDE, e.g., Copilot/ Cursor):
```json
"AppsFlyer-mcp": {
  "command": "node",
  "args": ["ABSOLUTE/PATH/mcp-AppsFlyer-sdk/dist/server.js"],
  "cwd": ".",
  "env": {
          "DEV_KEY": "YOUR-DEV-KEY"
      }

}
```
Replace `ABSOLUTE/PATH` with the absolute path to your project directory.

### 2. Environment Variables
- **DEV_KEY**: Your AppsFlyer Dev Key (required for SDK validation)
  - Set in your environment or in your IDE's MCP configuration.

---

## Usage

### Running the Server
The server is designed to be launched by your MCP-compatible IDE. Once configured, it will start automatically when you invoke AppsFlyer-related commands or tools.

### Available Tools & Commands
The server exposes the following tools (commands):

| Tool Name                  | Description                                                                                 |
|---------------------------|---------------------------------------------------------------------------------------------|
| `integrateAppsFlyerSdk`    | Step-by-step instructions and code for integrating the AppsFlyer SDK into your Android app.  |
| `testAppsFlyerSdk`         | Validates SDK integration by querying install data using appId, devKey, and device ID.       |
| `fetchAppsflyerLogs`       | Fetches recent logcat logs related to AppsFlyer.                                             |
| `getConversionLogs`        | Extracts conversion/install event logs from logcat.                                          |
| `getInAppLogs`             | Returns in-app event logs captured by AppsFlyer.                                             |
| `getLaunchLogs`            | Parses app launch/session events from logcat.                                                |
| `getDeepLinkLogs`          | Extracts deep link-related logs from logcat.                                                 |
| `getAppsflyerErrors`       | Scans logcat for common AppsFlyer errors and exceptions.                                     |
| `createAppsFlyerLogEvent`  | Generates code instructions for logging an in-app event with AppsFlyer.                      |
| `testInAppEvent`           | Validates if the in-app event `af_level_achieved` was successfully triggered and logged.     |

#### Example Flows
- **Integrate the SDK:** Ask your IDE "How do I integrate AppsFlyer SDK?" and follow the generated steps.
- **Test your integration:** Ask "Test AppsFlyer SDK" to validate your setup.
- **Fetch logs:** Ask "Show recent AppsFlyer logs" to see real-time logcat output.
- **Check for errors:** Ask "Show AppsFlyer errors" to scan for issues.

---

## Log Analysis & Event Validation
- **Log Streaming:** The server streams and buffers logcat output from connected Android devices, filtering for AppsFlyer-related entries.
- **Event Detection:** Tools are provided to extract and validate conversion, in-app, launch, and deep link events.
- **Error Scanning:** Quickly identify SDK errors, exceptions, or misconfigurations via log analysis tools.

---

## Troubleshooting
- **No devices found:** Ensure your Android device is connected and `adb devices` lists it.
- **ADB not found:** Make sure the Android SDK is installed and `adb` is in the expected location:
  - macOS: `~/Library/Android/sdk/platform-tools/adb`
  - Linux: `~/Android/Sdk/platform-tools/adb`
  - Windows: `%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- **DEV_KEY not set:** Set your AppsFlyer Dev Key in your environment or IDE configuration.
- **Multiple devices:** If more than one device is connected, specify the device ID when prompted.
- **Log output is empty:** Make sure your app is running and generating AppsFlyer logs.

---

## Contributing
Pull requests and issues are welcome! Please open an issue to discuss your proposed changes or feature requests.

---

## Support & Reference
- For AppsFlyer SDK documentation, see: [AppsFlyer Android SDK Docs](https://dev.appsflyer.com/hc/docs/android-sdk)
- For MCP protocol and IDE integration, see: [Model Context Protocol](https://github.com/modelcontextprotocol)

---