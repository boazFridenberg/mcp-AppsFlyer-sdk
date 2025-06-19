import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Returns absolute path to adb binary based on OS platform
 */
export function getAdbPath(): string {
  const platform = os.platform();

  if (platform === "win32") {
    return path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", "adb.exe");
  } else if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Android", "sdk", "platform-tools", "adb");
  } else if (platform === "linux") {
    return path.join(os.homedir(), "Android", "Sdk", "platform-tools", "adb");
  } else {
    throw new Error("Unsupported OS platform for adb");
  }
}

/**
 * Validates adb binary existence and execution permission
 */
export function validateAdb(adbPath: string): void {
  if (!fs.existsSync(adbPath)) {
    throw new Error(`ADB binary not found at path: ${adbPath}`);
  }
  try {
    fs.accessSync(adbPath, fs.constants.X_OK);
  } catch {
    throw new Error(`ADB binary is not executable: ${adbPath}`);
  }
}
