import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { getAdbPath, validateAdb, getConnectedDevices } from "../adb.js";

const MAX_LOG_LINES = 700;
export let logBuffer: string[] = [];
let logcatProcess: ChildProcessWithoutNullStreams | null = null;
let currentDeviceId: string | null = null;

export async function startLogcatStream(
  filterTag = "AppsFlyer_",
  deviceIdParam?: string
): Promise<void> {
  const adbPath = getAdbPath();
  validateAdb(adbPath);
  const devices = getConnectedDevices(adbPath);
  let deviceId = deviceIdParam;
  if (!deviceId) {
    if (devices.length === 0) throw new Error("[Logcat] No devices connected.");
    if (devices.length > 1) throw new Error("[Logcat] Multiple devices found. Specify deviceId.");
    deviceId = devices[0];
  }

  if (logcatProcess) {
    if (deviceId === currentDeviceId) return;
    stopLogcatStream();
  }
  try {
    logcatProcess = spawn(adbPath, ["-s", deviceId, "logcat"]);
    logcatProcess.stdout.setEncoding("utf8");
    currentDeviceId = deviceId;
  } catch (err) {
    throw new Error(`[Logcat] Failed to start logcat: ${err}`);
  }

  logcatProcess.stdout.on("data", (data: string) => {
    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.includes(filterTag));
    if (lines.length === 0) return;
    logBuffer.push(...lines);
    if (logBuffer.length > MAX_LOG_LINES)
      logBuffer.splice(0, logBuffer.length - MAX_LOG_LINES);
  });

  logcatProcess.stderr.on("data", (err) =>
    console.error("[Logcat stderr]", err.toString())
  );

  logcatProcess.on("exit", (code) => {
    logcatProcess = null;
    currentDeviceId = null;
    if (code !== 0) {
      console.error(`[Logcat] Stream exited with code ${code}`);
    }
  });
}

export function stopLogcatStream(): void {
  if (!logcatProcess) return;
  try {
    logcatProcess.kill();
    logcatProcess = null;
    currentDeviceId = null;
    logBuffer = [];
  } catch (err) {
    throw new Error(`[Logcat] Failed to stop stream: ${err}`);
  }
}

export const getRecentLogs = (lines = MAX_LOG_LINES): string =>
  logBuffer.slice(-lines).join("\n");

export function extractParam(logs: string, key: string): string | undefined {
  const lines = logs.split("\n");
  for (const line of lines) {
    try {
      const jsonMatch = line.match(/{.*}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        if (json[key]) return json[key];
      }
    } catch (_) {}
  }
  const regex = new RegExp(`[?&\\s"']${key}["=:\\s]*["']?([\\w\\-.]+)["']?`);
  const match = logs.match(regex);
  return match?.[1];
}

export async function getLogs(lineCount = MAX_LOG_LINES): Promise<string> {
  const adbPath = getAdbPath();
  validateAdb(adbPath);
  const devices = getConnectedDevices(adbPath);
  if (devices.length === 0) throw new Error("No Android devices connected via ADB.");
  const deviceId = devices[0];
  await startLogcatStream("AppsFlyer_", deviceId);
  let waited = 0;
  while (logBuffer.length === 0 && waited < 2000) {
    await new Promise((res) => setTimeout(res, 200));
    waited += 200;
  }
  const logs = getRecentLogs(lineCount);
  stopLogcatStream();
  return logs || "";
}