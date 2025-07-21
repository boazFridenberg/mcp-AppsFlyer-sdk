import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createLogTool } from "./logToolFactory.js";

export function verifyDeepLink(server: McpServer): void {
  createLogTool(server, "verifyDeepLink", "deepLink");
}
