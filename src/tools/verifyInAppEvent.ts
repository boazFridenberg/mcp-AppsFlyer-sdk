import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { logBuffer } from "../logcat/stream.js";
import { descriptions } from "../constants/descriptions.js";
import { intents } from "../constants/intents.js";
import { keywords } from "../constants/keywords.js";

export function verifyInAppEvent(server: McpServer): void {
  server.registerTool(
    "verifyInAppEvent",
    {
      title: "Verify In-App Event",
      description: descriptions.verifyInAppEvent,
      annotations: {
        intent: intents.verifyInAppEvent,
        keywords: keywords.verifyInAppEvent,
      },
      inputSchema: {
        eventName: z.string({
          required_error:
            "Please provide the name of the in-app event you want to verify",
        }),
      },
    },
    async function verifyInAppEventHandler({ eventName }) {
      const logLines = logBuffer;
      let foundEvent = false;
      let foundEventValue = false;
      let foundEndpoint = false;

      for (const line of logLines) {
        try {
          const json = JSON.parse(line);
          if (json.event === eventName) {
            foundEvent = true;
            if (
              json.eventvalue &&
              typeof json.eventvalue === "object" &&
              Object.keys(json.eventvalue).length > 0
            ) {
              foundEventValue = true;
            }
            if (line.includes("androidevent?app_id=")) {
              foundEndpoint = true;
            }
          }
        } catch {
          continue;
        }
      }

      const allPresent = foundEvent && foundEventValue && foundEndpoint;
      return {
        content: [
          {
            type: "text",
            text: allPresent
              ? `✅ Event \`${eventName}\` was successfully logged with full details.`
              : `❌ The event \`${eventName}\` may not have been logged correctly. Results:\n- Found Event: ${foundEvent}\n- Found Event Value: ${foundEventValue}\n- Found Endpoint: ${foundEndpoint}`,
          },
          ...(allPresent
            ? [
                {
                  type: "text",
                  text: `✅ Event \`${eventName}\` created successfully!`,
                },
              ]
            : []),
        ],
      } as {
        [x: string]: unknown;
        content: {
          type: "text";
          text: string;
          _meta?: { [x: string]: unknown };
        }[];
      };
    }
  );
}
