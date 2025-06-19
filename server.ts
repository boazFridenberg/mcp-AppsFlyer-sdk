import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, stopLogcatStream, getRecentLogs } from "./logcat";
import { z } from "zod";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

/**
 * Starts the adb logcat stream filtered by the given tag.
 * Useful to initiate real-time log capturing from Android devices/emulators.
 */
server.tool(
  "startLogcatStream",
  {
    filterTag: z
      .string()
      .optional()
      .describe("ADB logcat filter tag to capture specific app/component logs, e.g. 'AppsFlyer_6.14.0'. Defaults to this value if omitted."),
  },
  async ({ filterTag }) => {
    try {
      startLogcatStream(filterTag);
      return {
        content: [
          {
            type: "text",
            text: `Logcat stream started with filter: ${filterTag ?? "AppsFlyer_6.14.0"}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error starting logcat stream: ${(err as Error).message}`,
          },
        ],
      };
    }
  }
);

/**
 * Stops the currently running adb logcat stream.
 * Useful to release resources when log capturing is no longer needed.
 */
server.tool(
  "stopLogcatStream",
  {},
  async () => {
    try {
      stopLogcatStream();
      return {
        content: [
          {
            type: "text",
            text: "Logcat stream stopped successfully.",
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error stopping logcat stream: ${(err as Error).message}`,
          },
        ],
      };
    }
  }
);

/**
 * Fetches the most recent logs captured from adb logcat.
 * @param lineCount Number of recent log lines to retrieve (default: 100)
 */
server.tool(
  "fetchAppsflyerLogs",
  {
    lineCount: z
      .number()
      .default(100)
      .describe("Number of recent log lines to fetch from the log buffer. Defaults to 100."),
  },
  async ({ lineCount }) => {
    try {
      const logs = getRecentLogs(lineCount);
      return {
        content: [
          {
            type: "text",
            text: logs || "No logs available yet.",
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching logs: ${(err as Error).message}`,
          },
        ],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);

console.log("MCP server running with stdio transport...");
