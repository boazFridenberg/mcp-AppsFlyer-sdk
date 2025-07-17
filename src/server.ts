#!/usr/bin/env node
import { McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, logBuffer } from "./logcat/stream.js";
import { extractJsonFromLine } from "./logcat/parse.js";
import { getParsedAppsflyerFilters } from "./logcat/parse.js";
import { z } from "zod";
import { descriptions } from "./constants/descriptions.js";
import { intents } from "./constants/intents.js";
import { keywords } from "./constants/keywords.js";
import { steps } from "./constants/steps.js";
import { replaceOneLinkPlaceholders } from "./logcat/parse.js";


const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

server.registerTool(
  "integrateAppsFlyerSdk",
  {
    title: "Integrate AppsFlyer SDK",
    description: descriptions.integrateAppsFlyerSdk,
    annotations: {
      intent: intents.integrateAppsFlyerSdk,
      keywords: keywords.integrateAppsFlyerSdk,
    },
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

    let latestVersion = null;
    try {
      const res = await fetch(
        `https://search.maven.org/solrsearch/select?q=g:com.appsflyer+AND+a:af-android-sdk&core=gav&rows=1&wt=json`
      );
      const json = (await res.json()) as any;
      latestVersion = json.response?.docs?.[0]?.v;
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to fetch latest SDK version: ${err.message}`,
          },
        ],
      };
    }

    if (!latestVersion) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Could not extract latest SDK version from response.`,
          },
        ],
      };
    }

    const stepsWithReplacements = steps.integrateAppsFlyerSdk.map((step) => {
      let updated = step.replace("<YOUR-DEV-KEY>", devKey);
      if (updated.includes(`implementation 'com.appsflyer:af-android-sdk'`)) {
        updated = updated.replace(
          `implementation 'com.appsflyer:af-android-sdk'`,
          `implementation 'com.appsflyer:af-android-sdk:${latestVersion}'`
        );
      }
      return updated;
    });

    return {
      content: [
        {
          type: "text",
          text: stepsWithReplacements.join("\n\n"),
        },
      ],
    };
  }
);

server.registerTool(
  "verifyAppsFlyerSdk",
  {
    title: "Verify AppsFlyer SDK",
    description: descriptions.verifyAppsFlyerSdk,
    inputSchema: {
      deviceId: z.string().optional(),
    },
    annotations: {
      intent: intents.verifyAppsFlyerSdk,
      keywords: keywords.verifyAppsFlyerSdk,
    },
  },
  async ({ deviceId }) => {
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

    try {
      await startLogcatStream("AppsFlyer_", deviceId);
      let waited = 0;
      while (logBuffer.length === 0 && waited < 2000) {
        await new Promise((res) => setTimeout(res, 200));
        waited += 200;
      }
    } catch (err: any) {
      return {
        content: [
          { type: "text", text: `❌ Error fetching logs: ${err.message}` },
        ],
      };
    }

    const conversionLogs = getParsedAppsflyerFilters("CONVERSION-");
    const launchLogs = getParsedAppsflyerFilters("LAUNCH-");

    const relevantLog = conversionLogs[conversionLogs.length - 1] || launchLogs[launchLogs.length - 1];

    if (!relevantLog) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Failed to find any CONVERSION- or LAUNCH- log with uid.`,
          },
        ],
      };
    }

    const uid = relevantLog.json["uid"] || relevantLog.json["device_id"];
    const timestamp = relevantLog.timestamp;

    if (!uid) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Log found but missing uid or device_id.`,
          },
        ],
      };
    }

    let appId: string | undefined;
    for (const line of logBuffer.slice().reverse()) {
      const json = extractJsonFromLine(line);
      if (json?.app_id || json?.appId) {
        appId = json.app_id || json.appId;
        break;
      }

      const match = line.match(/app_id=([a-zA-Z0-9._]+)/);
      if (match) {
        appId = match[1];
        break;
      }
    }

    if (!appId) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Could not find app_id in logs.`,
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
      const json = (await res.json()) as any;

      const afStatus = json.af_status || "Unknown";
      const installTime = json.install_time || "N/A";

      return {
        content: [
          {
            type: "text",
            text:
              `✅ The AppsFlyer SDK verification succeeded.\n` +
              `SDK is active and responding.\n\n` +
              `🔹 App ID: ${appId}\n` +
              `🔹 UID: ${uid}\n` +
              `🔹 Timestamp: ${timestamp}\n` +
              `🔹 Status: ${afStatus} install (af_status: "${afStatus}")\n` +
              `🔹 Install time: ${installTime}\n\n` +
              `If you need more details or want to check specific events or logs, let me know!`,
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

server.registerTool(
  "fetchAppsflyerLogs",
  {
    title: "Fetch AppsFlyer Logs",
    description: descriptions.fetchAppsflyerLogs,
    inputSchema: {
      deviceId: z.string().optional(),
    },
    annotations: {
      intent: intents.fetchAppsflyerLogs,
      keywords: keywords.fetchAppsflyerLogs,
    },
  },
  async ({ deviceId }) => {
    try {
      await startLogcatStream("AppsFlyer_", deviceId);
      let waited = 0;
      while (logBuffer.length === 0 && waited < 2000) {
        await new Promise((res) => setTimeout(res, 200));
        waited += 200;
      }
      const logs = logBuffer.join("\n");
      return {
        content: [
          {
            type: "text",
            text: logs || "[No AppsFlyer logs found in the last few seconds.]",
          },
        ],
      };
    } catch (err: any) {
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
  server.registerTool(
    toolName,
    {
      title: toolName.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim(),
      description: descriptions[toolName],
      inputSchema: {
        deviceId: z.string().optional(),
      },
      annotations: {
        intent: intents[toolName],
        keywords: keywords[toolName],
      },
    },
    async ({ deviceId }) => {
      await startLogcatStream("AppsFlyer_", deviceId);
      const logs = getParsedAppsflyerFilters(keyword);

      if (keyword === "CONVERSION-" || keyword === "LAUNCH-" || keyword === "deepLink") {
        if (!logs.length) {
          return {
            content: [
              {
                type: "text",
                text: "No logs entry found.",
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

server.registerTool(
  "getAppsflyerErrors",
  {
    title: "Get AppsFlyer Errors",
    description: descriptions.getAppsflyerErrors,
    annotations: {
      intent: intents.getAppsflyerErrors,
      keywords: keywords.getAppsflyerErrors,
    },
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

server.registerTool(
  "createAppsFlyerLogEvent",
  {
    title: "Create AppsFlyer Log Event",
    description: descriptions.createAppsFlyerLogEvent,
    inputSchema: {
      eventName: z.string().optional(),
      eventParams: z.record(z.any()).optional(),
      wantsExamples: z.enum(["yes", "no"]).optional(),
      hasListener: z.enum(["yes", "no"]).optional(),
    },
    annotations: {
      intent: intents.createAppsFlyerLogEvent,
      keywords: keywords.createAppsFlyerLogEvent,
    },
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

server.registerTool(
  "verifyInAppEvent",
  {
    title: "Verify In-App Event",
    description: descriptions.verifyInAppEvent,
    annotations: {
      intent: intents.verifyInAppEvent,
      keywords: keywords.verifyInAppEvent,
    },
    inputSchema: {
      eventName: z.string({
        required_error:
          "Please provide the name of the in-app event you want to verify",
      }),
    },
  },
  async function verifyInAppEventHandler({ eventName }) {
    const logLines = logBuffer;
    let foundEvent = false;
    let foundEventValue = false;
    let foundEndpoint = false;

    for (const line of logLines) {
      try {
        const json = JSON.parse(line);
        if (json.event === eventName) {
          foundEvent = true;
          if (
            json.eventvalue &&
            typeof json.eventvalue === "object" &&
            Object.keys(json.eventvalue).length > 0
          ) {
            foundEventValue = true;
          }
          if (line.includes("androidevent?app_id=")) {
            foundEndpoint = true;
          }
        }
      } catch {
        continue;
      }
    }

    const allPresent = foundEvent && foundEventValue && foundEndpoint;
    return {
      content: [
        {
          type: "text",
          text: allPresent
            ? `✅ Event \`${eventName}\` was successfully logged with full details.`
            : `❌ The event \`${eventName}\` may not have been logged correctly. Results:\n- Found Event: ${foundEvent}\n- Found Event Value: ${foundEventValue}\n- Found Endpoint: ${foundEndpoint}`,
        },
        ...(allPresent
          ? [
              {
                type: "text",
                text: `✅ Event \`${eventName}\` created successfully!`,
              },
            ]
          : []),
      ],
    } as { [x: string]: unknown; content: { type: "text"; text: string; _meta?: { [x: string]: unknown } }[] };
  }
);

server.registerTool(
  "createDirectDeepLink",
  {
    title: "AppsFlyer OneLink Direct Deep Link Setup Prompt",
    description: descriptions.createDirectDeepLink,
    inputSchema: {
      oneLinkUrl: z.string().url(),
      uriScheme: z.string().optional(),
    },
    annotations: {
      intent: intents.AppsFlyerOneLinkDeepLinkSetupPrompt,
      keywords: keywords.AppsFlyerOneLinkDeepLinkSetupPrompt,
    },
  },
  async (args) => {
    if (!args.oneLinkUrl) {
      return {
        content: [{ type: "text", text: "Please enter your OneLink URL to get customized instructions." }],
      };
    }
    return {
      content: [
        {
          type: "text",
          text: steps.createDirectDeepLink(args.uriScheme != null, true).join('\n\n'),
        },
      ],
    };
  }
);
  
server.registerTool(
  "VerifyAppsFlyerDeepLinkHandled",
  {
    title: "Verify AppsFlyer Deep Link Handled",
    description: "Check if a deep link was triggered and handled properly inside the app.",
    inputSchema: {},
    annotations: {
      intent: "verify appsflyer deep link handled",
      keywords: ["deep link", "appsFlyer", "handled", "navigation"],
    },
  },
  async () => {
    await startLogcatStream(); 
    const logsText = logBuffer.join("\n");
    if (!logsText || logsText.trim() === "") {
      return {
        content: [{ type: "text", text: "⚠️ No logs found. Make sure logcat is streaming." }],
      };
    }

    const logText = logsText;
    const hasActivity = /Starting activity/.test(logText);
    const hasRouting = /navigate|redirect|route to/.test(logText.toLowerCase());
    const hasSpecificDeeplinkValue = /apples|deep_link_value/.test(logText);

    const allFound = hasActivity && hasRouting && hasSpecificDeeplinkValue;

    const summary = allFound
      ? "✅ Deep link seems to have triggered in-app flow (activity start + routing + value found)."
      : [
          "❌ Deep link may not have triggered the app flow.",
          `• Found activity start: ${hasActivity}`,
          `• Found routing/navigation: ${hasRouting}`,
          `• Found deep link value: ${hasSpecificDeeplinkValue}`,
        ].join("\n");

   
    const deepLinkReport = detectAppsFlyerDeepLink(logText);

    return {
      content: [
        {
          type: "text",
          text: [summary, "", ...deepLinkReport].join("\n\n"),
        },
      ],
    };
  }
);

function detectAppsFlyerDeepLink(logsText: string): string[] {
  const logs = logsText.split("\n");
  const logText = logs.join("\n");

  const isDeferred =
    /is_deferred\s*[:=]\s*true/i.test(logText) ||
    /deferred deep link/i.test(logText);

  const hasOnDeepLinkingSuccess = /onDeepLinking.*SUCCESS/i.test(logText);
  const hasAfDp = /af_dp[=:\"]/i.test(logText);
  const hasAfDeeplinkTrue = /af_deeplink\s*[:=]\s*true/i.test(logText);
  const isDirect = (hasOnDeepLinkingSuccess || hasAfDp || hasAfDeeplinkTrue) && !isDeferred;

  const deeplinkLines = logs.filter((line: string) =>
    /deep_link_value|af_dp|onDeepLinking/i.test(line)
  );

  const deeplinkErrors = logs.filter((line: string) =>
    /onDeepLinking.*FAILURE|error parsing|invalid|deep_link.*null/i.test(line)
  );

  return [
    "🔍 **Deep Link Detection Report:**",
    isDeferred ? "📥 Deferred deep link detected." : "",
    isDirect ? "⚡ Direct deep link detected." : "",
    deeplinkLines.length > 0
      ? `🔗 Found ${deeplinkLines.length} deep link entries:\n${deeplinkLines.join("\n")}`
      : "❌ No deep links found in logs.",
    deeplinkErrors.length > 0
      ? `❗ Found ${deeplinkErrors.length} possible error(s):\n${deeplinkErrors.join("\n")}`
      : "✅ No deep link errors detected.",
  ].filter(Boolean);
}

async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server running with stdio transport...");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}
// Start the server
startServer();