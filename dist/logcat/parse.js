import { logBuffer } from "./stream.js";
import { z } from "zod";
export function extractJsonFromLine(line) {
    const match = line.match(/{.*}/s);
    if (!match)
        return null;
    try {
        return JSON.parse(match[0]);
    }
    catch {
        return null;
    }
}
function parseLinesWithJson(lines, type) {
    return lines
        .map(line => {
        const json = extractJsonFromLine(line);
        return json ? { timestamp: line.substring(0, 18), type, json } : null;
    })
        .filter((log) => log !== null);
}
export function getParsedJsonLogs(lineCount) {
    if (logBuffer.length === 0) {
        return [];
    }
    const lines = logBuffer.slice(-lineCount);
    const jsonObjects = lines
        .map((line) => {
        const json = extractJsonFromLine(line);
        return json ? { timestamp: line.substring(0, 18), type: line.split(" ")[0], json } : null;
    })
        .filter((log) => log !== null);
    return jsonObjects;
}
export function getParsedAppsflyerErrors(lineCount, type) {
    if (logBuffer.length === 0) {
        return [];
    }
    const lines = logBuffer.filter((line) => line.includes(type)).slice(-lineCount);
    return lines;
}
export function getRecentLogs(lineCount, type) {
    if (logBuffer.length === 0) {
        return [];
    }
    return logBuffer
        .filter((line) => z.string().min(1).optional().parse(line?.includes(type)))
        .slice(-lineCount);
}
