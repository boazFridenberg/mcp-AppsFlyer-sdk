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
  filterTag = "AppsFlyer_6.14.0",
  deviceIdParam?: string
): Promise<void> {
  const adbPath = getAdbPath();
  validateAdb(adbPath);

  const devices = getConnectedDevices(adbPath);
  let deviceId = deviceIdParam;

  if (!deviceId) {
    if (devices.length === 0) {
      throw new Error("[Logcat] No devices connected to ADB.");
    } else if (devices.length > 1) {
      throw new Error("[Logcat] Multiple devices connected. Specify deviceId.");
    } else {
      deviceId = devices[0];
    }
  }

  // Efficient restart logic
  if (logcatProcess) {
    if (deviceId === currentDeviceId) {
      console.warn("[Logcat] Stream already running for this device.");
      return;
    } else {
      console.warn(`[Logcat] Restarting stream for new device: ${deviceId}`);
      stopLogcatStream();
    }
  }

  logcatProcess = spawn(adbPath, ["-s", deviceId, "logcat", `${filterTag}:V`, "*:S"]);
  logcatProcess.stdout.setEncoding("utf8");
  currentDeviceId = deviceId;

  logcatProcess.stdout.on("data", (data: string) => {
    const lines = data.split("\n").map(line => line.trim()).filter(Boolean);
    logBuffer.push(...lines);
    if (logBuffer.length > MAX_LINES) {
      logBuffer.splice(0, logBuffer.length - MAX_LINES);
    }
  });

  logcatProcess.stderr.on("data", err => {
    console.error("[Logcat stderr]", err.toString());
  });

  logcatProcess.on("exit", code => {
    console.warn(`Logcat stream exited with code ${code}`);
    logcatProcess = null;
    currentDeviceId = null;

    if (code !== 0 && restartAttempts < MAX_RESTARTS) {
      restartAttempts++;
      console.warn(`[Logcat] Restarting logcat stream (attempt ${restartAttempts})...`);
      setTimeout(() => startLogcatStream(filterTag, deviceId), RESTART_DELAY_MS);
    } else if (restartAttempts >= MAX_RESTARTS) {
      console.error("Max logcat restart attempts reached.");
    } else {
      restartAttempts = 0;
    }
  });

  restartAttempts = 0;
}

export function stopLogcatStream(): void {
  if (!logcatProcess) {
    console.warn("Logcat stream is not running.");
    return;
  }
  try {
    logcatProcess.kill();
    logcatProcess = null;
    currentDeviceId = null;
    console.log("Stopped adb logcat stream.");
  } catch (err) {
    console.error("Error stopping adb logcat stream:", err);
  }
}

export function getRecentLogs(lineCount = 100): string {
  return logBuffer.slice(-lineCount).join("\n");
}

export function getCurrentDeviceId(): string | null {
  return currentDeviceId;
}

export function isStreaming(): boolean {
  return logcatProcess !== null;
}
