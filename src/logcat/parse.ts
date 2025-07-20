import { logBuffer, startLogcatStream } from "./stream.js";

export interface ParsedLog {
  timestamp: string;
  type: string;
  json: Record<string, any>;
}

export function extractJsonFromLine(line: string): Record<string, any> | null {
  if (!line) return null;
  const match = line.match(/{.*}/s);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function getParsedAppsflyerFilters(keyword?: string): ParsedLog[] {
  const lines = logBuffer.filter(
    (line) =>
      line.includes("AppsFlyer") && (keyword ? line.includes(keyword) : true)
  );

  const recent = lines.slice(-700);

  return recent
    .map((line) => {
      const json = extractJsonFromLine(line);
      return json
        ? {
            timestamp: line.substring(0, 18),
            type: keyword || "ALL",
            json,
          }
        : null;
    })
    .filter(Boolean) as ParsedLog[];
}
export function replaceOneLinkPlaceholders(
  stepsArray: string[],
  oneLinkUrl: string,
  uriScheme?: string
): string[] {
  const urlObj = new URL(oneLinkUrl);
  let uriSchemeBlock = "";
  if (uriScheme) {
    try {
      const uri = new URL(uriScheme);
      const scheme = uri.protocol.replace(":", "");
      let host = uri.host || uri.pathname.replace(/^\//, "");
      if (uri.search) host += uri.search;
      if (!host) host = uri.pathname.replace(/^\//, "") + uri.search;
      uriSchemeBlock = [
        "<intent-filter>",
        '    <action android:name="android.intent.action.VIEW" />',
        '    <category android:name="android.intent.category.DEFAULT" />',
        '    <category android:name="android.intent.category.BROWSABLE" />',
        `    <data android:host=\"${host}\" android:scheme=\"${scheme}\" />`,
        "</intent-filter>",
      ].join("\n");
      uriSchemeBlock = `\nAdd the following <intent-filter> for your uriScheme to your AndroidManifest.xml:\n\n\`\`\`xml\n${uriSchemeBlock}\n\`\`\``;
    } catch {
      uriSchemeBlock = `\n⚠️ Could not parse uriScheme: ${uriScheme}`;
    }
  }
  return stepsArray.map((step) =>
    step
      .replace(
        /https:\/\/onelink-basic-app\.onelink\.me\/H5hv\/apples/g,
        oneLinkUrl
      )
      .replace(/onelink-basic-app\.onelink\.me/g, urlObj.host)
      .replace(/\/H5hv\/apples/g, urlObj.pathname)
      .replace(/he.wikipedia.org/g, urlObj.hostname)
      .replace(/<URISCHEME_INTENT_FILTER>/g, uriSchemeBlock)
  );
}
