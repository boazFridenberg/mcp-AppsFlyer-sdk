#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { startLogcatStream, logBuffer } from "./logcat/stream.js";
import { extractJsonFromLine } from "./logcat/parse.js";
import { getParsedAppsflyerFilters } from "./logcat/parse.js";
import { z } from "zod";
import { descriptions } from "./constants/descriptions.js";
import { intents } from "./constants/intents.js";
import { keywords } from "./constants/keywords.js";
import { steps } from "./constants/steps.js";
import { replaceOneLinkPlaceholders } from "./logcat/parse.js";

import { integrateAppsFlyerSdk } from "./tools/integrateAppsFlyerSdk.js";
import { verifyAppsFlyerSdk } from "./tools/verifyAppsFlyerSdk.js";
import { fetchAppsflyerLogs } from "./tools/fetchAppsFlyerLogs.js";
import { getConversionLogs } from "./tools/getLogsByKeyword.js";
import { getInAppLogs } from "./tools/getLogsByKeyword.js";
import { getLaunchLogs } from "./tools/getLogsByKeyword.js";
import { getDeepLinkLogs } from "./tools/getLogsByKeyword.js";
import { getAppsflyerErrors } from "./tools/getAppsFlyerErrors.js";
import { createAppsFlyerLogEvent } from "./tools/createAppsFlyerLogEvent.js";
import { verifyInAppEvent } from "./tools/verifyInAppEvent.js";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

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

  
server.registerTool(
  "VerifyAppsFlyerDeepLink",
  {
    title: "Verify AppsFlyer Deep Link",
    description: descriptions.VerifyAppsFlyerDeepLink,
    inputSchema: {
      deviceId: z.string().optional(),
    },
    annotations: {
      intent: intents.VerifyAppsFlyerDeepLink,
      keywords: keywords.VerifyAppsFlyerDeepLink,
    },
  },
  async ({ deviceId }) => {
    await startLogcatStream("AppsFlyer_", deviceId);
    const logsText = logBuffer.join("\n");
    if (!logsText || logsText.trim() === "") {
      return {
        content: [
          {
            type: "text",
            text: "⚠️ No logs found. Make sure logcat is streaming.",
          },
        ],
      };
    }

    const logText = logsText;
    const hasActivity = /Starting activity/.test(logText);
    const hasRouting = /navigate|redirect|route to/.test(logText.toLowerCase());
    const hasSpecificDeeplinkValue = /apples|deep_link_value/.test(logText);

    const allFound = hasActivity && hasRouting && hasSpecificDeeplinkValue;

    const summary = allFound
      ? "✅ Deep link seems to have triggered in-app flow (activity start + routing + value found)."
      : [
          "❌ Deep link may not have triggered the app flow.",
          `• Found activity start: ${hasActivity}`,
          `• Found routing/navigation: ${hasRouting}`,
          `• Found deep link value: ${hasSpecificDeeplinkValue}`,
        ].join("\n");

    const deepLinkReport = detectAppsFlyerDeepLink(logText);

    return {
      content: [
        {
          type: "text",
          text: [summary, "", ...deepLinkReport].join("\n\n"),
        },
      ],
    };
  }
);

function detectAppsFlyerDeepLink(logsText: string): string[] {
  const logs = logsText.split("\n");
  const logText = logs.join("\n");

  const isDeferred =
    /is_deferred\s*[:=]\s*true/i.test(logText) ||
    /deferred deep link/i.test(logText);

  const hasOnDeepLinkingSuccess = /onDeepLinking.*SUCCESS/i.test(logText);
  const hasAfDp = /af_dp[=:\"]/i.test(logText);
  const hasAfDeeplinkTrue = /af_deeplink\s*[:=]\s*true/i.test(logText);
  const isDirect = (hasOnDeepLinkingSuccess || hasAfDp || hasAfDeeplinkTrue) && !isDeferred;

  const deeplinkLines = logs.filter((line: string) =>
    /deep_link_value|af_dp|onDeepLinking/i.test(line)
  );

  const deeplinkErrors = logs.filter((line: string) =>
    /onDeepLinking.*FAILURE|error parsing|invalid|deep_link.*null/i.test(line)
  );

  return [
    "🔍 **Deep Link Detection Report:**",
    isDeferred ? "📥 Deferred deep link detected." : "",
    isDirect ? "⚡ Direct deep link detected." : "",
    deeplinkLines.length > 0
      ? `🔗 Found ${deeplinkLines.length} deep link entries:\n${deeplinkLines.join("\n")}`
      : "❌ No deep links found in logs.",
    deeplinkErrors.length > 0
      ? `❗ Found ${deeplinkErrors.length} possible error(s):\n${deeplinkErrors.join("\n")}`
      : "✅ No deep link errors detected.",
  ].filter(Boolean);
}

// Register all tools
integrateAppsFlyerSdk(server);
verifyAppsFlyerSdk(server);
fetchAppsflyerLogs(server);
getConversionLogs(server);
getInAppLogs(server);
getLaunchLogs(server);
getDeepLinkLogs(server);
getAppsflyerErrors(server);
createAppsFlyerLogEvent(server);
verifyInAppEvent(server);


async function startServer() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("MCP server running with stdio transport...");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
