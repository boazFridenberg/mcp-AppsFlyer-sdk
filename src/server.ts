import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, stopLogcatStream, getRecentLogs } from "./logcat/stream.js";
import { getParsedJsonLogs, getParsedAppsflyerErrors } from "./logcat/parse.js";
import { z } from "zod";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

server.tool(
  "fetchAppsflyerLogs",
  { lineCount: z.number().default(100) },
  {
    description: "Fetches recent logcat logs related to AppsFlyer. Use this to locate appId and uid (device ID) if they're not known."
  },
  async ({ lineCount }) => {
    startLogcatStream("AppsFlyer_6.14.0");
    // Wait for logs to appear if buffer is empty (max 2s, check every 200ms)
    let waited = 0;
    while (logBuffer.length === 0 && waited < 2000) {
      await new Promise(res => setTimeout(res, 200));
      waited += 200;
    }
    return {
      content: [{ type: "text", text: getRecentLogs(lineCount) }]
    };
  }
);

server.tool(
  "getConversionLogs",
  { lineCount: z.number().optional().default(50) },
  {
    description: "Extracts and returns conversion-related logs from recent logcat output. Useful for verifying conversion events from AppsFlyer."
  },
  async ({ lineCount }) => ({
    content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
  })
);

server.tool(
  "getInAppLogs",
  { lineCount: z.number().optional().default(50) },
  {
    description: "Returns logs related to in-app events tracked by AppsFlyer. Use this to confirm if in-app events are firing as expected."
  },
  async ({ lineCount }) => ({
    content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
  })
);

server.tool(
  "getLaunchLogs",
  { lineCount: z.number().optional().default(50) },
  {
    description: "Parses logcat for app launch logs tied to AppsFlyer. Use when investigating whether the SDK detects app launches."
  },
  async ({ lineCount }) => ({
    content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
  })
);

server.tool(
  "getDeepLinkLogs",
  { lineCount: z.number().optional().default(50) },
  {
    description: "Extracts logs related to deep linking via AppsFlyer. Use to debug whether deep links are being handled and parsed properly."
  },
  async ({ lineCount }) => ({
    content: [{ type: "text", text: JSON.stringify(getParsedJsonLogs(lineCount), null, 2) }]
  })
);

server.tool(
  "getAppsflyerErrors",
  { lineCount: z.number().optional().default(50) },
  {
    description: "Scans logcat for common AppsFlyer errors (e.g., exceptions, failures). Use this tool to detect SDK-related issues."
  },
  async ({ lineCount }) => {
    const keywords = ["FAILURE", "ERROR", "Exception", "No deep link"];
    const errors = keywords.flatMap(keyword => getParsedLogsByKeyword(lineCount, keyword));
    return {
      content: [{ type: "text", text: JSON.stringify(errors, null, 2) }]     
    };
  }
);

server.tool(
  "testAppsFlyerSdk",
  {
    appId: z.string(),
    devKey: z.string(),
    uid: z.string()
  },
  {
    description: "Tests whether the AppsFlyer SDK is integrated correctly by querying install data using appId, devKey, and device ID (uid). To find appId and uid, run 'fetchAppsflyerLogs'. Dev key may be found in source code or should be requested from the user. When users ask if the AppsFlyer SDK is working, run this tool."
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