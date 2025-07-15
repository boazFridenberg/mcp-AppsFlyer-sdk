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
  
    `**1. Check if the AppsFlyer SDK is installed**  
  If the SDK is not integrated, ask the user to run the tool:
  👉 \`integrateAppsFlyerSdk\``,
  
    `**2. Import predefined event names**  
  \`\`\`java
  import com.appsflyer.AFInAppEventType;
  \`\`\``,
  
    `**3. Import predefined event parameter names and Map.**  
  \`\`\`java
  import com.appsflyer.AFInAppEventParameterName;
  import java.util.Map;
  \`\`\``,
  
    ...(includeListener
      ? [
          `**4. Import the response listener**  
  \`\`\`java
  import com.appsflyer.attribution.AppsFlyerRequestListener;
  \`\`\``,
  
          `**5. Create a Map and add parameters**  
  \`\`\`java
  Map<String, Object> eventValues = new HashMap<>();
  \`\`\``,
  
          `**6. Add an event parameter**  
  \`\`\`java
  eventValues.put(AFInAppEventParameterName.CONTENT, "<<PLACE_HOLDRER_FOR_PARAM_VALUE>>");
  \`\`\``,
  
          `**7. Send the event with a listener**  
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
  
        `🚀 Now run your app to trigger the event.  
  🔍 Then run the tool: \`verifyInAppEvent\` to confirm it was received by AppsFlyer.`,
        ]
      : [
          `**4. Create a Map and add parameters**  
  \`\`\`java
  Map<String, Object> eventValues = new HashMap<>();
  \`\`\``,
  
          `**5. Add an event parameter**  
  \`\`\`java
  eventValues.put(AFInAppEventParameterName.CONTENT, "<<PLACE_HOLDRER_FOR_PARAM_VALUE>>");
  \`\`\``,
  
          `**6. Send the event without a listener**  
  \`\`\`java
  AppsFlyerLib.getInstance().logEvent(getApplicationContext(), <<Event name>>, eventValues);
  \`\`\``,
  
        `🚀 Now run your app to trigger the event.  
  🔍 Then run the tool: \`verifyInAppEvent\` to confirm it was received by AppsFlyer.`,
        ]),
  ],
}  
