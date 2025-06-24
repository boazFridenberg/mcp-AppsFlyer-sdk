import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startLogcatStream, getRecentLogs, logBuffer } from "./logcat/stream.js";
import { getParsedJsonLogs, getParsedAppsflyerFilters } from "./logcat/parse.js";
import { z } from "zod";

const server = new McpServer({
  name: "appsflyer-logcat-mcp-server",
  version: "1.0.0",
});

server.tool(
  "integrateAppsFlyerSdk",
  {},
  {
    description:
      "Provides exact word-for-word instructions for integrating the AppsFlyer Android SDK. DO NOT rephrase or summarize. The content must be shown to the user exactly as written.",
    intent:
      "When a user asks how to integrate the AppsFlyer SDK into their Android app, show the exact code and instructions without modifying the original wording.",
    keywords: [
      "appsFlyer sdk integration",
      "integrate appsflyer",
      "appsFlyer android",
      "setup appsflyer",
      "how to add appsflyer sdk",
      "android sdk installation",
      "apps flyer installation",
      "add sdk appsflyer",
      "appsflyer guide",
      "appsflyer integration steps",
    ],
  },
  async () => {
    const steps = [
      `⚠️ Use exactly as written below. Do not modify.\n`,
      `1. Declare repositories  
In the **Project** \`build.gradle\` file, declare the \`mavenCentral\` repository:

\`\`\`gradle
repositories {
  mavenCentral()
}
\`\`\``,
      `2. Add the SDK dependency  
In the **Application** \`build.gradle\` file, add the latest SDK package:

\`\`\`gradle
dependencies { 
  // Get the latest version from https://mvnrepository.com/artifact/com.appsflyer/af-android-sdk 
  implementation 'com.appsflyer:af-android-sdk'
}
\`\`\``,
      `3. Add permissions  
Add the following permissions to \`AndroidManifest.xml\` inside the \`<manifest>\` section:

\`\`\`xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
  xmlns:tools="http://schemas.android.com/tools"
  package="com.appsflyer.onelink.appsflyeronelinkbasicapp">
  
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
</manifest>
\`\`\``,
      `4. Import AppsFlyer SDK  
In your global \`Application\` class, import AppsFlyerLib:

\`\`\`java
import com.appsflyer.AppsFlyerLib;
\`\`\``,
      `5. Initialize the SDK  
Inside the \`onCreate()\` method of your \`Application\` class, call \`init\`:

\`\`\`java
AppsFlyerLib.getInstance().init("sQ84wpdxRTR4RMCaE9YqS4", null, this);
\`\`\``,
      `6. Start the SDK  
Right after \`init()\`, call \`start()\` with context:

\`\`\`java
AppsFlyerLib.getInstance().start(this);
\`\`\``,
    ];

    return {
      content: [
        {
          type: "text",
          text: steps.join("\n\n"),
        },
      ],
    };
  }
);

server.tool(
  "fetchAppsflyerLogs",
  { lineCount: z.number().default(100) },
  {
    description: "Fetches recent logcat logs related to AppsFlyer. Use this to locate appId and uid (device ID) if they're not known. Use this tool for any request to get, show, or fetch AppsFlyer logs, logcat output, or raw logs.",
    intent: ["get logs", "show logs", "fetch logs", "appsflyer logs", "logcat", "raw logs", "recent logs", "logs"],
    keywords: ["logs", "appsflyer", "logcat", "fetch", "get", "show"]
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
function createLogTool(toolName: string, keyword: string, description: string) {
  server.tool(
    toolName,
    { lineCount: z.number().optional().default(50) },
    { description },
    async ({ lineCount }) => {
      const logs = getParsedAppsflyerFilters(lineCount, keyword);
      return {
        content: [
          {
            type: "text",
            text: logs.length
              ? JSON.stringify(logs, null, 2)
              : `No log entries found for keyword: ${keyword}`
          }
        ]
      };
    }
  );
}
createLogTool("getConversionLogs", "CONVERSION-", "Extracts conversion logs from logcat. Useful for verifying successful install/conversion events via AppsFlyer.");
createLogTool("getInAppLogs", "INAPP-", "Returns in-app event logs captured by AppsFlyer. Use this to confirm event tracking works correctly.");
createLogTool("getLaunchLogs", "LAUNCH-", "Parses app launch events from logcat. Helpful when debugging first opens or session tracking via AppsFlyer.");
createLogTool("getDeepLinkLogs", "deepLink", "Extracts deep link-related logs from logcat. Use to verify if deep links are being detected and handled by the SDK.");

server.tool(
  "getAppsflyerErrors",
  { lineCount: z.number().optional().default(50) },
  {
    description: "Scans logcat for common AppsFlyer errors (e.g., exceptions, failures). Use this tool to detect SDK-related issues."
  },
  async ({ lineCount }) => {
    const keywords = ["FAILURE", "ERROR", "Exception", "No deep link"];
    const errors = keywords.flatMap(keyword => getParsedAppsflyerFilters(lineCount, keyword));
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