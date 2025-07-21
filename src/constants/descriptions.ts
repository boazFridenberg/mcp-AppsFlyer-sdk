export const descriptions = {
  integrateAppsFlyerSdk:
    "Full AppsFlyer Android SDK integration instructions and code. DO NOT summarize, explain, or rewrite. Always return the exact steps and code blocks as provided. You MUST ask the user whether they need to use a response listener before selecting the steps variant.",

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

  createAppsFlyerLogEvent: `Generate Java code to log AppsFlyer in-app events. You will first be asked whether you want to use JSON input (via file search, paste, or file path), or to manually specify the event name and parameters. Then, you will be guided step-by-step.`,

  verifyDeepLink: `
  Do not ask for a device ID unless there are multiple devices connected.
Scans recent AppsFlyer logs to verify that a specific deep link URL was successfully received and handled by the SDK.
The tool filters logs containing the keyword 'deepLink', waits up to 2 seconds for logs to appear, and then checks the latest deep link log entry.
If the given URL appears in the log (either in the line text or in the parsed JSON), it confirms that the deep link was handled correctly. Otherwise, it reports that no matching deep link was found.
This is the only correct way to validate real-time deep link handling using actual logs. Do not simulate. Do not guess. Always use this tool to confirm whether a deep link was received by the SDK.
`,

  verifyInAppEvent: `  Do not ask for a device ID unless there are multiple devices connected.
  Scans recent AppsFlyer logs to verify that a specific in-app event was successfully triggered by the SDK.
The tool filters only in-app logs (with keyword 'INAPP-'), waits up to 2 seconds for logs to arrive, and extracts the most recent one.
It then checks if the specified event name appears in the eventName field or log line. 
If found — it confirms the event was sent. If not — it reports failure.
This is the only correct method to validate in-app events based on real logs. Do not simulate. Do not infer. Always use this tool to confirm whether an event actually fired.`,

  createDeepLink: `
Use this tool to set up AppsFlyer OneLink Deep Linking (Direct or Deferred) in your Android app.

The tool will:
- Prompt the user to enter a OneLink URL.
  If they don’t know what that is, tell them to ask their marketing team.

- Ask whether to include a custom uriScheme
  (used for deep links like myapp:// in addition to https:// links).

- Ask whether this is a Direct or Deferred Deep Link integration.

If Direct:
- Show exact AndroidManifest setup with intent-filter for the OneLink HTTPS domain.
- (Optional) Add a second intent-filter for the uriScheme, if requested.
- Guide the user to generate a SHA256 fingerprint using the debug or release keystore:
    - Provide the exact keytool command and sample output.
- Instruct the user to send the SHA256 fingerprint to the marketing team to configure the OneLink template.
- Provide full Java code to subscribe to AppsFlyer's DeepLinkListener and handle deep link results.
- Instruct the user to launch the app on a real or virtual device to initialize the SDK.
- Then prompt the user to run the tool **verifyDeepLink** to validate the behavior.

If Deferred:
- Show only the Java code to subscribe to the AppsFlyer DeepLinkListener.
- Instruct the user to handle both direct and deferred deep link results inside the callback.
- Prompt the user to launch the app and run the tool **verifyDeepLink**.

⚠️ Every step must be followed exactly.
Any missing or modified line may cause deep linking to fail.
Do not skip or change the instructions.
`,
};


    