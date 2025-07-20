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
  createDeepLink: (includeUriScheme: boolean, mode: boolean) => {
    if (mode) {
      return [
`🚨 Do not skip. Follow **every** step exactly as shown. Copy-paste as is. Missing even one line will break the deep link.`,
        `1. Make sure the AppsFlyer SDK is integrated in your app.`,
        `2. Add the following code to your AndroidManifest.xml file:
  \`\`\`xml
  <intent-filter android:autoVerify="true">
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data
          android:host="PUT-HERE-ONE-LINK-DOMAIN"
          android:scheme="https" />
  </intent-filter>
  \`\`\``,
        ...(includeUriScheme
          ? [
              `3. (Optional) If you want to support a custom uriScheme, add the following code to your AndroidManifest.xml file as well:
  \`\`\`xml
  <intent-filter>
      <action android:name="android.intent.action.VIEW" />
      <category android:name="android.intent.category.DEFAULT" />
      <category android:name="android.intent.category.BROWSABLE" />
      <data
          android:host="SECOND-PART"
          android:scheme="FIRST-PART-OF-SCHEME" />
  </intent-filter>
  \`\`\``,
            ]
          : []),
        `4. Generating a SHA256
  Locate your app's keystore.
  If the app is still in development, locate the debug.keystore.
  - For Windows users: C:\\Users\\USERNAME\\.android\\debug.keystore
  - For Linux or Mac OS users: ~/.android/debug.keystore
  Open the command line and navigate to the folder where the keystore file is located.
  Run the following command (replace KEY_STORE_FILE with your keystore path):
  \`\`\`bash
  keytool -list -v -keystore ~/.android/debug.keystore
  \`\`\`
  Note: The password for the debug.keystore is usually "android".
  The output should look like this: (example output)
  \`\`\`
  Alias name: test
  Creation date: Sep 27, 2017
  Entry type: PrivateKeyEntry
  Certificate chain length: 1
  Certificate[1]:
  Owner: CN=myname
  Issuer: CN=myname
  Serial number: 365ead6d
  Valid from: Wed Sep 27 17:53:32 IDT 2017 until: Sun Sep 21 17:53:32 IDT 2042
  Certificate fingerprints:
  MD5: DB:71:C3:FC:1A:42:ED:06:AC:45:2B:6D:23:F9:F1:24
  SHA1: AE:4F:5F:24:AC:F9:49:07:8D:56:54:F0:33:56:48:F7:FE:3C:E1:60
  SHA256: A9:EA:2F:A7:F1:12:AC:02:31:C3:7A:90:7C:CA:4B:CF:C3:21:6E:A7:F0:0D:60:64:4F:4B:5B:2A:D3:E1:86:C9
  Signature algorithm name: SHA256withRSA
  Version: 3
  Extensions:
  #1: ObjectId: 2.5.29.14 Criticality=false
  SubjectKeyIdentifier [
    KeyIdentifier [
      0000: 34 58 91 8C 02 7F 1A 0F  0D 3B 9F 65 66 D8 E8 65 
      0010: 74 42 2D 44                    
    ]
  ]
  \`\`\`
  Give the SHA256 signature to your marketer.
  Note: Only when the marketer adds the signature to the template can the direct deep linking test be completed.`,
        `5. Import code libraries and subscribe to DeepLinkListener
  
  Import the following libraries:
  
  \`\`\`java
  import com.appsflyer.deeplink.DeepLink;
  import com.appsflyer.deeplink.DeepLinkListener;
  import com.appsflyer.deeplink.DeepLinkResult;
  \`\`\`
  
  Create and subscribe the DeepLinkListener (example, put this in your Application class or similar):
  
  \`\`\`java
  public class ExampleApp extends Application {
      @Override
      public void onCreate() {
          super.onCreate();
  
          AppsFlyerLib.subscribeForDeepLink(new DeepLinkListener() {
              @Override
              public void onDeepLinking(@NonNull DeepLinkResult deepLinkResult) {
                  DeepLinkResult.Status dlStatus = deepLinkResult.getStatus();
                  if (dlStatus == DeepLinkResult.Status.NOT_FOUND) {
                      Log.d(LOG_TAG, "Deep link not found");
                      return;
                  } else if (dlStatus == DeepLinkResult.Status.ERROR){
                      DeepLinkResult.Error dlError = deepLinkResult.getError();
                      Log.d(LOG_TAG, "There was an error getting Deep Link data: " + dlError.toString());
                      return;
                  } else {
                      Log.d(LOG_TAG, "Deep link found");
                  }
                  DeepLink deepLinkObj = deepLinkResult.getDeepLink();
                  try {
                      Log.d(LOG_TAG, "The DeepLink data is: " + deepLinkObj.toString());
                      String deepLinkDestination = deepLinkObj.getDeepLinkValue();
                      // Your code for handling the deeplink data here
                  } catch (Exception e) {
                      Log.d(LOG_TAG, "DeepLink data came back null");
                      return;
                  }
              }
          });
      }
  }
  \`\`\`,
  
  ✅ **Done!**  
  Now you creat the deep link, you can verify that it's working properly.
  
  🚀 **Next step:**  
  Launch your app on a real or virtual device to let the AppsFlyer SDK initialize and send logs.
  
  🔍 **Then:**  
  Run the **verifyDeepLink** tool to confirm the deeplink was successful.`, 
      ];
    } else {
      return [
`🚨 Do not skip. Follow **every** step exactly as shown. Copy-paste as is. Missing even one line will break the deep link.`,
        `1. Make sure the AppsFlyer SDK is integrated in your app.`,
        `2. Install the application on your device before proceeding.`,
        `3. (Optional) Handle Deferred Deep Linking by subscribing to the conversion listener when initializing the AppsFlyer SDK.`,
  
        `Add the following code:`,
  
        `\`\`\`java
  AppsFlyerConversionListener conversionListener = new AppsFlyerConversionListener() {
      @Override
      public void onConversionDataSuccess(Map<String, Object> conversionData) {
          for (String attrName : conversionData.keySet()) {
              Log.d(LOG_TAG, "Conversion attribute: " + attrName + " = " + conversionData.get(attrName));
          }
  
          // Check if it's a deferred deep link
          String deepLinkValue = (String) conversionData.get("af_dp");
          if (deepLinkValue != null) {
              Log.d(LOG_TAG, "Deferred Deep Link detected: " + deepLinkValue);
              // Handle your deep link here (navigate the user accordingly)
          }
      }
  
      @Override
      public void onConversionDataFail(String errorMessage) {
          Log.d(LOG_TAG, "Error getting conversion data: " + errorMessage);
      }
  
      @Override
      public void onAppOpenAttribution(Map<String, String> attributionData) {}
  
      @Override
      public void onAttributionFailure(String errorMessage) {}
  };
  \`\`\`,
  
    ✅ **Done!**  
    Now that you creat depp link, you need to integrate the appsflyer sdk and the to verify your deep link.
    
    🔍 **Then:**  
    Run the **integrateAppsFlyerSdk** tool to integrate the sdk and then ren the tool **verifyAppsFlyerSdk** tool to see if the integrate work successful and data is being sent correctly.`,
      ];
    }
  }
}  