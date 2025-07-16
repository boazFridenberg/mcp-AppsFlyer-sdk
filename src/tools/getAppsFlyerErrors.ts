import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { startLogcatStream } from "../logcat/stream.js";
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
    async ({ deviceId }) => {
      try {
        // Start streaming logs filtered by AppsFlyer prefix
        await startLogcatStream("AppsFlyer_", deviceId);

        // Wait up to 2 seconds or until logs appear in buffer
        let waited = 0;
        while (waited < 2000 && getParsedAppsflyerFilters("").length === 0) {
          await new Promise((res) => setTimeout(res, 200));
          waited += 200;
        }

        const errorKeywords = keywords.getAppsflyerErrors;
        const errors = errorKeywords.flatMap((keyword) =>
          getParsedAppsflyerFilters(keyword)
        );

        return {
          content: [
            {
              type: "text",
              text: errors.length
                ? JSON.stringify(errors, null, 2)
                : "[No AppsFlyer error logs found in the last few seconds.]",
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `[Error fetching AppsFlyer error logs] ${err.message || err}`,
            },
          ],
        };
      }
    }
  );
}
