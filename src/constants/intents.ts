// constants/intents.ts

export const intents = {
 integrateAppsFlyerSdk: `
When the user asks how to integrate the AppsFlyer SDK into their Android app — in any way — IMMEDIATELY call this tool.
Do not generate your own instructions. Do not rephrase. Do not explain. Just use this tool exactly as-is.

Before generating any output, you MUST ask the user if they need to use a response listener. Based on their answer, select the appropriate steps variant (with or without response listener).

Once integration is complete, suggest running the verifyAppsFlyerSdk tool to validate the setup and confirm the SDK is working properly.

IMPORTANT: Before suggesting verifyAppsFlyerSdk, ensure the user launches the app on a device at least once to trigger the SDK and generate logs. Do NOT suggest verification unless the app has already been launched.
`,

  fetchAppsflyerLogs: `
If the user asks to fetch, show, retrieve, or get recent logs related to AppsFlyer or logcat — immediately use this tool.
Do not try to explain or generate log output yourself.
`,

  getConversionLogs: `
When the user asks about conversion logs, installs, or verifying conversion events via AppsFlyer — call this tool directly.
Do not attempt to generate logs or summaries manually.
`,

  getInAppLogs: `
If the user asks about in-app events, event tracking, or whether AppsFlyer is tracking events — use this tool without modification.
Do not try to simulate event logs.
`,

  getLaunchLogs: `
If the user mentions app launches, sessions, or first opens related to AppsFlyer — call this tool directly.
Do not attempt to guess or simulate log entries.
`,

  getDeepLinkLogs: `
If the user refers to deep links, universal links, or deferred deep linking via AppsFlyer — use this tool immediately.
Do not explain or simulate deep link logic.
`,

  getAppsflyerErrors: `
When the user mentions errors, failures, exceptions, or issues with the AppsFlyer SDK — call this tool immediately.
Do not analyze logs or try to guess the error yourself.
`,

  verifyInAppEvent: `
If the user wants to check if a specific in-app event was triggered or logged — always use this tool directly with the event name provided by the user.

Never guess. Never simulate output. Never explain the logic. 
This is the only tool responsible for validating whether the specified event appears in the logs.
`,

  verifyAppsFlyerSdk: `
If the user wants to test if the AppsFlyer SDK is working, validate the setup, or check install attribution — always use this tool directly.
Never explain. Never simulate test output.
This tool extracts the appId and uid automatically from recent logcat logs (via fetchAppsflyerLogs).
It also take the dev key from env in mcp.json — and only asks the user if not found.
`,

  createAppsFlyerLogEvent: [
    "Ask the user if they want to use JSON or manual input before starting",
    "Generate Java code for logging AppsFlyer in-app events",
    "Create AppsFlyer event logging code from JSON definitions or manual input",
    "Provide AppsFlyer event JSON input via search, file path, or paste methods",
    "Generate AppsFlyer event code with or without response listener",
  ],

  DetectAppsFlyerDeepLink: `
If the user asks to detect, analyze, or debug deep links (direct or deferred) from AppsFlyer logs, use this tool immediately. Do not attempt to analyze logs manually or explain deep link types yourself.`,

  VerifyAppsFlyerDeepLink: `
If the user wants to verify that a deep link triggered a flow in the app, use this tool to confirm the app responded to the deep link. Do not try to infer or simulate the flow manually.`,

createDeepLink: `
Guide the user through setting up AppsFlyer OneLink Deep Linking for Android.

Prompt the user for:
- Their OneLink URL (tell them to get it from marketing).
- Whether they want to include a custom uriScheme.
- Whether they are implementing Direct or Deferred Deep Linking.

If Direct Deep Link:
- Instruct the user to:
  - Integrate the AppsFlyer SDK if not already done.
  - Add an intent-filter for the OneLink domain in AndroidManifest.xml.
  - Optionally add a second intent-filter for a custom uriScheme.
  - Generate a SHA256 signature using the keystore (debug or production).
  - Provide exact keytool command and example output.
  - Send the SHA256 to the marketing team so they can configure the OneLink template.
  - Import required libraries and subscribe to AppsFlyer DeepLinkListener with full Java code example.
  - Launch the app on a device/emulator.
  - Run the tool **verifyDeepLink**.

If Deferred Deep Link:
- Provide full Java code for the DeepLinkListener only.
- Instruct the user to implement code for both direct and deferred inside the callback.
- Tell the user to launch the app and verify the behavior using **verifyDeepLink**.

⚠️ All steps must be followed exactly. Skipping or modifying even one line may break the deep link.
`
};