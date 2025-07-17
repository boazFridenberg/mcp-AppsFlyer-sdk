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
import * as fs from "fs";
import path from "path";
import { glob } from "glob";
import { exec } from "child_process";

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
    description:
      "Generate Java code to log AppsFlyer in-app events. You will first be asked whether you want to use JSON input (via file search, paste, or file path), or to manually specify the event name and parameters. Then, you will be guided step-by-step.",
    inputSchema: {
      inputChoice: z
        .string()
        .optional()
        .describe("User input choice: '1' for JSON, '2' for manual input"),
      useJsonInput: z
        .boolean()
        .optional()
        .describe("Whether to use JSON input for event definitions"),

      // Fields for JSON input method
      inputMethod: z.enum(["search", "paste", "filepath"]).optional(),
      projectPath: z.string().optional(),
      filePath: z.string().optional(),
      pastedJson: z.string().optional(),
      selectedEventIdentifiers: z.array(z.string()).optional(),
      selectedFileIndex: z.number().optional(),
      includeAllEvents: z.boolean().optional(),

      // Fields for manual input method
      hasListener: z
        .boolean()
        .optional()
        .describe("Whether to use a response listener"),
      eventName: z.string().optional().describe("The name of the event to log"),
      eventParams: z
        .array(z.string())
        .optional()
        .describe(
          "List of parameter names to send with the event (values will be added manually later)"
        ),
    },
    annotations: {
      intent: [
        "Ask the user if they want to use JSON or manual input before starting",
        "Generate Java code for logging AppsFlyer in-app events",
        "Create AppsFlyer event logging code from JSON definitions or manual input",
        "Provide AppsFlyer event JSON input via search, file path, or paste methods",
        "Generate AppsFlyer event code with or without response listener",
      ],
      keywords: [
        "apps flyer event",
        "generate java code from json",
        "apps flyer json",
        "search json files",
        "create appsflyer log event",
      ],
    },
  },
  async (args, _extra) => {
    const ask = (text: string) =>
      ({ content: [{ type: "text", text, _meta: {} }], _meta: {} }) as any;

    // Step 0: Initial choice
    if (args.useJsonInput === undefined && args.inputChoice === undefined) {
      return ask(
        `📋 How would you like to provide the AppsFlyer event information?\n\n` +
          `1️⃣ Use a JSON input (search, paste, or file path)\n` +
          `2️⃣ Manually enter the event name and its parameters\n\n` +
          `Please reply with \`1\` or \`2\`.`
      );
    }

    if (args.useJsonInput === undefined && args.inputChoice !== undefined) {
      if (args.inputChoice === "1") {
        args.useJsonInput = true;
      } else if (args.inputChoice === "2") {
        args.useJsonInput = false;
      } else {
        return ask(
          "❗ Invalid choice. Please reply with `1` for JSON input or `2` for manual input."
        );
      }
    }

    // JSON INPUT PATH
    if (args.useJsonInput === true) {
      if (!args.inputMethod) {
        return ask(
          "Choose JSON input method:\n1️⃣ `search` to find JSON files in your project\n2️⃣ `paste` to paste JSON text\n3️⃣ `filepath` to provide full path to a JSON file"
        );
      }

      let jsonContent = "";

      if (args.inputMethod === "search") {
        const basePath = args.projectPath || process.cwd();
        const pattern = path.join(basePath, "**/*.json");
        const files = await glob(pattern);

        if (files.length === 0) {
          return ask(`No JSON files found in '${basePath}'.`) as any;
        }

        if (args.selectedFileIndex === undefined) {
          const list = files
            .map((file, idx) => `${idx + 1}. ${path.relative(basePath, file)}`)
            .join("\n");
          return ask(
            `Found ${files.length} JSON files:\n${list}\n\nPlease reply with the number of the file you want to use.`
          ) as any;
        }

        const chosenIndex = args.selectedFileIndex - 1;
        if (chosenIndex < 0 || chosenIndex >= files.length) {
          return ask("Invalid file number. Please try again.") as any;
        }

        const chosenFile = files[chosenIndex];
        const content = await fs.promises.readFile(chosenFile, "utf8");
        jsonContent = content;

        let parsed;
        try {
          parsed = JSON.parse(jsonContent);
        } catch (e: any) {
          return ask(
            `Invalid JSON in file '${chosenFile}': ${e.message}`
          ) as any;
        }

        if (Array.isArray(parsed)) parsed = { events: parsed };
        if (!parsed.events || !Array.isArray(parsed.events)) {
          return ask("JSON must contain an 'events' array.") as any;
        }

        const events = parsed.events;

        if (
          args.includeAllEvents === undefined &&
          !args.selectedEventIdentifiers
        ) {
          const eventList = events
            .map(
              (e: any, idx: number) =>
                `${idx + 1}. ${e.eventIdentifier || e.eventName || "event_unknown"}`
            )
            .join("\n");
          return ask(
            `Events in chosen file:\n${eventList}\n\n` +
              "Type `all` to include all events, or reply with comma-separated event identifiers to select specific events."
          ) as any;
        }

        let finalEvents = events;
        if (args.includeAllEvents === false && args.selectedEventIdentifiers) {
          finalEvents = events.filter((e: any) =>
            args.selectedEventIdentifiers!.includes(e.eventIdentifier)
          );
          if (finalEvents.length === 0) {
            return ask(
              "No matching events found for the selected identifiers."
            ) as any;
          }
        }

        const generateCode = (event: any) => {
          const eventName =
            event.eventIdentifier || event.eventName || "event_unknown";
          const params = event.parameters || [];
          const paramLines = params.map((p: any) => {
            const key =
              p.parameterIdentifier || p.parameterName || "param_unknown";
            return `eventValues.put("${key}", <<PLACEHOLDER_VALUE>>);`;
          });
          return [
            `// Event: ${eventName}`,
            `Map<String, Object> eventValues = new HashMap<>();`,
            ...paramLines,
            `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), "${eventName}", eventValues);`,
            "",
          ].join("\n");
        };

        const javaCode = finalEvents.map(generateCode).join("\n");

        return {
          content: [
            {
              type: "text",
              text: [
                `✅ Java code generated for ${finalEvents.length} event(s):`,
                "",
                "```java",
                javaCode,
                "```",
                "",
                "Imports you need:",
                "- import com.appsflyer.AppsFlyerLib;",
                "- import java.util.Map;",
                "- import java.util.HashMap;",
              ].join("\n"),
              _meta: {},
            },
          ],
          _meta: {},
        } as any;
      }

      // Handle paste or filepath
      if (args.inputMethod === "paste") {
        if (!args.pastedJson) {
          return ask("Please paste your AppsFlyer JSON.") as any;
        }
        jsonContent = args.pastedJson;
      }

      if (args.inputMethod === "filepath") {
        if (!args.filePath) {
          return ask("Please provide the full file path.") as any;
        }
        try {
          jsonContent = await fs.promises.readFile(args.filePath, "utf8");
        } catch {
          return ask(`Cannot read file at ${args.filePath}`) as any;
        }
      }

      let parsed;
      try {
        parsed = JSON.parse(jsonContent);
      } catch (e: any) {
        return ask(`Invalid JSON: ${e.message}`) as any;
      }
      if (Array.isArray(parsed)) parsed = { events: parsed };
      if (!parsed.events || !Array.isArray(parsed.events)) {
        return ask("JSON must contain an 'events' array.") as any;
      }
      const events = parsed.events;

      const generateCode = (event: any) => {
        const eventName =
          event.eventIdentifier || event.eventName || "event_unknown";
        const params = event.parameters || [];
        const paramLines = params.map((p: any) => {
          const key =
            p.parameterIdentifier || p.parameterName || "param_unknown";
          return `eventValues.put("${key}", <<PLACEHOLDER_VALUE>>);`;
        });
        return [
          `// Event: ${eventName}`,
          `Map<String, Object> eventValues = new HashMap<>();`,
          ...paramLines,
          `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), "${eventName}", eventValues);`,
          "",
        ].join("\n");
      };

      const javaCode = events.map(generateCode).join("\n");

      return {
        content: [
          {
            type: "text",
            text: [
              `✅ Java code generated for ${events.length} event(s):`,
              "",
              "```java",
              javaCode,
              "```",
              "",
              "Imports you need:",
              "- import com.appsflyer.AppsFlyerLib;",
              "- import java.util.Map;",
              "- import java.util.HashMap;",
            ].join("\n"),
            _meta: {},
          },
        ],
        _meta: {},
      } as any;
    }

    // MANUAL INPUT PATH
    if (args.useJsonInput === false) {
      const hasListener = args.hasListener;
      const eventName = args.eventName?.trim();
      const eventParams = args.eventParams;

      if (hasListener === undefined) {
        return ask(
          "❗ Please specify whether to use a response listener (true/false)."
        );
      }

      if (!eventName) {
        return ask("❗ Please enter the name of the event (eventName).");
      }

      if (!Array.isArray(eventParams) || eventParams.length === 0) {
        return ask(
          "❗ Please provide at least one parameter name for the event (eventParams)."
        );
      }

      const paramLines = eventParams
        .map((key) => `eventValues.put("${key}", <<ENTER VALUE>>);`)
        .join("\n");

      const code = hasListener
        ? `
import com.appsflyer.AppsFlyerLib;
import com.appsflyer.AFInAppEventType;
import com.appsflyer.AFInAppEventParameterName;
import com.appsflyer.attribution.AppsFlyerRequestListener;

Map<String, Object> eventValues = new HashMap<String, Object>();
${paramLines}
AppsFlyerLib.getInstance().logEvent(
    getApplicationContext(),"${eventName}", eventValues,
    new AppsFlyerRequestListener() {
        @Override
        public void onSuccess() {
            // YOUR CODE UPON SUCCESS
        }

        @Override
        public void onError(int i, String s) {
            // YOUR CODE FOR ERROR HANDLING
        }
    }
);
        `
        : `
import com.appsflyer.AppsFlyerLib;
import com.appsflyer.AFInAppEventType;
import com.appsflyer.AFInAppEventParameterName;

Map<String, Object> eventValues = new HashMap<String, Object>();
${paramLines}

AppsFlyerLib.getInstance().logEvent(
    getApplicationContext(),
    "${eventName}", eventValues
);
        `;

      return {
        content: [
          {
            type: "text",
            text: `Java code to log the event:\n\n\`\`\`java\n${code.trim()}\n\`\`\`\n\n📌 Please manually replace each <<ENTER VALUE>> in the generated code with the appropriate value.`,
          },
        ],
      };
    }

    return ask("Something went wrong. Please try again.") as any;
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
            : `❌ The event may not have been logged correctly. Results:\n- Has Event Name: ${hasEventName}\n- Has Event Value: ${hasEventValue}\n- Has Endpoint: ${hasEndpoint}`,
        },
        { type: "text", text: `✅ Event created successfully!` },
      ],
    };
  }
)



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