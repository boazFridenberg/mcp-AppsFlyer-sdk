# MCP Server for AppsFlyer SDK Integration

This MCP server is designed to simplify the integration and testing of the AppsFlyer SDK within Android applications. It provides tools for real-time log processing, SDK validation, and event detection to ensure the integration is working correctly.

## Features

- Easy setup and integration of the AppsFlyer SDK
- Real-time `logcat` streaming and filtering
- Detection of key events: conversion, launch, in-app, and deep links
- Structured log output for analysis and debugging
- Lightweight and modular architecture
- Easy testing for the integration

## Installation
make sure the project is cloned in your local machine, and then build the project using `npx tsc`, and add the following code in the mcp.json in your IDE (copilot, cursor): 
```
"AppsFlyer-mcp": {
      "command": "node",
      "args": ["ABSOLUTE/PATH/mcp-AppsFlyer-sdk/dist/server.js"],
      "cwd": "."
    }
```
## Documentation
for further documentation and help with the appsflyer sdk please refer to [AppsFlyer android sdk](https://dev.appsflyer.com/hc/docs/android-sdk)