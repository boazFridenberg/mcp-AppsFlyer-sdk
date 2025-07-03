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
import { getAdbPath, validateAdb, getConnectedDevices } from "./adb.js";
import fs from "fs";
import path from "path";

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
  {}, 
  {
    description: descriptions.testAppsFlyerSdk,
    intent: intents.testAppsFlyerSdk,
    keywords: keywords.testAppsFlyerSdk,
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
    lineCount: z.number().default(500),
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
        deviceId = devices[0]; 
      }

      await startLogcatStream("AppsFlyer_", deviceId);

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
    async ({ lineCount }: { lineCount: number }) => {
      const logs = getParsedAppsflyerFilters(lineCount, keyword);

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

    // 1. Missing event name
    if (!eventName) {
      return {
        content: [
          {
            type: "text",
            text: "❗ Missing event name. Please provide the event name.",
          },
        ],
      };
    }

    // 2. Missing event parameters
    if (Object.keys(eventParams).length === 0) {
      return {
        content: [
          {
            type: "text",
            text:
              "❗ Missing event parameters. Please provide key-value pairs for event parameters.",
          },
        ],
      };
    }

    // 3. Check if any parameter has missing or empty value
    const missingValueParams = Object.entries(eventParams)
      .filter(([_, v]) => v === undefined || v === null || v === "")
      .map(([k]) => k);

    if (missingValueParams.length > 0) {
      return {
        content: [
          {
            type: "text",
            text:
              `❗ The following parameters have missing values: ${missingValueParams.join(
                ", "
              )}. Please provide values for them.`,
          },
        ],
      };
    }

    // 4. If user asked for examples or we want to ask if wants examples
    if (!wantsExamples) {
      return {
        content: [
          {
            type: "text",
            text:
              "Would you like to see example event names and parameters? (yes/no)",
          },
        ],
      };
    }

    if (wantsExamples === "yes") {
      // Show example event names and example parameters
      return {
        content: [
          {
            type: "text",
            text: [
              "**Example event names:**",
              "• af_purchase",
              "• af_add_to_cart",
              "• af_login",
              "• af_complete_registration",
              "",
              "**Example parameters:**",
              "• af_price: \"9.99\"",
              "• af_currency: \"USD\"",
              "• af_content_type: \"product\"",
              "",
              "Please provide the event name and parameters to proceed.",
            ].join("\n"),
          },
        ],
      };
    }

    // 5. Generate the AppsFlyer log event Java code
    function generateJavaCode(
      eventName: string,
      eventParams: Record<string, any>,
      includeListener: boolean
    ): string[] {
      const code: string[] = [];
      code.push("Map<String, Object> eventValues = new HashMap<String, Object>();");
      for (const [key, value] of Object.entries(eventParams)) {
        const javaValue = typeof value === "number" ? value : `"${value}"`;
        code.push(`eventValues.put("${key}", ${javaValue});`);
      }
      code.push(
        `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), "${eventName}", eventValues);`
      );
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
  "testInAppEvent",
  {
    lineCount: z.number().optional().default(100),
  },
  {
    description: descriptions.testInAppEvent,
    intent: intents.testInAppEvent,
    keywords: keywords.testInAppEvent,
  },
  async ({ lineCount }) => {
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
      ],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");
