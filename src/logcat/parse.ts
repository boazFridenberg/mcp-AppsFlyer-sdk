/**
 * Attempts to parse JSON embedded inside a log line (if any).
 * Assumes JSON object is at end of line or inside brackets.
 */
export function extractJsonFromLine(line: string): Record<string, any> | null {
  const jsonMatch = line.match(/\{.*\}$/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Returns logs with JSON filtered by keyword prefix in the log message.
 * Looks inside logBuffer, extracts JSON, and matches keyword.
 */
import { logBuffer } from "./stream.js";

export function getParsedAppsflyerFilters(
  keyword: string
): { line: string; json: Record<string, any>; timestamp: string }[] {
  return logBuffer
    .filter(line => line.includes(keyword))
    .map(line => {
      const json = extractJsonFromLine(line);
      return json
        ? {
            line,
            json,
            timestamp: line.substring(0, 18)
          }
        : null;
    })
    .filter(Boolean) as { line: string; json: Record<string, any>; timestamp: string }[];
}

export function replaceOneLinkPlaceholders(stepsArray: string[], oneLinkUrl: string, uriScheme?: string): string[] {
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
        "    <action android:name=\"android.intent.action.VIEW\" />",
        "    <category android:name=\"android.intent.category.DEFAULT\" />",
        "    <category android:name=\"android.intent.category.BROWSABLE\" />",
        `    <data android:host=\"${host}\" android:scheme=\"${scheme}\" />`,
        "</intent-filter>",
      ].join("\n");
      uriSchemeBlock = `\nAdd the following <intent-filter> for your uriScheme to your AndroidManifest.xml:\n\n\`\`\`xml\n${uriSchemeBlock}\n\`\`\``;
    } catch {
      uriSchemeBlock = `\n⚠️ Could not parse uriScheme: ${uriScheme}`;
    }
  }
  return stepsArray.map(step =>
    step
      .replace(/https:\/\/onelink-basic-app\.onelink\.me\/H5hv\/apples/g, oneLinkUrl)
      .replace(/onelink-basic-app\.onelink\.me/g, urlObj.host)
      .replace(/\/H5hv\/apples/g, urlObj.pathname)
      .replace(/he.wikipedia.org/g, urlObj.hostname)
      .replace(/<URISCHEME_INTENT_FILTER>/g, uriSchemeBlock)
  );
}
