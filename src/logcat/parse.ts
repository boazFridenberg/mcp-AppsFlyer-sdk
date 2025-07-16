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
  const results = [];

  for (const line of logBuffer) {
    if (!line.includes(keyword)) continue;

    const json = extractJsonFromLine(line);
    if (json) {
      // Extract timestamp (start of line format "MM-DD HH:mm:ss.SSS")
      const timestampMatch = line.match(/^\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/);
      const timestamp = timestampMatch ? timestampMatch[0] : "";

      results.push({ line, json, timestamp });
    }
  }

  return results;
}
