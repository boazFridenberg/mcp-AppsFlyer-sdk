import {runAdbLogcat,extractPidFromLogLine, filterLogsByPid, getConnectedDeviceIds} from "./adb.js";

export let logBuffer: string[] = [];

/**
 * Fetch logs filtered by prefix and by latest AppsFlyer process PID.
 */
export async function startLogcatStream(
  prefix: string,
  deviceId?: string
): Promise<void> {
  const connectedDevices = await getConnectedDeviceIds();

  if (!deviceId) {
    if (connectedDevices.length === 0) {
      throw new Error("❌ No connected Android devices found.");
    }
    if (connectedDevices.length > 1) {
      throw new Error(
        `❌ Multiple devices connected. Please specify a deviceId.\nConnected devices:\n${connectedDevices.join(
          "\n"
        )}`
      );
    }
    deviceId = connectedDevices[0];
  }

  // 1. Get raw logs filtered by prefix
  const allLogs = await runAdbLogcat(deviceId, prefix);

  // 2. Find last AppsFlyer log line and extract PID
  let latestPid: number | null = null;
  for (let i = allLogs.length - 1; i >= 0; i--) {
    const line = allLogs[i];
    if (line.includes(prefix)) {
      const pid = extractPidFromLogLine(line);
      if (pid !== null) {
        latestPid = pid;
        break;
      }
    }
  }

  if (latestPid === null) {
    logBuffer = allLogs;
    return;
  }

  // 3. Filter logs by PID
  const filtered = filterLogsByPid(allLogs, latestPid);

  // 4. Update global buffer
  logBuffer = filtered;
}
