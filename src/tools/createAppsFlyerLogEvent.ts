import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { descriptions } from "../constants/descriptions.js";
import { intents } from "../constants/intents.js";
import { keywords } from "../constants/keywords.js";

export function createAppsFlyerLogEvent(server: McpServer): void {
  server.registerTool(
    "createAppsFlyerLogEvent",
    {
      title: "Create AppsFlyer Log Event",
      description: descriptions.createAppsFlyerLogEvent,
      inputSchema: {
        eventName: z.string().optional(),
        eventParams: z.record(z.any()).optional(),
        wantsExamples: z.enum(["yes", "no"]).optional(),
        hasListener: z.enum(["yes", "no"]).optional(),
      },
      annotations: {
        intent: intents.createAppsFlyerLogEvent,
        keywords: keywords.createAppsFlyerLogEvent,
      },
    },
    async (args) => {
      const eventName = args.eventName?.trim();
      const eventParams = args.eventParams || {};
      const wantsExamples = args.wantsExamples;
      const hasListener = args.hasListener?.toLowerCase() === "yes";

      const missingName = !eventName;
      const missingParams = Object.keys(eventParams).length === 0;
      const missingValueParams = Object.entries(eventParams)
        .filter(([_, v]) => v === undefined || v === null || v === "")
        .map(([k]) => k);

      if (missingName) {
        return {
          content: [
            {
              type: "text",
              text: "❗ Missing event name. You can use any name you'd like. Please provide an event name to continue.",
            },
          ],
        };
      }

      if (missingParams) {
        return {
          content: [
            {
              type: "text",
              text: "❗ Missing event parameters. Please enter one or more key-value pairs for the event parameters.",
            },
          ],
        };
      }

      if (missingValueParams.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `❗ The following parameters are missing values: ${missingValueParams.join(", ")}. Please complete them.`,
            },
          ],
        };
      }

      if (!wantsExamples) {
        return {
          content: [
            {
              type: "text",
              text: "Would you like to see examples of event names and parameters? (yes/no)",
            },
          ],
        };
      }

      if (wantsExamples === "yes") {
        return {
          content: [
            {
              type: "text",
              text: [
                "**Example event names:**",
                "• af_login",
                "• af_complete_registration",
                "• registration_verified",
                "• submit_account_application",
                "• open_account_success",
                "• open_account_rejected",
                "• submit_credit_card_app",
                "• credit_card_application_success",
                "• credit_card_application_rejected",
                "• credit_card_activation",
                "",
                "**Example parameters:**",
                '• af_registration_method: "email, Facebook"',
                '• account_type: "savings"',
                '• application_method: "app"',
                '• PII_type: "passport"',
                '• credit_card_type: "gold card"',
                '• loan_id: "1735102"',
                '• loan_type: "housing"',
                '• loan_amount: "1000"',
                '• loan_period: "3 months"',
                '• submit_registration: "email, Facebook"',
                "",
                "You may also use your own custom names and parameters if you prefer.",
              ].join("\n"),
            },
          ],
        };
      }

      function generateJavaCode(
        eventName: string,
        eventParams: Record<string, any>,
        includeListener: boolean
      ): string[] {
        const code: string[] = [];
        code.push(
          "Map<String, Object> eventValues = new HashMap<String, Object>();"
        );
        for (const [key, value] of Object.entries(eventParams)) {
          const javaValue = typeof value === "number" ? value : `\"${value}\"`;
          code.push(`eventValues.put(\"${key}\", ${javaValue});`);
        }
        code.push(
          `AppsFlyerLib.getInstance().logEvent(getApplicationContext(), \"${eventName}\", eventValues);`
        );
        if (includeListener) {
          code.push("// Optional: Add AppsFlyerRequestListener if needed");
          code.push(
            "// AppsFlyerLib.getInstance().logEvent(..., new AppsFlyerRequestListener() { ... });"
          );
        }
        return code;
      }

      const codeLines = generateJavaCode(eventName, eventParams, hasListener);

      return {
        content: [
          {
            type: "text",
            text: ["```java", ...codeLines, "```"].join("\n"),
          },
        ],
      };
    }
  );
}
