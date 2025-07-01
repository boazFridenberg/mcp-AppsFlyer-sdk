import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { getAdbPath, validateAdb, getConnectedDevices } from "../adb.js";

const MAX_LINES = 5000;
const MAX_RESTARTS = 5;
const RESTART_DELAY_MS = 2000;

export let logBuffer: string[] = [];
let logcatProcess: ChildProcessWithoutNullStreams | null = null;
let restartAttempts = 0;
let currentDeviceId: string | null = null;

export async function startLogcatStream(
  filterTag = "AppsFlyer_", // נשאיר את הפרמטר למקרה שתרצה בעתיד
  deviceIdParam?: string
): Promise<void> {
  const adbPath = getAdbPath();
  validateAdb(adbPath);
  const devices = getConnectedDevices(adbPath);

  const deviceId =
    deviceIdParam ||
    (() => {
      if (devices.length === 0)
        throw new Error("[Logcat] No devices connected.");
      if (devices.length > 1)
        throw new Error("[Logcat] Multiple devices found. Specify deviceId.");
      return devices[0];
    })();

  if (logcatProcess) {
    if (deviceId === currentDeviceId)
      return console.warn("[Logcat] Already streaming this device.");
    stopLogcatStream();
    console.warn(`[Logcat] Switching to device: ${deviceId}`);
  }
  logcatProcess = spawn(adbPath, ["-s", deviceId, "logcat"]);
  logcatProcess.stdout.setEncoding("utf8");
  currentDeviceId = deviceId;

  logcatProcess.stdout.on("data", (data: string) => {
    const lines = data
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => line.includes("AppsFlyer_"));

    if (lines.length === 0) return;

    logBuffer.push(...lines);
    if (logBuffer.length > MAX_LINES)
      logBuffer.splice(0, logBuffer.length - MAX_LINES);
  });

  logcatProcess.stderr.on("data", (err) =>
    console.error("[Logcat stderr]", err.toString())
  );

  logcatProcess.on("exit", (code) => {
    console.warn(`[Logcat] Stream exited (${code})`);
    logcatProcess = null;
    currentDeviceId = null;

    if (code !== 0 && restartAttempts++ < MAX_RESTARTS) {
      console.warn(`[Logcat] Restarting (attempt ${restartAttempts})...`);
      setTimeout(
        () => startLogcatStream(filterTag, deviceId),
        RESTART_DELAY_MS
      );
    } else if (restartAttempts >= MAX_RESTARTS) {
      console.error("[Logcat] Max restart attempts reached.");
    } else {
      restartAttempts = 0;
    }
  });

  restartAttempts = 0;
}


export function stopLogcatStream(): void {
  if (!logcatProcess) return console.warn("[Logcat] No active stream.");
  try {
    logcatProcess.kill();
    logcatProcess = null;
    currentDeviceId = null;
    logBuffer = [];
    console.log("[Logcat] Stream stopped.");
  } catch (err) {
    console.error("[Logcat] Failed to stop stream:", err);
  }
}

export const getRecentLogs = (lines = 100): string =>
  logBuffer.slice(-lines).join("\n");

export const getCurrentDeviceId = (): string | null => currentDeviceId;

export const isStreaming = (): boolean => !!logcatProcess;

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

export async function getLogs(lineCount = 300): Promise<string> {
  const adbPath = getAdbPath();
  validateAdb(adbPath);
  const devices = getConnectedDevices(adbPath);

  if (devices.length === 0) {
    throw new Error("No Android devices connected via ADB.");
  }

  const deviceId = devices[0]; // אם יש כמה – כרגע ניקח את הראשון

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