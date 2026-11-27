import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gdb offline "));  // space in the path on purpose
const save = path.join(dir, "CCLocalLevels.dat");
process.env.GD_SAVE_PATH = save;

const b64 = (buf) => buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
const levelStr = b64(zlib.gzipSync("kS38,1_40_2_125_3_50_11_255_12_255_13_255_4_-1_6_1000_7_1_15_1_18_0_8_1|1_0_2_127_3_21_4_-1_7_1_15_1_18_0_8_1|;1,1,2,15,3,15;"));
const xml = `<?xml version="1.0"?><plist version="1.0" gjver="2.0"><dict><k>LLM_01</k><d><k>_isArr</k><t/><k>k_0</k><d><k>kCEK</k><i>4</i><k>k2</k><s>Test Level</s><k>k4</k><s>${levelStr}</s></d></d></dict></plist>`;
const encodeSave = (x) => Buffer.from(Buffer.from(b64(zlib.gzipSync(x)), "latin1").map((b) => b ^ 11));
fs.writeFileSync(save, encodeSave(xml));

const off = await import("../offline.js");
const req = off.request;

test("reads the fixture level (path with spaces)", () => {
  const s = req("GET", "/status");
  assert.equal(s.level_name, "Test Level");
  assert.equal(s.object_count, 1);
});

test("dry_run changes nothing on disk or in memory", () => {
  const before = fs.readFileSync(save);
  const r = req("POST", "/objects/fill", { id: 1, x1: 15, y1: 45, x2: 285, y2: 45, dry_run: true });
  assert.equal(r.dry_run, true);
  assert.equal(r.object_count_after, 11);
  assert.deepEqual(fs.readFileSync(save), before);
  assert.equal(req("GET", "/status").object_count, 1);
});

test("a real write backs up first and can be undone", () => {
  req("POST", "/objects/fill", { id: 1, x1: 15, y1: 45, x2: 285, y2: 45 });
  assert.equal(req("GET", "/status").object_count, 11);
  const backups = fs.readdirSync(dir).filter((f) => f.includes("gdaibridge-backup-"));
  assert.equal(backups.length, 1);
  req("POST", "/undo");
  assert.equal(req("GET", "/status").object_count, 1);
  assert.ok(!fs.existsSync(save + ".gdaibridge-lock"));
});

test("mass delete needs confirm", () => {
  req("POST", "/objects/fill", { id: 1, x1: 15, y1: 75, x2: 1515, y2: 75 }); // 51 objects + 1
  assert.throws(() => req("POST", "/objects/delete", { region: { x_min: 0 } }), /confirm/);
  assert.equal(req("POST", "/objects/delete", { region: { x_min: 0 }, confirm: true }).deleted, 52);
});

test("batch limit", () => {
  assert.throws(() => req("POST", "/objects/fill", { id: 1, x1: 0, y1: 0, x2: 30000, y2: 30000 }), /max 10000/);
});

test("export refuses bad extension and overwrite", () => {
  const f = path.join(dir, "out.gdlvl");
  assert.throws(() => req("POST", "/levels/export", { path: path.join(dir, "out.txt") }), /\.gdlvl/);
  const r = req("POST", "/levels/export", { path: f });
  assert.equal(r.exported, "Test Level");
  assert.ok(fs.statSync(f).size > 0);
  assert.throws(() => req("POST", "/levels/export", { path: f }), /already exists/);
  assert.equal(req("POST", "/levels/export", { path: f, overwrite: true }).file, f);
});
