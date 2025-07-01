import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, getRecentLogs, logBuffer, stopLogcatStream,} from "./logcat/stream.js";
import { getParsedAppsflyerFilters } from "./logcat/parse.js";
import { z } from "zod";
import { descriptions } from "./constants/descriptions.js";
import { intents } from "./constants/intents.js";
import { keywords } from "./constants/keywords.js";
import { steps } from "./constants/steps.js";
import { getAdbPath, validateAdb, getConnectedDevices } from "./adb.js";

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
  "testAppsFlyerSdk",
  {
    appId: z.string(),
    devKey: z.string(),
    uid: z.string(),
  },
  {
    description: descriptions.testAppsFlyerSdk,
    intent: intents.testAppsFlyerSdk,
    keywords: keywords.testAppsFlyerSdk,
  },
  async ({ appId, devKey, uid }) => {
    const url = `https://gcdsdk.appsflyer.com/install_data/v4.0/${appId}?devkey=${devKey}&device_id=${uid}`;
    const options = { method: "GET", headers: { accept: "application/json" } };
    try {
      const res = await fetch(url, options);
      const json = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(json, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }],
      };
    }
  }
);

server.tool(
  "fetchAppsflyerLogs",
  {
    lineCount: z.number().default(100),
    deviceId: z.string().optional(),
  },
  {
    description: descriptions.fetchAppsflyerLogs,
    intent: intents.fetchAppsflyerLogs,
    keywords: keywords.fetchAppsflyerLogs,
  },
  async ({ lineCount, deviceId }) => {
    try {
      const adbPath = getAdbPath();
      validateAdb(adbPath);
      const devices = getConnectedDevices(adbPath);

      if (devices.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No Android devices are currently connected via ADB.",
            },
          ],
        };
      }

      if (!deviceId) {
        if (devices.length > 1) {
          return {
            content: [
              {
                type: "text",
                text:
                  "Multiple devices are connected. Please select one of the following device IDs:\n" +
                  devices.map((id: string) => `- ${id}`).join("\n"),
              },
            ],
          };
        }
        deviceId = devices[0]; // Only one device connected
      }

      await startLogcatStream("AppsFlyer_6.14.0", deviceId);

      let waited = 0;
      while (logBuffer.length === 0 && waited < 2000) {
        await new Promise((res) => setTimeout(res, 200));
        waited += 200;
      }

      const logs = getRecentLogs(lineCount);
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
      stopLogcatStream(); // Ensure stream is stopped on failure
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
  toolName: keyof typeof descriptions, // או keyof typeof keywords
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
    async ({ lineCount }: { lineCount: number }) => {
      const logs = getParsedAppsflyerFilters(lineCount, keyword);
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
  { lineCount: z.number().optional().default(50) },
  {
    description: descriptions.getAppsflyerErrors,
    intent: intents.getAppsflyerErrors,
    keywords: keywords.getAppsflyerErrors,
  },
  async ({ lineCount }) => {
    const errorKeywords = keywords.getAppsflyerErrors;
    const errors = errorKeywords.flatMap((keyword) =>
      getParsedAppsflyerFilters(lineCount, keyword)
    );
    return {
      content: [{ type: "text", text: JSON.stringify(errors, null, 2) }],
    };
  }
);


server.tool(
  "createAppsFlyerLogEvent",
  {
    hasListener: z.enum(["yes", "no"], {
      required_error: "Please indicate if you are using a listener or not",
    }),
  },
  {
    description: descriptions.createAppsFlyerLogEvent,
    intent: intents.createAppsFlyerLogEvent,
    keywords: keywords.createAppsFlyerLogEvent,
  },
  async ({ hasListener }) => {
    const includeListener = hasListener === "yes";
    const instructions = steps.createAppsFlyerLogEvent(includeListener);

    return {
      content: [
        {
          type: "text",
          text: instructions.join("\n\n"),
        },
      ],
    };
  }
);

server.tool(
  "testInAppEvent",
  {
    lineCount: z.number().optional().default(100),
  },
  {
    description:
      "Scans recent logs to verify if the in-app event `af_level_achieved` was successfully logged.",
    intent: [
      "When the user wants to check if a specific in-app event was triggered in the logs, call this tool.",
      "If user asks whether af_level_achieved was logged, use this tool to verify."
    ],
    keywords: [
      "test appsflyer event",
      "check in-app event log",
      "af_level_achieved event",
      "apps flyer log validation",
      "apps flyer log success",
      "event log tester"
    ],
  },
  async ({ lineCount }) => {
    const logs = logBuffer;

    const hasEventName = logs.includes('"event": "af_level_achieved"');
    const hasEventValue = logs.includes('"eventvalue":"{\"af_content\":');
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
      ],
    };
  }
);
server.tool(
  "createAppFlyerDeepLink",
  {
    request: z.string().describe("Natural language request describing the deep link to create"),
    appId: z.string().describe("AppsFlyer App ID"),
    devKey: z.string().describe("AppsFlyer Dev Key"),
    uid: z.string().describe("Device ID (UID) to check"),
  },
  {
    description: "Generates step-by-step instructions to create and test an AppsFlyer OneLink deep link based on a natural language input.",
    intent: "Provide detailed setup and testing instructions for AppsFlyer OneLink deep linking based on user input.",
    keywords: [
      "onelink",
      "deep link setup",
      "appsFlyer",
      "deep link creation",
      "instructions",
      "deeplink listener",
      "android app links",
    ],
  },
  async ({ request, appId, devKey, uid }) => {
    const steps = [
      `### 📋 Your Request:\n"${request}"\n`,
      `### 🧱 Step 1: Create a OneLink Template in AppsFlyer\n` +
      `- Log in to the [AppsFlyer Dashboard](https://dashboard.appsflyer.com)\n` +
      `- Navigate to "OneLink Templates" and click "Create New Template"\n` +
      `- Select your app(s) and give the template a meaningful name\n`,
      
      `### 🔗 Step 2: Create a OneLink URL with Custom Parameters\n` +
      `- Inside your OneLink Template, click "Create OneLink URL"\n` +
      `- Set redirect targets (Google Play Store and/or Apple App Store)\n` +
      `- Add deep link parameters based on your request (e.g., productId=123, campaign=summer)\n` +
      `- Save and copy the generated OneLink URL\n`,

      `### 📱 Step 3: Integrate Deep Link Handling in Your Android App\n` +
      `- Add the AppsFlyer SDK dependency in your Gradle build file:\n` +
      "```gradle\nimplementation 'com.appsflyer:af-android-sdk:6.+'\n```\n" +
      `- Import necessary classes in your main Activity:\n` +
      "```java\n" +
      "import com.appsflyer.deeplink.DeepLink;\n" +
      "import com.appsflyer.deeplink.DeepLinkListener;\n" +
      "import com.appsflyer.deeplink.DeepLinkResult;\n" +
      "```\n" +
      `- Initialize AppsFlyer and set your branded OneLink domain:\n` +
      "```java\n" +
      "AppsFlyerLib.getInstance().setOneLinkCustomDomain(\"yourbrand.onelink.me\");\n" +
      "```\n" +
      `- Subscribe for deep link events in your Activity:\n` +
      "```java\n" +
      "appsflyer.subscribeForDeepLink(new DeepLinkListener() {\n" +
      "    @Override\n" +
      "    public void onDeepLinking(@NonNull DeepLinkResult deepLinkResult) {\n" +
      "        DeepLinkResult.Status status = deepLinkResult.getStatus();\n" +
      "        if (status == DeepLinkResult.Status.NOT_FOUND) {\n" +
      "            Log.d(LOG_TAG, \"Deep link not found\");\n" +
      "            return;\n" +
      "        } else if (status == DeepLinkResult.Status.ERROR) {\n" +
      "            Log.d(LOG_TAG, \"Error getting Deep Link: \" + deepLinkResult.getError().toString());\n" +
      "            return;\n" +
      "        }\n" +
      "        DeepLink deepLink = deepLinkResult.getDeepLink();\n" +
      "        if (deepLink != null) {\n" +
      "            Log.d(LOG_TAG, \"DeepLink data: \" + deepLink.toString());\n" +
      "            String value = deepLink.getDeepLinkValue();\n" +
      "            if (deepLink.isDeferred()) {\n" +
      "                // Handle deferred deep link\n" +
      "            } else {\n" +
      "                // Handle direct deep link\n" +
      "            }\n" +
      "        }\n" +
      "    }\n" +
      "});\n" +
      "```\n" +
      `**Apply:** Copy this code into your main Activity and replace \`yourbrand.onelink.me\` with your actual OneLink domain.\n`,

      `### 📦 Step 4: Update AndroidManifest.xml for Deep Linking\n` +
      `- Add the following intent filter inside your MainActivity:\n` +
      "```xml\n" +
      "<intent-filter android:autoVerify=\"true\">\n" +
      "  <action android:name=\"android.intent.action.VIEW\" />\n" +
      "  <category android:name=\"android.intent.category.DEFAULT\" />\n" +
      "  <category android:name=\"android.intent.category.BROWSABLE\" />\n" +
      "  <data android:scheme=\"https\" android:host=\"yourbrand.onelink.me\" />\n" +
      "</intent-filter>\n" +
      "```\n" +
      `- Optionally, add custom URI scheme if your app uses it:\n` +
      "```xml\n" +
      "<intent-filter>\n" +
      "  <action android:name=\"android.intent.action.VIEW\" />\n" +
      "  <category android:name=\"android.intent.category.DEFAULT\" />\n" +
      "  <category android:name=\"android.intent.category.BROWSABLE\" />\n" +
      "  <data android:scheme=\"yourappscheme\" android:host=\"yourhost\" />\n" +
      "</intent-filter>\n" +
      "```\n" +
      `**Apply:** Update your \`AndroidManifest.xml\` accordingly.\n`,

      `### 🔐 Step 5: Generate SHA256 Fingerprint for App Links\n` +
      `1. Locate your app's keystore file (debug or release)\n` +
      `2. Run this command to get the SHA256 fingerprint:\n` +
      "```bash\n" +
      "keytool -list -v -keystore ~/.android/debug.keystore\n" +
      "```\n" +
      `3. Copy the SHA256 fingerprint line\n` +
      `4. Provide this fingerprint to your marketing or AppsFlyer team to add to your OneLink template\n` +
      `**This step is required for Android App Links verification.**\n`,

      `### 📤 Final Step: Test Your Deep Link\n` +
      `- Open the OneLink URL on your device with the app installed\n` +
      `- Verify the deep link data is received and handled correctly\n` +
      `- For deferred deep linking, uninstall the app, open the OneLink URL, install the app, and verify the deep link data is delivered\n` +
      `\n` +
      `**Apply:** Test thoroughly on multiple devices and OS versions.\n`,
    ];

    return {
      content: [
        {
          type: "text",
          text: steps.join("\n\n---\n\n"),
        },
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");