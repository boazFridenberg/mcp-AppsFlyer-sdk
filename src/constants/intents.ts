 export const intents = {
    integrateAppsFlyerSdk:
      "When the user asks how to integrate the AppsFlyer SDK into their Android app, IMMEDIATELY call this tool. Do not generate your own response. Do not try to explain. Just use this tool as-is.",
  
    fetchAppsflyerLogs:
      "When the user asks to view or retrieve AppsFlyer logs from logcat, fetch and return them directly.",
  
    getConversionLogs:
      "When the user wants to see AppsFlyer conversion data, call this tool directly.",
  
    getInAppLogs:
      "When the user is checking in-app event tracking via AppsFlyer, use this tool immediately.",
  
    getLaunchLogs:
      "When the user wants to debug app launches or first opens using AppsFlyer, use this tool.",
  
    getDeepLinkLogs:
      "When the user needs to check deep linking behavior, use this tool.",
  
    getAppsflyerErrors:
      "When the user suspects errors or issues in AppsFlyer SDK integration, use this tool.",
  
    testAppsFlyerSdk:
      "When the user asks if AppsFlyer is working or wants to test the SDK setup, use this tool.",
  };  