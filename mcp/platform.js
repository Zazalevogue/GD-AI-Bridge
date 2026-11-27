// Cross-platform helpers: where the save file lives, whether the game runs, where to export.
// Everything here can be overridden by environment variables, so nothing depends on a guessed path.
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

export const SAVE_FILE_NAME = "CCLocalLevels.dat";

// Default save directory per OS. Windows is the historical, verified location. The macOS path
// (~/Library/Application Support/GeometryDash) is the conventional one but has NOT been verified
// on a real GD 2.2091 install by this project: GD_SAVE_PATH always wins, and a missing file
// produces an explicit error asking for it.
export function defaultSavePath(env = process.env, platform = process.platform, home = os.homedir()) {
  if (platform === "win32") return path.join(env.LOCALAPPDATA ?? "", "GeometryDash", SAVE_FILE_NAME);
  if (platform === "darwin") return path.join(home, "Library", "Application Support", "GeometryDash", SAVE_FILE_NAME);
  return null; // Linux/Wine/other: no safe default
}

export function resolveSavePath(env = process.env, platform = process.platform, home = os.homedir()) {
  if (env.GD_SAVE_PATH) return path.resolve(env.GD_SAVE_PATH);
  const def = defaultSavePath(env, platform, home);
  if (!def) throw new Error("No default save location on this OS. Set GD_SAVE_PATH to the full path of CCLocalLevels.dat.");
  return def;
}

export function desktopDir(env = process.env, platform = process.platform, home = os.homedir()) {
  if (platform === "win32") return path.join(env.USERPROFILE ?? home, "Desktop");
  return path.join(home, "Desktop");
}

// Is Geometry Dash running? `run` is injectable for tests.
export function isGameRunning(platform = process.platform, run = (cmd, args) => execFileSync(cmd, args, { encoding: "utf8" })) {
  try {
    if (platform === "win32") {
      return run("tasklist", ["/FI", "IMAGENAME eq GeometryDash.exe", "/NH"]).toLowerCase().includes("geometrydash.exe");
    }
    if (platform === "darwin" || platform === "linux") {
      // Match the app bundle executable so paths with spaces ("Geometry Dash.app") work.
      const out = run("ps", ["-axo", "command="]).toLowerCase();
      return out.split("\n").some((l) => l.includes("geometry dash.app/contents/macos/") || /geometrydash(\.exe)?(\s|$)/.test(l));
    }
  } catch {
    // Could not tell: callers treat "unknown" as "maybe running" when a write is at stake.
    return null;
  }
  return false;
}

// Advisory lock so two adapter processes never edit the save file at once.
export function acquireLock(savePath) {
  const lock = savePath + ".gdaibridge-lock";
  try {
    const fd = fs.openSync(lock, "wx");
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
  } catch (e) {
    if (e.code !== "EEXIST") throw e;
    const pid = Number(fs.readFileSync(lock, "utf8"));
    let alive = false;
    try { process.kill(pid, 0); alive = pid !== process.pid; } catch { alive = false; }
    if (alive) throw new Error("Another GD AI Bridge adapter is editing the save file. Try again in a moment.");
    fs.writeFileSync(lock, String(process.pid)); // stale lock
  }
  return () => { try { fs.unlinkSync(lock); } catch { /* already gone */ } };
}
