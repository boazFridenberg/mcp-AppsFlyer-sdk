import { spawn } from "child_process";

/**
 * Run adb logcat and collect lines.
 */
export async function runAdbLogcat(
  deviceId?: string,
  filter?: string
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const args = [];
    if (deviceId) args.push("-s", deviceId);
    args.push("logcat", "-v", "time");

    if (filter) args.push(filter);

    const adb = spawn("adb", args);
    const lines: string[] = [];
    let resolved = false;

    adb.stdout.on("data", (data) => {
      const text = data.toString();
      lines.push(...text.split("\n").filter(Boolean));
    });

    adb.stderr.on("data", (data) => {
      const errMsg = data.toString();
      if (!resolved) {
        resolved = true;
        reject(new Error(`ADB error: ${errMsg}`));
      }
    });

    adb.on("close", () => {
      if (!resolved) {
        resolved = true;
        resolve(lines);
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        adb.kill("SIGINT");
        resolve(lines);
      }
    }, 2000);
  });
}

/**
 * Extract PID from a logcat line.
 */
export function extractPidFromLogLine(line: string): number | null {
  const match = line.match(/\(\s*(\d+)\)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Filter logs to only include lines with given PID.
 */
export function filterLogsByPid(lines: string[], pid: number): string[] {
  return lines.filter((line) => extractPidFromLogLine(line) === pid);
}

/**
 * Return list of connected ADB device IDs.
 */
export async function getConnectedDeviceIds(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const adb = spawn("adb", ["devices"]);

    const output: string[] = [];

    adb.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        const match = line.match(/^([^\s]+)\s+device$/);
        if (match) output.push(match[1]);
      }
    });

    adb.stderr.on("data", (data) => {
      reject(new Error(`ADB error: ${data.toString()}`));
    });

    adb.on("close", () => resolve(output));
  });
}
