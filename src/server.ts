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
import fs from "fs";
import path from "path";
import { glob } from "glob";
import { exec } from "child_process";

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
    hasListener: z.enum(["yes", "no"]).optional(),
  },
  async (args) => {
    const rootDir: string = await new Promise((resolve) => {
      exec("pwd", (error, stdout) => {
        if (error) {
          resolve(process.cwd());
        } else {
          resolve(stdout.trim());
        }
      });
    });

    const ignoredDirs = new Set([
      ".Trash",
      "node_modules",
      ".git",
      "build",
      "out",
      ".gradle",
      "Library",
      "__MACOSX",
    ]);

    async function safeGetProjectFiles(
      dir: string,
      extensions: string[] = [".java", ".kt"]
    ): Promise<string[]> {
      const resolvedDir = path.resolve(dir);
      if (!resolvedDir.startsWith(rootDir)) {
        throw new Error(`Access denied outside project root: ${resolvedDir}`);
      }

      let results: string[] = [];
      try {
        const entries = await fs.promises.readdir(resolvedDir, { withFileTypes: true });
        for (const entry of entries) {
          if (ignoredDirs.has(entry.name)) continue;
          const fullPath = path.join(resolvedDir, entry.name);
          if (entry.isDirectory()) {
            results.push(...(await safeGetProjectFiles(fullPath, extensions)));
          } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
            results.push(fullPath);
          }
        }
      } catch {
        // ignore permission errors
      }
      return results;
    }

    const projectFiles = await safeGetProjectFiles(rootDir);

    const sdkLine = 'AppsFlyerLib.getInstance().start(this);';
    const sdkFound = await projectFiles.reduce(async (accP, file) => {
      const acc = await accP;
      if (acc) return true;
      try {
        const content = await fs.promises.readFile(file, "utf8");
        return content.includes(sdkLine);
      } catch {
        return false;
      }
    }, Promise.resolve(false));

    if (!sdkFound) {
      return {
        content: [
          {
            type: "text",
            text: "⚠️ AppsFlyer SDK not detected in the project.",
          },
          {
            type: "text",
            text: "Follow these steps to integrate the AppsFlyer SDK:\n\n" + steps.integrateAppsFlyerSdk.join("\n\n"),
          },
        ],
      };
    }

    const eventName = args.eventName?.trim();
    const eventParams = args.eventParams || {};
    const hasListener = args.hasListener?.toLowerCase() === "yes";

    const missingValueParams = Object.entries(eventParams)
      .filter(([_, v]) => v === undefined || v === null || v === "")
      .map(([k]) => k);

    if (!eventName) {
      return {
        content: [
          {
            type: "text",
            text: "❗ Missing event name. Please provide eventName to continue.",
          },
        ],
      };
    }

    if (Object.entries(eventParams).length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "❗ Missing event parameters. Please provide at least one key-value pair.",
          },
        ],
      };
    }

    if (missingValueParams.length > 0) {
      return {
        content: [
          {
            type: "text",
            text: `❗ The following parameters are missing values: ${missingValueParams.join(", ")}.`,
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
      code.push("Map<String, Object> eventValues = new HashMap<>();");
      for (const [key, value] of Object.entries(eventParams)) {
        const javaValue = typeof value === "number" ? value : `"${value}"`;
        code.push(`eventValues.put("${key}", ${javaValue});`);
      }
      code.push(
        `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), "${eventName}", eventValues);`
      );
      if (includeListener) {
        code.push("// Optional: add AppsFlyerRequestListener if needed");
        code.push("// AppsFlyerLib.getInstance().logEvent(..., new AppsFlyerRequestListener() { ... });");
      }
      return code;
    }

    const codeLines = generateJavaCode(eventName, eventParams, hasListener);

    return {
      content: [
        {
          type: "text",
          text: `✅ Event is ready:\n\nName: ${eventName}\nParameters: ${JSON.stringify(
            eventParams,
            null,
            2
          )}\nListener included: ${hasListener ? "yes" : "no"}`,
        },
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
)


server.tool(
  "appsFlyerJsonEvent",
  {
    inputFile: z.string().optional().describe("JSON string of event definitions or file path"),
    searchPattern: z.string().optional().describe("Search pattern for JSON files (e.g., '*.json', 'events.json')"),
    projectPath: z.string().optional().describe("Project directory path to search in"),
  },
  {
    description: "Generate AppsFlyer Java code from JSON event definitions. Can search for JSON files in project or accept direct JSON input.",
    intent: async ({ entities }: { entities: any }) => {
      const inputFile = entities.inputFile?.value?.trim();
      const searchPattern = entities.searchPattern?.value?.trim();
      const projectPath = entities.projectPath?.value?.trim();
      // If no input provided, show options
      if (!inputFile && !searchPattern) {
        return {
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
        };
      }
      return {
        type: "tool-call",
        tool: "appsFlyerJsonEvent",
        parameters: {
          inputFile,
          searchPattern,
          projectPath
        }
      };
    },
  },
  async (args, _extra) => {
    const { inputFile, searchPattern, projectPath } = args;
    let jsonContent = "";
    // If search pattern provided, search for files
    if (searchPattern) {
      try {
        const searchPath = projectPath || process.cwd();
        const pattern = path.join(searchPath, searchPattern);
        // Use glob's async API
        const files: string[] = await glob(pattern);
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
          const fileList = files.map((file: string, index: number) => `${index + 1}. ${file}`).join('\n');
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
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `❌ Error reading file ${filePath}: ${(error as Error).message}`
            }]
          };
        }
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Error searching for files: ${(error as Error).message}`
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
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `❌ Error reading file ${inputFile}: ${(error as Error).message}`
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
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Invalid JSON format: ${(error as Error).message}`
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


const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");
