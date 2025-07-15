export const steps = {
  integrateAppsFlyerSdk: [
    `⚠️ Use exactly as written below. Do not modify.\n`,

    `**1. Declare repositories**  
In the **Project** \`build.gradle\` file, declare the \`mavenCentral()\` repository:

\`\`\`gradle
repositories {
  mavenCentral()
}
\`\`\``,

    `**2. Add Dependencies**  
In the **Application** \`build.gradle\` file, add the latest SDK package:

\`\`\`gradle
dependencies { 
  // Get the latest version from https://mvnrepository.com/artifact/com.appsflyer/af-android-sdk 
  implementation 'com.appsflyer:af-android-sdk'
}
\`\`\``,

    `**3. Setting required permissions**  
Add the following permissions inside your \`AndroidManifest.xml\`:

\`\`\`xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
\`\`\``,

    `**4. Start SDK**  
In your global \`Application\` class, import:

\`\`\`java
import com.appsflyer.AppsFlyerLib;
\`\`\``,

    `**5. Add DebugLog before init**  
Inside the \`onCreate()\` method of your \`Application\` class, call:

\`\`\`java
AppsFlyerLib.getInstance().setDebugLog(true);
\`\`\``,

    `**6. Initialize the SDK**  
Inside the \`onCreate()\` method of your \`Application\` class, call:

\`\`\`java
AppsFlyerLib.getInstance().init("<YOUR-DEV-KEY>", null, this);
\`\`\``,

    `**7. Start the SDK**  
Immediately after \`init()\`, call:

\`\`\`java
AppsFlyerLib.getInstance().start(this);
\`\`\``,

    `✅ **Done!**  
Now that the SDK is integrated, you can verify that it's working properly.

🚀 **Next step:**  
Launch your app on a real or virtual device to let the AppsFlyer SDK initialize and send logs.

🔍 **Then:**  
Run the **verifyAppsFlyerSdk** tool to confirm the integration was successful and data is being sent correctly.`
  ],
  createAppsFlyerLogEvent: (includeListener: boolean): string[] => [
    `🚨 Copy exactly as written below. Do NOT change anything. Every word matters!\n`,

    `**1. Import predefined event names**  
\`\`\`java
import com.appsflyer.AFInAppEventType;
\`\`\``,

    `**2. Import predefined event parameter names and Map.**  
\`\`\`java
import com.appsflyer.AFInAppEventParameterName;
import java.util.Map;
\`\`\``,

    ...(includeListener
      ? [
          `**3. Import the response listener**  
\`\`\`java
import com.appsflyer.attribution.AppsFlyerRequestListener;
\`\`\``,

          `**4. Create a Map and add parameters**  
\`\`\`java
Map<String, Object> eventValues = new HashMap<>();
\`\`\``,

          `**5. Add an event parameter**  
\`\`\`java
eventValues.put(AFInAppEventParameterName.CONTENT, "<<PLACE_HOLDRER_FOR_PARAM_VALUE>>");
\`\`\``,

          `**6. Send the event with a listener**  
\`\`\`java
AppsFlyerLib.getInstance().logEvent(
  getApplicationContext(),
  <<Event name>>,
  eventValues,
  new AppsFlyerRequestListener() {
    @Override
    public void onSuccess() {
      // YOUR CODE UPON SUCCESS
    }
    @Override
    public void onError(int i, String s) {
      // YOUR CODE FOR ERROR HANDLING
    }
  });
\`\`\``,
        ]
      : [
          `**3. Create a Map and add parameters**  
\`\`\`java
Map<String, Object> eventValues = new HashMap<>();
\`\`\``,

          `**4. Add an event parameter**  
\`\`\`java
eventValues.put(AFInAppEventParameterName.CONTENT, "<<PLACE_HOLDRER_FOR_PARAM_VALUE>>");
\`\`\``,

          `**5. Send the event without a listener**  
\`\`\`java
AppsFlyerLib.getInstance().logEvent(getApplicationContext(), <<Event name>>, eventValues);
\`\`\``,
        ]),
  ],
  AppsFlyerOneLinkDeepLinkSetupPrompt: [
      `✅ Guide to integrate Deep Linking with AppsFlyer OneLink (example URL: https://onelink-basic-app.onelink.me/H5hv/apples)`,
    
      `**1. Update AndroidManifest.xml**
    
    Add this intent-filter to your MainActivity:`,
    
      `\`\`\`xml
    <activity
      android:name=".MainActivity"
      android:exported="true"
      android:launchMode="singleTask">
      <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
          android:scheme="https"
          android:host="onelink-basic-app.onelink.me"
          android:pathPrefix="/H5hv/apples" />
      </intent-filter>
    </activity>
    \`\`\``,
    
      `**2. Initialize AppsFlyer SDK**
    
    Initialize the SDK early in your app (e.g., in Application.onCreate or MainActivity.onCreate):`,
    
      `\`\`\`java
    AppsFlyerLib.getInstance().setOneLinkCustomDomain("he.wikipedia.org"); // Replace with your domain
    AppsFlyerLib.getInstance().start(getApplicationContext(), "YOUR_APPSFLYER_DEV_KEY");
    \`\`\``,
    
      `**3. Handle Deep Link Intent in MainActivity**
    
    Process the Intent containing the deep link URI:`,
    
      `\`\`\`java
    @Override
    protected void onNewIntent(Intent intent) {
      super.onNewIntent(intent);
      Uri data = intent.getData();
      if (data != null) {
        String path = data.getPath();
        if ("/H5hv/apples".equals(path)) {
          // Add your custom logic here
        }
      }
    }
    \`\`\``,
    
      `**4. Testing**
    
    - Use adb to test the deep link:`,
    
      `\`\`\`bash
    adb shell am start -a android.intent.action.VIEW -d "https://onelink-basic-app.onelink.me/H5hv/apples" your.package.name
    \`\`\``,
    
      `- Or test via AppsFlyer OneLink test links from the dashboard.`,
    
      `**5. (Optional) Upload assetlinks.json**
    
    Upload the file here to enable App Links verification:`,
    
      `\`\`\`
    https://onelink-basic-app.onelink.me/.well-known/assetlinks.json
    \`\`\``,
    
      `**6. Imports for Deep Linking**`,
    
      `\`\`\`java
    import com.appsflyer.deeplink.DeepLink;
    import com.appsflyer.deeplink.DeepLinkListener;
    import com.appsflyer.deeplink.DeepLinkResult;
    \`\`\``,
    
      `**7. Subscribe to DeepLinkListener**`,
    
      `\`\`\`java
    AppsFlyerLib.getInstance().subscribeForDeepLink(new DeepLinkListener() {
      @Override
      public void onDeepLinking(@NonNull DeepLinkResult deepLinkResult) {
        // TODO - handle the deep link result here
      }
    });
    \`\`\``,
    
      `**8. Handle Deep Link Listener Logic**`,
    
      `\`\`\`java
    AppsFlyerLib.getInstance().subscribeForDeepLink(new DeepLinkListener() {
      @Override
      public void onDeepLinking(@NonNull DeepLinkResult deepLinkResult) {
        DeepLinkResult.Status dlStatus = deepLinkResult.getStatus();
        if (dlStatus == DeepLinkResult.Status.NOT_FOUND) {
          Log.d(LOG_TAG, "Deep link not found");
          return;
        } else if (dlStatus == DeepLinkResult.Status.ERROR) {
          DeepLinkResult.Error dlError = deepLinkResult.getError();
          Log.d(LOG_TAG, "Error getting Deep Link data: " + dlError.toString());
          return;
        } else {
          Log.d(LOG_TAG, "Deep link found");
        }
        DeepLink deepLinkObj = deepLinkResult.getDeepLink();
        try {
          Log.d(LOG_TAG, "DeepLink data: " + deepLinkObj.toString());
          String deepLinkDestination = deepLinkObj.getDeepLinkValue();
          if (deepLinkObj.isDeferred()) {
            Log.d(LOG_TAG, "Deferred deep link flow");
            // Handle deferred deep link
          } else {
            Log.d(LOG_TAG, "Direct deep link flow");
            // Handle direct deep link
          }
          // Navigate or handle destination here
        } catch (Exception e) {
          Log.d(LOG_TAG, "DeepLink data was null");
        }
      }
    });
    \`\`\``,
    
      `**9. Summary Notes**`,
    
      `- Use \`singleTask\` or \`singleTop\` for launchMode.
    - Make sure scheme/host in manifest and OneLink match.
    - For App Links, verify assetlinks.json is hosted.
    - For URI schemes (e.g. \`myapp://\`), use a dedicated intent-filter.
    - Replace \`YOUR_APPSFLYER_DEV_KEY\` with your actual key.`,
    
      `🎯 Ready to integrate and test deep linking!`,
    ],
    
};