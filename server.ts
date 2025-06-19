import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, getRecentLogs } from "./logcat";
import { z } from "zod";

// Start logcat stream
startLogcatStream();

const server = new McpServer({
  name: "appsflyer-logcat-server",
  version: "1.0.0"
});

// Tool: fetchAppsflyerLogs
server.tool(
  "fetchAppsflyerLogs",
  {
    lineCount: z.number().default(100).describe("Number of log lines to fetch")
  },
  async ({ lineCount = 100 }) => ({
    content: [{ type: "text", text: getRecentLogs(lineCount) }]
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log("MCP server running (stdio transport)...");