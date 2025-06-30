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
  "oneLinkSetupInstructions",
  {},
  {
    description: "Step-by-step guide to create and test a OneLink for deep linking and user acquisition",
    intent: "Provide instructions for setting up and testing OneLink",
    keywords: [
      "onelink",
      "one link",
      "create onelink",
      "how to create onelink",
      "deep link setup",
      "appsFlyer link",
      "deeplink guide",
      "onelink steps",
      "configure onelink",
      "שלבים ל-onelink",
      "איך לעשות onelink",
      "איך לבדוק דיפ לינק",
    ],
  },
  async () => {
    const steps = [
      "🧱 **Step 1: Create a OneLink template in AppsFlyer**",
      "- Go to your app in the [AppsFlyer dashboard](https://dashboard.appsflyer.com)",
      "- Click on 'OneLink Templates' and create a new template",
      "- Choose your app(s) and name the template",
      "",

      "🔗 **Step 2: Create a OneLink URL with parameters**",
      "- After creating the template, click 'Create OneLink URL'",
      "- Choose the desired redirection options (e.g., to Google Play or App Store)",
      "- Add parameters like:",
      "  - `deep_link_value=products`",
      "  - `af_sub1=campaign1`",
      "- Final URL might look like:",
      "  https://yourbrand.onelink.me/abc123?deep_link_value=products&af_sub1=campaign1",
      "",

      "📱 **Step 3: Handle the deep link in your app**",
      "- Integrate the AppsFlyer SDK in your app",
      "- Add `subscribeForDeepLink()` in your `onCreate()` method to receive the deep link",
      "- Parse `deepLinkValue` to route the user",
      "",

      "📦 **Step 4: Add intent-filter in AndroidManifest.xml**",
      "- In your `MainActivity`, add an intent-filter with:",
      "  - `android.intent.action.VIEW`",
      "  - `https` scheme and your OneLink domain",
      "- Example:",
      "```xml",
      "<intent-filter>",
      "  <action android:name=\"android.intent.action.VIEW\" />",
      "  <category android:name=\"android.intent.category.DEFAULT\" />",
      "  <category android:name=\"android.intent.category.BROWSABLE\" />",
      "  <data android:scheme=\"https\" android:host=\"yourbrand.onelink.me\" />",
      "</intent-filter>",
      "```",
      "",

      "🧪 **Step 5: Test deferred deep linking**",
      "- Uninstall the app from your device",
      "- Open the OneLink URL (from WhatsApp, browser, etc)",
      "- Install the app from the Play Store/App Store",
      "- Open the app and verify that the SDK receives the deep link",
      "",

      "✅ **Optional: Use MCP tools like getDeepLinkData to verify**",
      "- You can use the UID and Dev Key to fetch deep link info",
      "- Helps confirm that AppsFlyer received and recognized the click",
    ];

    return {
      content: [
        {
          type: "text",
          text: steps.join("\n"),
        },
      ],
    };
  }
);


server.tool(
  "getDeepLinkData",
  {
    appId: z.string().describe("AppsFlyer App ID"),
    devKey: z.string().describe("AppsFlyer Dev Key"),
    uid: z.string().describe("Device ID (UID) to check"),
  },
  {
    description: "Fetches AppsFlyer deep link data for a specific device ID",
    intent: "Fetch deep link data from AppsFlyer",
    keywords: [
      "deep link",
      "deeplink",
      "get deep link",
      "appsFlyer link",
      "onelink",
      "fetch link",
      "device link",
      "device deep link",
      "deep link data",
      "deferred deep link",
    ],
  },
  async ({ appId, devKey, uid }) => {
    const url = `https://gcdsdk.appsflyer.com/deep_link/v1/${appId}`;
    const body = {
      af_devkey: devKey,
      af_user_id: uid,
    };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as any;
      const isEmpty = !json.deep_link || Object.keys(json.deep_link).length === 0;

      if (isEmpty) {
        return {
          content: [
            {
              type: "text",
              text: `⚠️ There are currently no deep link entries for this device (UID: ${uid}).\n\n` +
                `✅ To test a deferred deep link:\n` +
                `1. Send a OneLink with parameters like ?deep_link_value=test\n` +
                `2. Uninstall the app from your device\n` +
                `3. Click the OneLink and install the app from Play Store\n` +
                `4. Open the app and make sure the SDK is initialized properly\n` +
                `5. Try this tool again after app open\n\nNeed help? Ask me!`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: "📦 Deep link response:\n\n" + JSON.stringify(json, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error fetching deep link data: ${(err as Error).message}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");