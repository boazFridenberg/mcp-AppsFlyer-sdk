// constants/intents.ts

export const intents = {
  integrateAppsFlyerSdk: `
When the user asks how to integrate the AppsFlyer SDK into their Android app — in any way — IMMEDIATELY call this tool.
Do not generate your own instructions. Do not rephrase. Do not explain. Just use this tool exactly as-is.
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

  testAppsFlyerSdk: `
If the user wants to test if the AppsFlyer SDK is working, validate the setup, or check install attribution — always use this tool directly.
Never explain. Never simulate test output.
`,
generateAppsFlyerEventCode: [
  "When the user asks how to log an event with AppsFlyer, IMMEDIATELY call this tool. Do not answer yourself.",
  "If the user asks about in-app event logging, code, or examples for logEvent, always use this tool.",
],
};
