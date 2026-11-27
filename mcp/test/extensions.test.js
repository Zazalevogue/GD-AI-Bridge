import test from "node:test";
import assert from "node:assert/strict";
import { evaluateMods, findCapability } from "../extensions.js";

const mods = [
  { id: "a.good", version: "1.0.0", enabled: true, loaded: true, bridge: { protocol: 1, capabilities: [{ id: "paint", description: "d" }, { id: "BAD ID" }] } },
  { id: "b.none", version: "1.0.0", enabled: true, loaded: true },
  { id: "c.future", version: "2.0.0", enabled: true, loaded: true, bridge: { protocol: 2, capabilities: [{ id: "x" }] } },
  { id: "d.off", version: "1.0.0", enabled: false, loaded: false, bridge: { protocol: 1, capabilities: [{ id: "x" }] } },
  { id: "e.empty", version: "1.0.0", enabled: true, loaded: true, bridge: { protocol: 1, capabilities: [] } },
  { id: "f.junk", version: "1.0.0", enabled: true, loaded: true, bridge: "oops" },
];
const ev = evaluateMods(mods);
const get = (id) => ev.find((m) => m.id === id);

test("declared + enabled mod is available, invalid capability ids dropped", () => {
  assert.equal(get("a.good").integration, "available");
  assert.deepEqual(get("a.good").capabilities.map((c) => c.id), ["paint"]);
});
test("mod without interface is detected but not integrable", () => assert.equal(get("b.none").integration, "none"));
test("incompatible protocol version is refused", () => assert.equal(get("c.future").integration, "incompatible"));
test("disabled mod is unavailable", () => assert.equal(get("d.off").integration, "unavailable"));
test("no capabilities / malformed declaration", () => {
  assert.equal(get("e.empty").integration, "none");
  assert.equal(get("f.junk").integration, "invalid");
});
test("findCapability only allows announced, available capabilities", () => {
  assert.ok(findCapability(ev, "a.good", "paint").cap);
  assert.match(findCapability(ev, "a.good", "nope").error, /does not announce/);
  assert.match(findCapability(ev, "d.off", "x").error, /not callable/);
  assert.match(findCapability(ev, "zzz", "x").error, /not installed/);
  assert.deepEqual(evaluateMods(undefined), []);
});
