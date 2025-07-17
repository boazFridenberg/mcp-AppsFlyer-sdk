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
    description: "Generate AppsFlyer Java code from JSON event definitions. Can search for JSON files in project or accept direct JSON input.",
    inputSchema: {
      inputFile: z.string().optional().describe("JSON string of event definitions or file path"),
      searchPattern: z.string().optional().describe("Search pattern for JSON files (e.g., '*.json', 'events.json')"),
      projectPath: z.string().optional().describe("Project directory path to search in"),
    },
    annotations: {
      intent: "Generate AppsFlyer Java code from JSON event definitions or files.",
      keywords: [
        "json event appsflyer",
        "generate appsflyer code",
        "apps flyer json",
        "event generator",
        "apps flyer event json",
        "generate java code from json",
        "apps flyer event file"
      ],
    },
  },
  async (args, _extra) => {
    const { inputFile, searchPattern, projectPath } = args;
    // Show usage instructions if no input provided
    if (!inputFile && !searchPattern) {
      return {
        content: [
          {
            type: "text",
            text: [
              "📄 **AppsFlyer JSON Event Generator**",
              "",
              "You can use this tool in two ways:",
              "",
              "🔍 **Search for JSON files:**",
              "• Specify a search pattern (e.g., 'events.json', '*.json')",
              "• Optionally specify project path",
              "",
              "📝 **Direct JSON input:**",
              "• Provide JSON string directly",
              "",
              "**Example JSON format:**",
              "```json",
              "{",
              '  "events": [',
              "    {",
              '      "eventIdentifier": "af_purchase",',
              '      "parameters": [',
              "        {",
              '          "parameterIdentifier": "af_revenue",',
              '          "parameterValueExample": 29.99',
              "        }",
              "      ]",
              "    }",
              "  ]",
              "}",
              "```",
              "",
              "💡 **Usage examples:**",
              "• 'Generate AppsFlyer code from events.json'",
              "• 'Search for *.json files and generate AppsFlyer code'",
              "• 'Generate AppsFlyer code from {\"events\": [...]}')"
            ].join("\n")
          }
        ]
      };
    }
    let jsonContent = "";
    // If search pattern provided, search for files
    if (searchPattern) {
      try {
        const searchPath = projectPath || process.cwd();
        const pattern = path.join(searchPath, searchPattern);
        // Use glob's async API
        const files = await glob(pattern);
        if (!Array.isArray(files) || files.length === 0) {
          return {
            content: [{
              type: "text",
              text: `🔍 No files found matching pattern: ${searchPattern}\n\nSearched in: ${searchPath}`
            }]
          };
        }
        // If multiple files found, show options
        if (files.length > 1) {
          const fileList = files.map((file, index) => `${index + 1}. ${file}`).join('\n');
          return {
            content: [{
              type: "text",
              text: `📁 Found ${files.length} files:\n\n${fileList}\n\n💡 Please specify the exact file name to process.`
            }]
          };
        }
        // Read the single file found
        const filePath = files[0];
        try {
          jsonContent = await fs.promises.readFile(filePath, 'utf8');
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Error reading file ${filePath}: ${error.message}`
            }]
          };
        }
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: `❌ Error searching for files: ${error.message}`
          }]
        };
      }
    } else if (inputFile) {
      // Try to determine if input is a file path or JSON string
      if (inputFile.trim().endsWith('.json')) {
        // Treat as file path
        try {
          const filePath = path.resolve(inputFile);
          jsonContent = await fs.promises.readFile(filePath, 'utf8');
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: `❌ Error reading file ${inputFile}: ${error.message}`
            }]
          };
        }
      } else {
        // Treat as JSON string
        jsonContent = inputFile;
      }
    } else {
      return {
        content: [{
          type: "text",
          text: "❗ Please provide either JSON input or a search pattern for JSON files."
        }]
      };
    }
    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: `❌ Invalid JSON format: ${error.message}`
        }]
      };
    }
    // Normalize structure
    if (Array.isArray(parsed)) {
      parsed = { events: parsed };
    }
    if (!parsed.events || !Array.isArray(parsed.events)) {
      return {
        content: [{
          type: "text",
          text: "⚠️ JSON must contain an 'events' array."
        }]
      };
    }
    const events = parsed.events;
    if (events.length === 0) {
      return {
        content: [{
          type: "text",
          text: "⚠️ No events found in the JSON file."
        }]
      };
    }
    // Generate Java code for each event
    const generateJavaCodeForEvent = (event: any) => {
      const eventName = event.eventIdentifier || event.eventName || "event_unknown";
      const params = event.parameters || [];
      const paramLines = params.map((param: any) => {
        const key = param.parameterIdentifier || param.parameterName || "param_unknown";
        const val = typeof param.parameterValueExample === "string"
          ? `"${param.parameterValueExample}"`
          : param.parameterValueExample !== undefined
          ? param.parameterValueExample
          : `"value"`;
        return `eventValues.put("${key}", ${val});`;
      });
      return [
        `// Event: ${eventName}`,
        `Map<String, Object> eventValues = new HashMap<>();`,
        ...paramLines,
        `AppsFlyerLib.getInstance().logEvent(context, "${eventName}", eventValues);`,
        ``,
      ].join("\n");
    };
    const javaCode = events.map(generateJavaCodeForEvent).join("\n");
    return {
      content: [
        {
          type: "text",
          text: [
            `✅ **Generated Java code for ${events.length} event${events.length === 1 ? '' : 's'}:**`,
            "",
            "```java",
            javaCode,
            "```",
            "",
            "💡 **Usage notes:**",
            "• Import: `import com.appsflyer.AppsFlyerLib;`",
            "• Import: `import java.util.HashMap;`",
            "• Import: `import java.util.Map;`",
            "• Make sure `context` is available in your scope"
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