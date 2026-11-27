// Extension protocol, adapter side: decides which mods are *integrable* from the inventory
// the game mod reports (GET /mods). See docs/EXTENSION_PROTOCOL.md.
//
// A mod declares capabilities in its mod.json:
//   "data": { "gd-ai-bridge": { "protocol": 1, "capabilities": [ { "id", "description", "input_schema"? } ] } }
// Inventory alone never makes a mod usable.
export const SUPPORTED_PROTOCOL = 1;

export function evaluateMods(mods) {
  const out = [];
  for (const m of Array.isArray(mods) ? mods : []) {
    const entry = { id: m.id, version: m.version, enabled: !!m.enabled, loaded: !!m.loaded, integration: "none", capabilities: [] };
    const decl = m.bridge;
    if (decl === undefined || decl === null) {
      entry.integration = "none";
      entry.note = "Detected but exposes no GD AI Bridge interface: not integrable.";
    } else if (typeof decl !== "object" || !Number.isInteger(decl.protocol)) {
      entry.integration = "invalid";
      entry.note = "Malformed gd-ai-bridge declaration; ignored.";
    } else if (decl.protocol !== SUPPORTED_PROTOCOL) {
      entry.integration = "incompatible";
      entry.note = `Declares protocol ${decl.protocol}; this bridge supports ${SUPPORTED_PROTOCOL}.`;
    } else if (!entry.enabled || !entry.loaded) {
      entry.integration = "unavailable";
      entry.note = entry.enabled ? "Mod is not loaded." : "Mod is disabled.";
    } else {
      const caps = (Array.isArray(decl.capabilities) ? decl.capabilities : []).filter(
        (c) => c && typeof c.id === "string" && /^[a-z0-9_.-]{1,64}$/.test(c.id));
      entry.capabilities = caps.map((c) => ({ id: c.id, description: String(c.description ?? ""), input_schema: c.input_schema ?? null }));
      entry.integration = caps.length ? "available" : "none";
      if (!caps.length) entry.note = "Declares the protocol but no capabilities.";
    }
    out.push(entry);
  }
  return out;
}

export function findCapability(evaluated, modId, capId) {
  const mod = evaluated.find((m) => m.id === modId);
  if (!mod) return { error: `Mod "${modId}" is not installed.` };
  if (mod.integration !== "available") return { error: `Mod "${modId}" is not callable (${mod.integration}). ${mod.note ?? ""}`.trim() };
  const cap = mod.capabilities.find((c) => c.id === capId);
  if (!cap) return { error: `Mod "${modId}" does not announce capability "${capId}".` };
  return { mod, cap };
}
