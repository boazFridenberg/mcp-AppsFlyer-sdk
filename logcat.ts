import { spawn, ChildProcessWithoutNullStreams } from "child_process";

// Buffer config
const MAX_LINES = 5000;
const logBuffer: string[] = [];
const tag = "AppsFlyer_6.14.0"; // example: "MainActivity"

let logcatProcess: ChildProcessWithoutNullStreams | null = null;

/**
 * Start streaming logs from adb logcat
 */
export function startLogcatStream(): void {
  if (logcatProcess) {
    console.log("Logcat already running.");
    return;
  }

  console.log("Starting adb logcat stream...");
  logcatProcess = spawn("adb", ["logcat", `${tag}:V`, "*:S"]);
  
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
    console.warn(`Logcat process exited with code ${code}`);
    logcatProcess = null;
  });
}

/**
 * Stop logcat stream
 */
export function stopLogcatStream(): void {
  if (logcatProcess) {
    console.log("Stopping logcat stream...");
    logcatProcess.kill();
    logcatProcess = null;
  }
}

/**
 * Returns the latest N lines of logcat output
 * @param lineCount number of lines to return (default: 100)
 */
export function getRecentLogs(lineCount: number = 100): string {
  return logBuffer.slice(-lineCount).join("\n");
}