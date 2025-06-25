import { logBuffer } from "./stream.js";

export interface ParsedLog {
  timestamp: string;
  type: string;
  json: Record<string, any>;
}

export function extractJsonFromLine(line: string): Record<string, any> | null {
  const match = line.match(/{.*}/s);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export function getParsedJsonLogs(lineCount: number) {
  if (logBuffer.length === 0) {
    return [];
  }
  const lines = logBuffer.slice(-lineCount);
  const jsonObjects = lines
    .map((line) => {
      const json = extractJsonFromLine(line);
      return json ? { timestamp: line.substring(0, 18), type: line.split(" ")[0], json } : null;
    })
    .filter((log): log is ParsedLog => log !== null);
  return jsonObjects;
}
 
export function getParsedAppsflyerFilters(lineCount: number, keyword: string): ParsedLog[] {
  const lines = logBuffer.filter(
    line => line.includes("AppsFlyer") && line.includes(keyword)
  );

  const recent = lines.slice(-lineCount);

  return recent
    .map(line => {
      const json = extractJsonFromLine(line);
      return json
        ? {
            timestamp: line.substring(0, 18),
            type: keyword,
            json
          }
        : null;
    })
    .filter(Boolean) as ParsedLog[];
}