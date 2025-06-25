import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { execFileSync } from "child_process";

/**
 * Returns absolute path to adb binary based on OS platform
 */
export function getAdbPath(): string {
  const platform = os.platform();
  const home = os.homedir();

  if (platform === "win32") {
    return path.join(home, "AppData", "Local", "Android", "Sdk", "platform-tools", "adb.exe");
  } else if (platform === "darwin") {
    return path.join(home, "Library", "Android", "sdk", "platform-tools", "adb");
  } else if (platform === "linux") {
    return path.join(home, "Android", "Sdk", "platform-tools", "adb");
  } else {
    throw new Error(`Unsupported OS platform for ADB: ${platform}`);
  }
}

/**
 * Validates adb binary existence and execution permission
 */
export function validateAdb(adbPath: string): void {
  const resolvedPath = fs.realpathSync(adbPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`ADB binary not found at: ${resolvedPath}`);
  }
  try {
    fs.accessSync(resolvedPath, fs.constants.X_OK);
  } catch {
    throw new Error(`ADB binary is not executable: ${resolvedPath}`);
  }
}

/**
 * Returns list of connected device IDs
 */
export function getConnectedDevices(adbPath: string): string[] {
  try {
    const output = execFileSync(adbPath, ["devices"], { encoding: "utf8" });
    const lines = output.split("\n").slice(1); // Skip the header line
    return lines
      .map(line => line.trim())
      .filter(line => line && line.includes("device") && !line.includes("offline"))
      .map(line => line.split("\t")[0]);
  } catch (err: any) {
    throw new Error(`Failed to retrieve connected devices: ${err.message || err}`);
  }
}
