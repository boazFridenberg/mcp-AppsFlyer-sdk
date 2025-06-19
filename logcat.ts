import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { getAdbPath, validateAdb } from "./adb";

const MAX_LINES = 5000;
const logBuffer: string[] = [];
let logcatProcess: ChildProcessWithoutNullStreams | null = null;

/**
 * Starts adb logcat stream with optional filter tag
 */
export function startLogcatStream(filterTag = "AppsFlyer_6.14.0"): void {
  if (logcatProcess) {
    console.warn("Logcat stream already running.");
    return;
  }

  try {
    const adbPath = getAdbPath();
    validateAdb(adbPath);

    logcatProcess = spawn(adbPath, ["logcat", `${filterTag}:V`, "*:S"]);

    logcatProcess.stdout.setEncoding("utf8");
    logcatProcess.stdout.on("data", (data: string) => {
      const lines = data.split("\n").map(line => line.trim()).filter(Boolean);
      for (const line of lines) {
        logBuffer.push(line);
        if (logBuffer.length > MAX_LINES) logBuffer.shift();
      }
    });

    logcatProcess.stderr.on("data", err => {
      console.error("[Logcat stderr]", err.toString());
    });

    logcatProcess.on("exit", code => {
      console.warn(`Logcat stream exited with code ${code}`);
      logcatProcess = null;
      if (code !== 0) {
        console.log("Attempting to restart logcat stream...");
        try {
          startLogcatStream(filterTag);
        } catch (err) {
          console.error("Failed to restart logcat stream:", err);
        }
      }
    });

    console.log(`Started adb logcat stream with filter: ${filterTag}`);
  } catch (err) {
    logcatProcess = null;
    console.error("Failed to start adb logcat stream:", err);
    throw err;
  }
}

/**
 * Stops adb logcat stream if running
 */
export function stopLogcatStream(): void {
  if (!logcatProcess) {
    console.warn("Logcat stream is not running.");
    return;
  }

  try {
    logcatProcess.kill();
    logcatProcess = null;
    console.log("Stopped adb logcat stream.");
  } catch (err) {
    console.error("Error stopping adb logcat stream:", err);
  }
}

/**
 * Returns the recent log lines from buffer
 */
export function getRecentLogs(lineCount = 100): string {
  return logBuffer.slice(-lineCount).join("\n");
}
