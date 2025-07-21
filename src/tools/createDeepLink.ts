import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { descriptions } from "../constants/descriptions.js";
import { intents } from "../constants/intents.js";
import { keywords } from "../constants/keywords.js";
import { steps } from "../constants/steps.js";

export function verifyDeepLink(server: McpServer) {
  server.registerTool(
    "createDeepLink",
  {
    title: "AppsFlyer OneLink Deep Link Setup Prompt",
    description: descriptions.createDeepLink,
    inputSchema: {
      oneLinkUrl: z.string().url(),
      uriScheme: z.string().optional(),
      isDirect: z.boolean().optional(),
    },
    annotations: {
      intent: intents.createDeepLink,
      keywords: keywords.createDeepLink,
    },
  },
  async (args) => {
    if (!args.oneLinkUrl) {
      return {
        content: [{ type: "text", text: "Please enter your OneLink URL to get customized instructions." }],
      };
    }

    const mode = args.isDirect === false ? "deferred" : "direct";

    return {
      content: [
        {
          type: "text",
          text: (steps.createDeepLink(args.uriScheme != null, mode === "direct") ?? []).join('\n\n'),
        },
      ],
    };
    }
  );
}
