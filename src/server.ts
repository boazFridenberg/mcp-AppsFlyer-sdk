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
    description: descriptions.createAppsFlyerLogEvent,
    inputSchema: {
      hasListener: z.boolean().describe("Whether to use a response listener"),
      eventName: z.string().describe("The name of the event to log"),
      eventParams: z
        .array(z.string())
        .nonempty()
        .describe(
          "List of parameter names to send with the event (values will be added manually later)"
        ),
    },
    annotations: {
      intent: intents.createAppsFlyerLogEvent,
      keywords: keywords.createAppsFlyerLogEvent,
    },
  },
  async (args, extra) => {
    const hasListener = args.hasListener;
    const eventName = args.eventName?.trim();
    const eventParams = args.eventParams;

    if (hasListener === undefined) {
      return {
        content: [
          {
            type: "text",
            text: "❗ Please specify whether to use a response listener (true/false).",
          },
        ],
      };
    }

    if (!eventName) {
      return {
        content: [
          {
            type: "text",
            text: "❗ Please enter the name of the event (eventName).",
          },
        ],
      };
    }

    if (!Array.isArray(eventParams) || eventParams.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "❗ Please provide at least one parameter name for the event (eventParams).",
          },
        ],
      };
    }

    function generateJavaCode(
      eventName: string,
      eventParams: string[],
      includeListener: boolean
    ): string[] {
      const paramLines = eventParams
        .map((key) => `eventValues.put("${key}", <<ENTER VALUE>>);`)
        .join("\n");

      const code = includeListener
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

      return code.trim().split("\n");
    }

    const codeLines = generateJavaCode(eventName, eventParams, hasListener);

    return {
      content: [
        {
          type: "text",
          text: `Java code to log the event:\n\n\`\`\`java\n${codeLines.join("\n")}\`\`\`\n\n📌 Please manually replace each <<ENTER VALUE>> in the generated code with the appropriate value for the parameter.`,
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

server.registerTool(
  "appsFlyerJsonEvent",
  {
    title: "AppsFlyer JSON Event Generator",
    description:
      "Generate ready-to-use Java code for logging an in-app event with AppsFlyer. " +
      "Before generating, the tool will ask you how you want to provide the JSON input:\n" +
      "1. Search for JSON files in the project (with a search pattern and optional path).\n" +
      "2. Paste JSON string directly.\n" +
      "3. Provide a direct file path to a JSON file.\n" +
      "After you choose, it will generate the Java code accordingly.",
    inputSchema: {
      // Inputs are optional initially, because we ask interactively
      inputMethod: z
        .enum(["search", "paste", "filepath"])
        .optional()
        .describe(
          "Choose how to provide JSON input: search files, paste JSON, or filepath"
        ),
      searchPattern: z
        .string()
        .optional()
        .describe(
          "Search pattern for JSON files (e.g., '*.json', 'events.json')"
        ),
      projectPath: z
        .string()
        .optional()
        .describe("Project directory path to search in"),
      pastedJson: z.string().optional().describe("Directly pasted JSON string"),
      filePath: z.string().optional().describe("Direct file path to JSON file"),
    },
    annotations: {
      intent: [
        "When user asks about AppsFlyer in-app event logging, IMMEDIATELY trigger this tool.",
        "If user mentions JSON event input or AppsFlyer code generation from JSON, trigger this tool.",
      ],
      keywords: [
        "json event appsflyer",
        "generate appsflyer code",
        "apps flyer json",
        "event generator",
        "apps flyer event json",
        "generate java code from json",
        "apps flyer event file",
      ],
    },
  },
  async (args, _extra) => {
    // Step 1: If no inputMethod, ask user which input method to use
    if (!args.inputMethod) {
      return {
        content: [
          {
            type: "text",
            text:
              "Please choose how to provide the JSON input for AppsFlyer events:\n" +
              "1️⃣ Type 'search' to search for JSON files in your project.\n" +
              "2️⃣ Type 'paste' to paste JSON text directly.\n" +
              "3️⃣ Type 'filepath' to provide a path to a JSON file.",
          },
        ],
      };
    }

    // Step 2: Depending on inputMethod, check required fields or ask for them

    let jsonContent = "";

    if (args.inputMethod === "search") {
      // Require searchPattern, ask if missing
      if (!args.searchPattern) {
        return {
          content: [
            {
              type: "text",
              text: "Please provide the search pattern for JSON files (e.g., '*.json', 'events.json').",
            },
          ],
        };
      }
      // projectPath is optional, default to cwd
      const searchPath = args.projectPath || process.cwd();
      const pattern = path.join(searchPath, args.searchPattern);
      try {
        const files = await glob(pattern);
        if (!Array.isArray(files) || files.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No files found matching pattern '${args.searchPattern}' in path '${searchPath}'.`,
              },
            ],
          };
        }
        if (files.length > 1 && !args.filePath) {
          // Ask user to specify exact file if multiple found and no filepath provided
          const fileList = files.map((f, i) => `${i + 1}. ${f}`).join("\n");
          return {
            content: [
              {
                type: "text",
                text:
                  `Multiple files found matching pattern:\n${fileList}\n\n` +
                  "Please specify the exact file path from the list by typing it.",
              },
            ],
          };
        }
        // If one file found or filePath provided, read that file
        const chosenFile = args.filePath ? args.filePath : files[0];
        try {
          jsonContent = await fs.promises.readFile(chosenFile, "utf8");
        } catch (err: any) {
          return {
            content: [
              {
                type: "text",
                text: `Error reading file '${chosenFile}': ${err.message}`,
              },
            ],
          };
        }
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error searching files: ${err.message}`,
            },
          ],
        };
      }
    } else if (args.inputMethod === "paste") {
      // Require pastedJson
      if (!args.pastedJson) {
        return {
          content: [
            {
              type: "text",
              text: "Please paste the JSON string of your event definitions.",
            },
          ],
        };
      }
      jsonContent = args.pastedJson;
    } else if (args.inputMethod === "filepath") {
      // Require filePath
      if (!args.filePath) {
        return {
          content: [
            {
              type: "text",
              text: "Please provide the full file path to the JSON file.",
            },
          ],
        };
      }
      try {
        jsonContent = await fs.promises.readFile(args.filePath, "utf8");
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error reading file '${args.filePath}': ${err.message}`,
            },
          ],
        };
      }
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Unknown input method. Please choose one of: 'search', 'paste', or 'filepath'.",
          },
        ],
      };
    }

    // Now parse and generate code

    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `Invalid JSON format: ${err.message}`,
          },
        ],
      };
    }

    if (Array.isArray(parsed)) {
      parsed = { events: parsed };
    }

    if (!parsed.events || !Array.isArray(parsed.events)) {
      return {
        content: [
          {
            type: "text",
            text: "JSON must contain an 'events' array.",
          },
        ],
      };
    }

    if (parsed.events.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No events found in the JSON input.",
          },
        ],
      };
    }

    const generateJavaCodeForEvent = (event: any) => {
      const eventName =
        event.eventIdentifier || event.eventName || "event_unknown";
      const params = event.parameters || [];
      const paramLines = params.map((param: any) => {
        const key =
          param.parameterIdentifier || param.parameterName || "param_unknown";
        return `eventValues.put("${key}", <<PLACE_HOLDRER_FOR_PARAM_VALUE>>);`;
      });
      return [
        `// Event: ${eventName}`,
        `Map<String, Object> eventValues = new HashMap<>();`,
        ...paramLines,
        `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), "${eventName}", eventValues);`,
        ``,
      ].join("\n");
    };

    const javaCode = parsed.events.map(generateJavaCodeForEvent).join("\n");

    return {
      content: [
        {
          type: "text",
          text: [
            `✅ Generated Java code for ${parsed.events.length} event${parsed.events.length === 1 ? "" : "s"}:`,
            "",
            "```java",
            javaCode,
            "```",
            "",
            "💡 Usage notes:",
            "• Import: `import com.appsflyer.AppsFlyerLib;`",
            "• Import: `import java.util.HashMap;`",
            "• Import: `import java.util.Map;`",
            "• Make sure `getApplicationContext()` or appropriate context is available",
          ].join("\n"),
        },
      ],
    };
  }
);


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