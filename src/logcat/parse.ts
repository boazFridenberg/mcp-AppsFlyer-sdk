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
    line => line.includes("AppsFlyer") && (keyword ? line.includes(keyword) : true)
  );

  const recent = lines.slice(-700);

  return recent
    .map(line => {
      const json = extractJsonFromLine(line);
      return json
        ? {
            timestamp: line.substring(0, 18),
            type: keyword || "ALL",
            json
          }
        : null;
    })
    .filter(Boolean) as ParsedLog[];
}

export type DeepLinkSource = "UDL" | "DDL";

export type DeepLinkInfo = {
  found: boolean;
  source: DeepLinkSource | null;
  isDeferred: boolean;
  status: string | null;
  deepLinkValue: string | null;
  referrerId: string | null;
  error: string | null;
};

export function extractAppsflyerDeeplinkInfo(logs: string[]): DeepLinkInfo {
  const result: DeepLinkInfo = {
    found: false,
    source: null,
    isDeferred: false,
    status: null,
    deepLinkValue: null,
    referrerId: null,
    error: null,
  };

  for (const line of logs) {
    if (line.includes("Calling onDeepLinking with:")) {
      result.source = "UDL";
      result.found = true;
      const jsonMatch = line.match(/\{.*\}$/);
      if (jsonMatch) {
        try {
          const outer = JSON.parse(jsonMatch[0]);
          const inner = JSON.parse(outer.deepLink);
          result.status = outer.status ?? null;
          result.isDeferred = !!inner.is_deferred;
          result.deepLinkValue = inner.deep_link_value ?? null;
          result.referrerId = inner.deep_link_sub1 ?? null;
        } catch (err) {
          result.error = "Failed to parse deepLink JSON";
        }
      }
    }

    if (line.includes("Conversion attribute:")) {
      result.source = "DDL";
      result.found = true;
      if (line.includes("deep_link_value")) {
        result.deepLinkValue = extractValue(line);
      }
      if (line.includes("fruit_name") && !result.deepLinkValue) {
        result.deepLinkValue = extractValue(line);
      }
      if (line.includes("deep_link_sub1")) {
        result.referrerId = extractValue(line);
      }
    }
  }

  if (result.found && !result.source) {
    result.source = "DDL";
  }

  return result;
}

function extractValue(line: string): string | null {
  const match = line.match(/[:=] (.+)$/);
  return match ? match[1].trim() : null;
}
