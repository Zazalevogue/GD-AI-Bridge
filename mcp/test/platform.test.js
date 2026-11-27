import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultSavePath, resolveSavePath, desktopDir, isGameRunning, acquireLock } from "../platform.js";

test("default save path per platform", () => {
  assert.equal(defaultSavePath({ LOCALAPPDATA: "C:\\L" }, "win32", "/h"), path.join("C:\\L", "GeometryDash", "CCLocalLevels.dat"));
  assert.equal(defaultSavePath({}, "darwin", "/Users/a b"), path.join("/Users/a b", "Library", "Application Support", "GeometryDash", "CCLocalLevels.dat"));
  assert.equal(defaultSavePath({}, "linux", "/h"), null);
});
test("GD_SAVE_PATH wins; linux without it errors clearly", () => {
  assert.equal(resolveSavePath({ GD_SAVE_PATH: "/tmp/x.dat" }, "linux", "/h"), path.resolve("/tmp/x.dat"));
  assert.throws(() => resolveSavePath({}, "linux", "/h"), /GD_SAVE_PATH/);
});
test("desktop dir", () => { assert.equal(desktopDir({}, "darwin", "/Users/a"), path.join("/Users/a", "Desktop")); });
test("isGameRunning on macOS handles spaces, absence and failure", () => {
  const ps = (s) => () => s;
  assert.equal(isGameRunning("darwin", ps("/Applications/Geometry Dash.app/Contents/MacOS/Geometry Dash\n/bin/zsh\n")), true);
  assert.equal(isGameRunning("darwin", ps("/bin/zsh\n")), false);
  assert.equal(isGameRunning("darwin", () => { throw new Error("no ps"); }), null);
  assert.equal(isGameRunning("win32", ps("GeometryDash.exe  123")), true);
});
test("lock refuses a live second holder and recovers a stale one", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gdb-"));
  const f = path.join(dir, "CCLocalLevels.dat");
  const release = acquireLock(f);
  fs.writeFileSync(f + ".gdaibridge-lock", String(process.ppid)); // another live process
  assert.throws(() => acquireLock(f), /Another GD AI Bridge/);
  fs.writeFileSync(f + ".gdaibridge-lock", "999999999"); // dead pid
  const r2 = acquireLock(f); r2(); release();
});
