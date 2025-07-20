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

  createAppsFlyerLogEvent:
    "Generates exact code instructions for logging an in-app event using AppsFlyer. Always use this tool when event tracking with logEvent is mentioned. Do not answer manually.",

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

  DetectAppsFlyerDeepLink: `
Detects and analyzes deep links triggered from AppsFlyer logs, including type (direct/deferred), values, and errors. Use this tool to determine if a deep link was received and what kind of deep link it was.`,

  VerifyAppsFlyerDeepLinkHandled: `
Verifies that a deep link triggered a flow in the app by analyzing logs for activity starts, routing, and deep link values. Use this tool to confirm that the app responded to a deep link as expected.`,

createDeepLink: `
Use this tool to set up AppsFlyer OneLink Deep Linking (Direct or Deferred) in your Android app.

The tool will:
- Prompt the user to enter a OneLink URL.
  If they don’t know what that is, tell them to ask their marketing team.

- Ask whether to include a custom uriScheme
  (used for non-HTTPS deep links like myapp://).

- Ask whether this is a Direct or Deferred Deep Link integration.

If Direct:
- Show exact AndroidManifest setup with intent-filter for the OneLink HTTPS domain.
- (Optional) Add a second intent-filter for the uriScheme, if requested.
- Guide the user to generate a SHA256 fingerprint using the debug or release keystore:
    - Provide the exact keytool command and example output.
- Instruct the user to send the SHA256 fingerprint to the marketing team to configure the OneLink template.
- Provide full Java code to subscribe to AppsFlyer's DeepLinkListener and handle deep link results.
- Instruct the user to launch the app on a physical device or emulator.
- Then prompt the user to run the tool **verifyDeepLink**.

If Deferred:
- Ensure the app is freshly installed (not updated).
- Show full code to set up the AppsFlyerConversionListener inside the SDK initialization.
- Instruct the user to:
    - Handle af_dp value inside onConversionDataSuccess.
    - Launch the app and check the flow.
- Then prompt the user to run:
    - **integrateAppsFlyerSdk** to verify SDK setup.
    - **verifyAppsFlyerSdk** to validate deferred deep linking data flow.

⚠️ Every step must be followed exactly.
Any missing or modified line may cause deep linking to fail.
Do not skip any instruction or change the order.
`};



    