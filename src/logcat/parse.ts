import { logBuffer } from "./stream.js";
import { z } from "zod";

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

function parseLinesWithJson(lines: string[], type: string): ParsedLog[] {
  return lines
    .map(line => {
      const json = extractJsonFromLine(line);
      return json ? { timestamp: line.substring(0, 18), type, json } : null;
    })
    .filter((log): log is ParsedLog => log !== null);
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
 
export function getParsedAppsflyerErrors(lineCount: number, keyword: string): ParsedLog[] {
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


