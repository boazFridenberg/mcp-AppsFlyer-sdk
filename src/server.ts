import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, getRecentLogs, logBuffer } from "./logcat/stream.js";
import { getParsedAppsflyerFilters } from "./logcat/parse.js";
import { z } from "zod";
import { descriptions } from "./constants/descriptions.js";
import { intents } from "./constants/intents.js";
import { keywords } from "./constants/keywords.js";
import { steps } from "./constants/steps.js";


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
  { lineCount: z.number().default(100) },
  {
    description: descriptions.fetchAppsflyerLogs,
    intent: intents.fetchAppsflyerLogs,
    keywords: keywords.fetchAppsflyerLogs,
  },
  async ({ lineCount }) => {
    startLogcatStream("AppsFlyer_6.14.0");
    let waited = 0;
    while (logBuffer.length === 0 && waited < 2000) {
      await new Promise(res => setTimeout(res, 200));
      waited += 200;
    }
    return {
      content: [{ type: "text", text: getRecentLogs(lineCount) }],
    };
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
    const errors = errorKeywords.flatMap(keyword => getParsedAppsflyerFilters(lineCount, keyword));
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




const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");