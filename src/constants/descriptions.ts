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

  testAppsFlyerSdk:
    "Tests whether the AppsFlyer SDK is integrated correctly by querying install data using appId, devKey, and device ID (uid). appId and uid are automatically extracted from recent logs. devKey is searched in the project files, usually under the src/ directory in a file named safe.ts. If not found, the user will be asked to provide it. When the user asks to test the AppsFlyer SDK or check if it's working, this tool should be run immediately without attempting to infer or construct the test manually.",

  createAppsFlyerLogEvent:
    "Generates exact code instructions for logging an in-app event using AppsFlyer. Always use this tool when event tracking with logEvent is mentioned. Do not answer manually.",
};



    