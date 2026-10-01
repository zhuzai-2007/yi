import { existsSync } from "node:fs";
import { chromium } from "@playwright/test";
export function browserExecutable() {
  const candidates = process.env.BROWSER_PATH
    ? [process.env.BROWSER_PATH]
    : [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/opt/google/chrome/chrome",
        chromium.executablePath(),
      ];
  const executable = candidates.find(existsSync);
  if (!executable)
    throw new Error(
      "No installed Chrome/Chromium found; set BROWSER_PATH. No browser is downloaded.",
    );
  return executable;
}
