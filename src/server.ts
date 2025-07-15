#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, getRecentLogs, logBuffer, stopLogcatStream, extractParam, getLogs } from "./logcat/stream.js";
import { getParsedAppsflyerFilters } from "./logcat/parse.js";
import { z } from "zod";
import { descriptions } from "./constants/descriptions.js";
import { intents } from "./constants/intents.js";
import { keywords } from "./constants/keywords.js";
import { steps } from "./constants/steps.js";
import { extractAppsflyerDeeplinkInfo } from "./logcat/parse.js";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

server.tool(
  "integrateAppsFlyerSdk",
  {},
  {
    description: descriptions.integrateAppsFlyerSdk,
    intent: intents.integrateAppsFlyerSdk,
    keywords: keywords.integrateAppsFlyerSdk,
  },
  async () => {
    return {
      content: [
        {
          type: "text",
          text: steps.integrateAppsFlyerSdk.join("\n\n"),
        },
      ],
    };
  }
);

server.tool(
  "verifyAppsFlyerSdk",
  {}, 
  {
    description: descriptions.verifyAppsFlyerSdk,
    intent: intents.verifyAppsFlyerSdk,
    keywords: keywords.verifyAppsFlyerSdk,
  },
  async () => {
    const devKey = process.env.DEV_KEY;
    if (!devKey) {
      return {
        content: [
          {
            type: "text",
            text: `❌ DevKey environment variable (DEV_KEY) not set.`,
          },
        ],
      };
    }

    let logsText = "";
    try {
      logsText = await getLogs(500);
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `❌ Error fetching logs: ${err.message}` },
        ],
      };
    }

    const appId =
      extractParam(logsText, "app_id") || extractParam(logsText, "appId");
    const uid =
      extractParam(logsText, "uid") || extractParam(logsText, "device_id");

    if (!appId || !uid) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to extract app_id or uid from logs.\napp_id: ${appId}\nuid: ${uid}`,
          },
        ],
      };
    }

    const url = `https://gcdsdk.appsflyer.com/install_data/v4.0/${appId}?devkey=${devKey}&device_id=${uid}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      const json = await res.json();
      return {
        content: [
          {
            type: "text",
            text: `✅ SDK Test Succeeded:\n\n${JSON.stringify(json, null, 2)}`,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error fetching SDK data: ${err.message}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "fetchAppsflyerLogs",
  {
    deviceId: z.string().optional(),
  },
  {
    description: descriptions.fetchAppsflyerLogs,
    intent: intents.fetchAppsflyerLogs,
    keywords: keywords.fetchAppsflyerLogs,
  },
  async ({ deviceId }) => {
    try {
      await startLogcatStream("AppsFlyer_", deviceId);
      let waited = 0;
      while (logBuffer.length === 0 && waited < 2000) {
        await new Promise((res) => setTimeout(res, 200));
        waited += 200;
      }
      const logs = getRecentLogs();
      stopLogcatStream();
      return {
        content: [
          {
            type: "text",
            text: logs || "[No AppsFlyer logs found in the last few seconds.]",
          },
        ],
      };
    } catch (err: any) {
      stopLogcatStream();
      return {
        content: [
          {
            type: "text",
            text: `[Error fetching logs] ${err.message || err}`,
          },
        ],
      };
    }
  }
);

function createLogTool(
  toolName: keyof typeof descriptions,
  keyword: string
): void {
  server.tool(
    toolName,
    { lineCount: z.number().optional().default(50) },
    {
      description: descriptions[toolName],
      intent: intents[toolName],
      keywords: keywords[toolName],
    },
    async () => {
      const logs = getParsedAppsflyerFilters(keyword);

      if (keyword === "CONVERSION-") {
        if (!logs.length) {
          return {
            content: [
              {
                type: "text",
                text: "No conversion log entry found.",
              },
            ],
          };
        }

        const latestLog = logs[logs.length - 1];
        const desiredKeys = [
          "af_timestamp",
          "uid",
          "installDate",
          "firstLaunchDate",
          "advertiserId",
          "advertiserIdEnabled",
          "onelink_id",
        ];

        const filtered = Object.fromEntries(
          desiredKeys
            .filter((key) => key in latestLog.json)
            .map((key) => [key, latestLog.json[key]])
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filtered, null, 2),
            },
          ],
        };
      }

      // default behavior for other keywords
      return {
        content: [
          {
            type: "text",
            text: logs.length
              ? JSON.stringify(logs, null, 2)
              : `No log entries found for keyword: ${keyword}`,
          },
        ],
      };
    }
  );
}

createLogTool("getConversionLogs", "CONVERSION-");
createLogTool("getInAppLogs", "INAPP-");
createLogTool("getLaunchLogs", "LAUNCH-");
createLogTool("getDeepLinkLogs", "deepLink");

server.tool(
  "getAppsflyerErrors",
  {},
  {
    description: descriptions.getAppsflyerErrors,
    intent: intents.getAppsflyerErrors,
    keywords: keywords.getAppsflyerErrors,
  },
  async ({ }) => {
    const errorKeywords = keywords.getAppsflyerErrors;
    const errors = errorKeywords.flatMap((keyword) =>
      getParsedAppsflyerFilters(keyword)
    );
    return {
      content: [{ type: "text", text: JSON.stringify(errors, null, 2) }],
    };
  }
);

server.tool(
  "createAppsFlyerLogEvent",
  {
    eventName: z.string().optional(),
    eventParams: z.record(z.any()).optional(),
    wantsExamples: z.enum(["yes", "no"]).optional(),
    hasListener: z.enum(["yes", "no"]).optional(),
  },
  async (args) => {
    const eventName = args.eventName?.trim();
    const eventParams = args.eventParams || {};
    const wantsExamples = args.wantsExamples;
    const hasListener = args.hasListener?.toLowerCase() === "yes";

    const missingName = !eventName;
    const missingParams = Object.keys(eventParams).length === 0;
    const missingValueParams = Object.entries(eventParams)
      .filter(([_, v]) => v === undefined || v === null || v === "")
      .map(([k]) => k);

    if (missingName) {
      return {
        content: [
          { type: "text", text: "❗ Missing event name. You can use any name you'd like. Please provide an event name to continue." },
        ],
      };
    }

    if (missingParams) {
      return {
        content: [
          { type: "text", text: "❗ Missing event parameters. Please enter one or more key-value pairs for the event parameters." },
        ],
      };
    }

    if (missingValueParams.length > 0) {
      return {
        content: [
          { type: "text", text: `❗ The following parameters are missing values: ${missingValueParams.join(", ")}. Please complete them.` },
        ],
      };
    }

    if (!wantsExamples) {
      return {
        content: [
          {
            type: "text",
            text: "Would you like to see examples of event names and parameters? (yes/no)",
          },
        ],
      };
    }

    if (wantsExamples === "yes") {
      return {
        content: [
          {
            type: "text",
            text: [
              "**Example event names:**",
              "• af_login",
              "• af_complete_registration",
              "• registration_verified",
              "• submit_account_application",
              "• open_account_success",
              "• open_account_rejected",
              "• submit_credit_card_app",
              "• credit_card_application_success",
              "• credit_card_application_rejected",
              "• credit_card_activation",
              "",
              "**Example parameters:**",
              "• af_registration_method: \"email, Facebook\"",
              "• account_type: \"savings\"",
              "• application_method: \"app\"",
              "• PII_type: \"passport\"",
              "• credit_card_type: \"gold card\"",
              "• loan_id: \"1735102\"",
              "• loan_type: \"housing\"",
              "• loan_amount: \"1000\"",
              "• loan_period: \"3 months\"",
              "• submit_registration: \"email, Facebook\"",
              "",
              "You may also use your own custom names and parameters if you prefer.",
            ].join("\n"),
          },
        ],
      };
    }

    function generateJavaCode(
      eventName: string,
      eventParams: Record<string, any>,
      includeListener: boolean
    ): string[] {
      const code: string[] = [];
      code.push("Map<String, Object> eventValues = new HashMap<String, Object>();");
      for (const [key, value] of Object.entries(eventParams)) {
        const javaValue = typeof value === "number" ? value : `\"${value}\"`;
        code.push(`eventValues.put(\"${key}\", ${javaValue});`);
      }
      code.push(`AppsFlyerLib.getInstance().logEvent(getApplicationContext(), \"${eventName}\", eventValues);`);
      if (includeListener) {
        code.push("// Optional: Add AppsFlyerRequestListener if needed");
        code.push("// AppsFlyerLib.getInstance().logEvent(..., new AppsFlyerRequestListener() { ... });");
      }
      return code;
    }

    const codeLines = generateJavaCode(eventName, eventParams, hasListener);

    return {
      content: [
        {
          type: "text",
          text: ["```java", ...codeLines, "```"].join("\n"),
        },
      ],
    };
  }
);

server.tool(
  "verifyInAppEvent",
  {},
  {
    description: descriptions.verifyInAppEvent,
    intent: intents.verifyInAppEvent,
    keywords: keywords.verifyInAppEvent,
  },
  async ({ }) => {
    const logs = logBuffer;

    const hasEventName = logs.includes('"event": "af_level_achieved"');
    const hasEventValue = logs.includes('"eventvalue":"{"af_content":');
    const hasEndpoint = logs.includes(
      "androidevent?app_id=com.appsflyer.onelink.appsflyeronelinkbasicapp"
    );

    const allPresent = hasEventName && hasEventValue && hasEndpoint;

    return {
      content: [
        {
          type: "text",
          text: allPresent
            ? "✅ Event `af_level_achieved` was successfully logged. All required log entries were found."
            : `❌ The event may not have been logged correctly. Results:
- Has Event Name: ${hasEventName}
- Has Event Value: ${hasEventValue}
- Has Endpoint: ${hasEndpoint}`,
        },
        { type: "text", text: `✅ Event created successfully!` },
      ],
    };
  }
);

server.tool(
  "AppsFlyerOneLinkDeepLinkSetupPrompt",
  { wantsInstructions: z.enum(["yes", "no"]).optional() },
  {
    description: "Ask user if they want to see instructions to setup deep linking with AppsFlyer OneLink",
    intent: "ask if user wants deep link setup instructions",
    keywords: [
      "deep linking",
      "deep link",
      "deeplink",
      "deep-link",
      "app deep link",
      "android deep link",
      "deep link verification",
      "appsflyer onelink",
      "app links",
    ],
  },
  async (args) => {
    if (!args.wantsInstructions) {
      return {
        content: [
          {
            type: "text",
            text: "Do you want instructions to setup deep linking with AppsFlyer OneLink? (yes/no)",
          },
        ],
      };
    }

    if (args.wantsInstructions === "no") {
      return {
        content: [
          {
            type: "text",
            text: "OK, no problem. Let me know if you need anything else!",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `✅ Guide to integrate Deep Linking with AppsFlyer OneLink (example URL: https://onelink-basic-app.onelink.me/H5hv/apples)

1. **Update AndroidManifest.xml**

Add this intent-filter to your MainActivity:

\`\`\`xml
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
\`\`\`

2. **Initialize AppsFlyer SDK**

Initialize the SDK early in your app (e.g., in Application.onCreate or MainActivity.onCreate):

\`\`\`java
AppsFlyerLib.getInstance().setOneLinkCustomDomain("he.wikipedia.org"); // Replace with your domain
AppsFlyerLib.getInstance().start(getApplicationContext(), "YOUR_APPSFLYER_DEV_KEY");
\`\`\`

3. **Handle Deep Link Intent in MainActivity**

Process the Intent containing the deep link URI:

\`\`\`java
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
\`\`\`

4. **Testing**

- Use adb to test the deep link:

\`\`\`bash
adb shell am start -a android.intent.action.VIEW -d "https://onelink-basic-app.onelink.me/H5hv/apples" your.package.name
\`\`\`

- Or test via AppsFlyer OneLink test links from the dashboard.

5. **(Optional) Upload assetlinks.json**

Upload the file here to enable App Links verification:

\`\`\`
https://onelink-basic-app.onelink.me/.well-known/assetlinks.json
\`\`\`

6. **Imports for Deep Linking**

\`\`\`java
import com.appsflyer.deeplink.DeepLink;
import com.appsflyer.deeplink.DeepLinkListener;
import com.appsflyer.deeplink.DeepLinkResult;
\`\`\`

7. **Subscribe to DeepLinkListener**

\`\`\`java
AppsFlyerLib.getInstance().subscribeForDeepLink(new DeepLinkListener() {
    @Override
    public void onDeepLinking(@NonNull DeepLinkResult deepLinkResult) {
        // TODO - handle the deep link result here
    }
});
\`\`\`

8. **Handle Deep Link Listener Logic**

\`\`\`java
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
\`\`\`

9. **Summary Notes**

- Use \`singleTask\` or \`singleTop\` for launchMode.
- Make sure scheme/host in manifest and OneLink match.
- For App Links, verify assetlinks.json is hosted.
- For URI schemes (e.g. \`myapp://\`), use a dedicated intent-filter.
- Replace \`YOUR_APPSFLYER_DEV_KEY\` with your actual key.

🎯 Ready to integrate and test deep linking!

`,
        },
      ],
    };
  }
);

server.tool(
  "DetectAppsFlyerDeepLink",
  {},
  {
    description: "Detect and analyze deep links triggered from AppsFlyer logs, including type, values, and errors",
    intent: "detect appsflyer deep link",
    keywords: ["deeplink", "deep link", "appsFlyer", "detect", "direct", "deferred", "errors", "af_dp"],
  },
  async () => {
    const logsText = getRecentLogs();
    if (!logsText || logsText.trim() === "") {
      return {
        content: [{ type: "text", text: "⚠️ No logs found in buffer. Try fetching logs again." }],
      };
    }

    // Check if AppsFlyer SDK is connected
    const sdkConnected = /AppsFlyerLib|AppsFlyer SDK/i.test(logsText);
    if (!sdkConnected) {
      return {
        content: [
          {
            type: "text",
            text: "⚠️ AppsFlyer SDK not detected in logs.\nPlease run the 'integrateAppsFlyerSdk' tool to set up the SDK connection.",
          },
        ],
      };
    }

    const logs = logsText.split("\n");
    const logText = logs.join("\n");

    // Detect Deferred Deep Link
    const isDeferred =
      /is_deferred\s*[:=]\s*true/i.test(logText) ||
      /deferred deep link/i.test(logText);

    // Detect Direct Deep Link
    const hasOnDeepLinkingSuccess = /onDeepLinking.*SUCCESS/i.test(logText);
    const hasAfDp = /af_dp[=:"]/i.test(logText);
    const hasAfDeeplinkTrue = /af_deeplink\s*[:=]\s*true/i.test(logText);
    const isDirect = (hasOnDeepLinkingSuccess || hasAfDp || hasAfDeeplinkTrue) && !isDeferred;

    // Find all deep link entries in logs
    const deeplinkLines = logs.filter((line) =>
      /deep_link_value|af_dp|onDeepLinking/i.test(line)
    );

    // Find deep link errors
    const deeplinkErrors = logs.filter((line) =>
      /onDeepLinking.*FAILURE|error parsing|invalid|deep_link.*null/i.test(line)
    );

    // Build output
    const results = [
      isDeferred ? "📥 Deferred deep link detected." : "",
      isDirect ? "⚡ Direct deep link detected." : "",
      deeplinkLines.length > 0
        ? `🔗 Found ${deeplinkLines.length} deep link entries:\n${deeplinkLines.join("\n")}`
        : "❌ No deep links found in logs.",
      deeplinkErrors.length > 0
        ? `❗ Found ${deeplinkErrors.length} possible error(s):\n${deeplinkErrors.join("\n")}`
        : "✅ No deep link errors detected.",
    ].filter(Boolean);

    return {
      content: [
        {
          type: "text",
          text: results.join("\n\n"),
        },
      ],
    };
  }
);


server.tool(
  "VerifyAppsFlyerDeepLinkHandled",
  {},
  {
    description: "Verify that the deep link triggered a flow in the app",
    intent: "verify appsflyer deep link handling",
    keywords: ["deeplink", "verify", "appsFlyer", "flow", "handled"],
  },
  async () => {
    if (logBuffer.length === 0) {
      return {
        content: [{ type: "text", text: "⚠️ No logs available for analysis." }],
      };
    }

    const logText = logBuffer.join("\n");

    const hasActivity = /Starting activity/.test(logText);
    const hasRouting = /navigate|redirect|route to/.test(logText.toLowerCase());
    const hasSpecificDeeplinkValue = /apples|deep_link_value/.test(logText);

    const allFound = hasActivity && hasRouting && hasSpecificDeeplinkValue;

    return {
      content: [
        {
          type: "text",
          text: allFound
            ? "✅ Deep link seems to have triggered in-app flow (activity start + routing + value found)."
            : `❌ Deep link may not have triggered the app flow.\n- Found activity: ${hasActivity}\n- Found routing: ${hasRouting}\n- Found value: ${hasSpecificDeeplinkValue}`,
        },
      ],
    };
  }
);


const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");

