import { spawn, ChildProcessWithoutNullStreams} from "child_process";
import { getAdbPath, validateAdb, getConnectedDevices } from "../adb.js";

const MAX_LINES = 5000;
const MAX_RESTARTS = 5;
const RESTART_DELAY_MS = 2000;

export let logBuffer: string[] = [];
let logcatProcess: ChildProcessWithoutNullStreams | null = null;
let restartAttempts = 0;

/**
 * Starts adb logcat stream with optional filter tag
 */
export async function startLogcatStream(filterTag = "AppsFlyer_6.14.0"): Promise<void> {
  if (logcatProcess) {
    console.warn("Logcat stream already running.");
    return;
  }

  try {
    const adbPath = getAdbPath();
    validateAdb(adbPath);

    const devices = getConnectedDevices(adbPath);
    if (devices.length === 0) {
      throw new Error("No devices connected to ADB.");
    } else if (devices.length > 1) {
      throw new Error(`Multiple devices connected: ${devices.join(", ")}. Please specify a target.`);
    }

    const deviceId = devices[0];
    logcatProcess = spawn(adbPath, ["-s", deviceId, "logcat", `${filterTag}:V`, "*:S"]);
    logcatProcess.stdout.setEncoding("utf8");

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

      if (code !== 0 && restartAttempts < MAX_RESTARTS) {
        restartAttempts++;
        setTimeout(() => startLogcatStream(filterTag), RESTART_DELAY_MS);
      } else if (restartAttempts >= MAX_RESTARTS) {
        console.error("Max logcat restart attempts reached.");
      } else {
        restartAttempts = 0; // Successful exit
      }
    });

    // reset attempts after successful start
    restartAttempts = 0;

  } catch (err: any) {
    logcatProcess = null;
    const errorMessage = `[Logcat Error] ${err.message || err}`;
    console.error(errorMessage);
    throw new Error(errorMessage); // For chatbot or MCP layer
  }
}

/**
 * Returns recent raw log lines
 */
export function getRecentLogs(lineCount = 100): string {
  return logBuffer.slice(-lineCount).join("\n");
}

/**
 * Graceful shutdown
 */
process.on("exit", () => {
  if (logcatProcess) {
    logcatProcess.kill();
    logcatProcess = null;
  }
});
