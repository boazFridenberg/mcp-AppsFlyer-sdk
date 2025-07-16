import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getParsedAppsflyerFilters } from "../logcat/parse.js";
import { descriptions } from "../constants/descriptions.js";
import { intents } from "../constants/intents.js";
import { keywords } from "../constants/keywords.js";

export function getAppsflyerErrors(server: McpServer): void {
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
    async ({}) => {
      const errorKeywords = keywords.getAppsflyerErrors;
      const errors = errorKeywords.flatMap((keyword) =>
        getParsedAppsflyerFilters(keyword)
      );
      return {
        content: [{ type: "text", text: JSON.stringify(errors, null, 2) }],
      };
    }
  );
}
