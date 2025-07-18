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
Scans recent AppsFlyer logs to determine whether a specific in-app event (provided by the user) was successfully triggered.

It verifies:
- That a log line contains the event name provided (e.g. "af_level_achieved", "af_purchase", etc.)
- That the event value is present, structured correctly, and contains meaningful parameters (e.g. af_content, af_revenue)
- That a matching network call was made to the correct AppsFlyer endpoint (androidevent?app_id=...)

This tool parses actual log lines as JSON and checks them structurally — not just by text includes. It ensures that the event was actually fired by the app, and that the SDK triggered the expected behavior.

This tool is the only correct way to validate if an in-app event was fired and logged properly.
Do not simulate results. Do not explain. Always call this tool when asked to test, verify, or confirm any in-app event by name.
`,
};



    