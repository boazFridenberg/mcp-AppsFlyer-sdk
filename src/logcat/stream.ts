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
    if (devices.length > 1) {
      throw new Error(
        "[Logcat] Multiple devices found. Specify deviceId. Connected devices:\n" +
        devices.map(id => `- ${id}`).join("\n")
      );
    }    deviceId = devices[0];
  }

  if (logcatProcess) {
    if (deviceId === currentDeviceId) return;
    logBuffer = [];
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
      console.log(`[Logcat] Stream exited with code ${code}`);
    }
  });
}

export function stopLogcatStream(): void {
  if (!logcatProcess) return;
  try {
    logcatProcess.kill();
    logcatProcess = null;
    currentDeviceId = null;
  } catch (err) {
    throw new Error(`[Logcat] Failed to stop stream: ${err}`);
  }
}

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