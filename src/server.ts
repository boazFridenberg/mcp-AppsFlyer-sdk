import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, stopLogcatStream, getRecentLogs } from "./logcat/stream.js";
import { getParsedJsonLogs, getParsedAppsflyerErrors } from "./logcat/parse.js";
import { z } from "zod";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

server.tool("fetchAppsflyerLogs", {
  lineCount: z.number().default(100)
}, async ({ lineCount }) => {
  startLogcatStream("AppsFlyer_6.14.0");
  return {
    content: [{ type: "text", text: getRecentLogs(lineCount) }]
  };
});

server.tool("getConversionLogs", {
  lineCount: z.number().optional().default(50)
}, async ({ lineCount }) => ({
  content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
}));

server.tool("getInAppLogs", {
  lineCount: z.number().optional().default(50)
}, async ({ lineCount }) => ({
  content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
}));

server.tool("getLaunchLogs", {
  lineCount: z.number().optional().default(50)
}, async ({ lineCount }) => ({
  content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
}));

server.tool("getDeepLinkLogs", {
  lineCount: z.number().optional().default(50)
}, async ({ lineCount }) => ({
  content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
}));

server.tool("getAppsflyerErrors", {
  lineCount: z.number().optional().default(50)
}, async ({ lineCount }) => {
  const keywords = ["FAILURE", "ERROR", "Exception", "No deep link"];
  const errors = keywords.flatMap(keyword => getParsedAppsflyerErrors(lineCount, keyword));
  return {
    content: [{ type: "text", text: JSON.stringify(errors, null, 2) }]
  };
});

server.tool(
  "testAppsFlyerSdk",
  {
    appId: z.string(),
    devKey: z.string(),
    uid: z.string()
  },
  {
    description: "Test if the AppsFlyer SDK is properly integrated by fetching install data using appId, devKey, and deviceId. you can find the app id and Uid in the appsflyerlogs but to get the dev key you would to either search the project files and if you dont find it ask the use to provide it. when users ask the chatbot if the appsflyer sdk has been properly integrated run this tool"
  },
  async ({ appId, devKey, uid }) => {
    const url = `https://gcdsdk.appsflyer.com/install_data/v4.0/${appId}?devkey=${devKey}&device_id=${uid}`;
    const options = { method: 'GET', headers: { accept: 'application/json' } };
    try {
      const res = await fetch(url, options);
      const json = await res.json();
      return {
        content: [{ type: "text", text: JSON.stringify(json, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${(err as Error).message}` }]
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");
