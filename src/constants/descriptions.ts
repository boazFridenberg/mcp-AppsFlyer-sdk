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
  };

  export const integrateAppsFlyerSdkInstructions = [
    `⚠️ Use exactly as written below. Do not modify.\n`,
  
    `1. Declare repositories  
  In the **Project** \`build.gradle\` file, declare the \`mavenCentral\` repository:
  
  \`\`\`gradle
  repositories {
    mavenCentral()
  }
  \`\`\``,
  
    `2. Add the SDK dependency  
  In the **Application** \`build.gradle\` file, add the latest SDK package:
  
  \`\`\`gradle
  dependencies { 
    // Get the latest version from https://mvnrepository.com/artifact/com.appsflyer/af-android-sdk 
    implementation 'com.appsflyer:af-android-sdk'
  }
  \`\`\``,
  
    `3. Add permissions  
  Add the following permissions to \`AndroidManifest.xml\` inside the \`<manifest>\` section:
  
  \`\`\`xml
  <manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="com.appsflyer.onelink.appsflyeronelinkbasicapp">
  
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  </manifest>
  \`\`\``,
  
    `4. Import AppsFlyer SDK  
  In your global \`Application\` class, import AppsFlyerLib:
  
  \`\`\`java
  import com.appsflyer.AppsFlyerLib;
  \`\`\``,
  
    `5. Initialize the SDK  
  Inside the \`onCreate()\` method of your \`Application\` class, call \`init\`:
  
  \`\`\`java
  AppsFlyerLib.getInstance().init("sQ84wpdxRTR4RMCaE9YqS4", null, this);
  \`\`\``,
  
    `6. Start the SDK  
  Right after \`init()\`, call \`start()\` with context:
  
  \`\`\`java
  AppsFlyerLib.getInstance().start(this);
  \`\`\``,
  ];
  