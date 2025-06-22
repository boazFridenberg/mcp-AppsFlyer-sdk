import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, stopLogcatStream, getRecentLogs } from "./logcat/stream.js";
import { getParsedJsonLogs, getParsedAppsflyerErrors } from "./logcat/parse.js";
import { z } from "zod";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

server.tool("startLogcatStream", {
  filterTag: z.string().optional()
}, async ({ filterTag }) => {
  try {
    startLogcatStream(filterTag);
    return {
      content: [{ type: "text", text: `Logcat started with filter: ${filterTag ?? "AppsFlyer_6.14.0"}` }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${(err as Error).message}` }]
    };
  }
});

server.tool("stopLogcatStream", {}, async () => {
  try {
    stopLogcatStream();
    return {
      content: [{ type: "text", text: "Logcat stopped." }]
    };
  } catch (err) {
    return {
      content: [{ type: "text", text: `Error: ${(err as Error).message}` }]
    };
  }
});

server.tool("fetchAppsflyerLogs", {
  lineCount: z.number().default(100)
}, async ({ lineCount }) => ({
  content: [{ type: "text", text: getRecentLogs(lineCount) }]
}));

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

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MCP server running with stdio transport...");
