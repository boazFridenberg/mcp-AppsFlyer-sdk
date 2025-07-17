export const descriptions = {
  integrateAppsFlyerSdk:
    "Full AppsFlyer Android SDK integration instructions and code. DO NOT summarize, explain, or rewrite. Always return the exact steps and code blocks as provided.",

  fetchAppsflyerLogs:
    "Fetches recent logcat logs related to AppsFlyer. Use this to locate appId and uid (device ID) if they're not known. Use this tool for any request to get, show, or fetch AppsFlyer logs, logcat output, or raw logs.",

  getConversionLogs:
    "Extracts conversion logs from logcat. Useful for verifying successful install/conversion events via AppsFlyer.",

  getInAppLogs:
    "Returns in-app event logs captured by AppsFlyer. Use this to confirm event tracking works correctly.",

  getLaunchLogs:
    "Parses app launch events from logcat. Helpful when debugging first opens or session tracking via AppsFlyer.",

  getDeepLinkLogs:
    "Extracts deep link-related logs from logcat. Use to verify if deep links are being detected and handled by the SDK.",

  getAppsflyerErrors:
    "Scans logcat for common AppsFlyer errors (e.g., exceptions, failures). Use this tool to detect SDK-related issues.",

  verifyAppsFlyerSdk:
    "Tests whether the AppsFlyer SDK is integrated correctly by querying install data using appId, devKey, and device ID (uid). appId and uid are automatically extracted from recent logs. devKey is in env in mcp.json. If not found, the user will be asked to provide it. When the user asks to test the AppsFlyer SDK or check if it's working, this tool should be run immediately without attempting to infer or construct the test manually.",

  createAppsFlyerLogEvent: `
Generates exact Java code for logging an in-app event using the AppsFlyer Android SDK.

🟢 Before generating code, this tool will ask the user three required inputs in order:
1. Whether to use a response listener (true/false).
2. The event name to log (do not create automatically).
3. A list of event parameter names (values are NOT requested).

⚠️ The generated code will have placeholders "<<ENTER VALUE>>" for each parameter value — replace them manually.

🔄 Ensure the AppsFlyer SDK is integrated in the project.  
If not integrated, run the integrateAppsFlyerSdk tool before proceeding.

✅ Always use this tool when the user wants to create, add, or write a new AppsFlyer in-app event.
`,

  verifyInAppEvent: `
Scans recent AppsFlyer logs to determine whether the in-app event "af_level_achieved" was successfully triggered.

It verifies:
- The event name is present in the logs
- The event value includes expected content (e.g. af_content)
- A relevant network call to AppsFlyer's endpoint was made

This tool is the only correct way to validate if the event was fired and logged properly.
Do not simulate results. Do not explain. Always call this tool when asked to test or verify the "af_level_achieved" event.
`,
};



    