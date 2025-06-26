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
      "Tests whether the AppsFlyer SDK is integrated correctly by querying install data using appId, devKey, and device ID (uid). To find appId and uid, run 'fetchAppsflyerLogs'. Dev key may be found in source code or should be requested from the user. When users ask if the AppsFlyer SDK is working, run this tool.",
  
        createAppsFlyerLogEvent: `Provides exact, step-by-step code for logging in-app events with AppsFlyer. This tool MUST be used for any request involving logEvent, event tracking, or event listener integration.`,

      

};



    