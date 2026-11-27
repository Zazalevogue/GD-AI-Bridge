# GD AI Bridge extension protocol (v1, draft)

Lets another Geode mod tell GD AI Bridge what an AI may do with it. Nothing is required:
the bridge works without any third-party mod, and a mod that declares nothing is reported as
*detected but not integrable* (its internals are never driven).

## Declaration (implemented)

In the other mod's `mod.json`:

```json
"data": {
  "gd-ai-bridge": {
    "protocol": 1,
    "capabilities": [
      { "id": "paint-stroke", "description": "Draw a polyline of blocks", "input_schema": { "type": "object" } }
    ]
  }
}
```

`id` matches `^[a-z0-9_.-]{1,64}$`. The bridge reports it via `GET /mods` and the MCP tools
`gd_mods` / `gd_capabilities`. Integration states: `available`, `none`, `incompatible`
(other `protocol`), `unavailable` (disabled / not loaded), `invalid`.

## Invocation (NOT implemented)

`POST /capabilities/call` and `gd_call_capability` validate the request (mod enabled, protocol
compatible, capability announced) and then return HTTP 501. A call transport (Geode event or
exported API) must be chosen and verified against the Geode 6.0.0 SDK first; until then no
call is made. Mod authors should not rely on a transport yet.

## Tests
`cd mcp && npm test` covers: capabilities found, mod without interface, incompatible protocol,
disabled mod, absent mod, malformed declaration.
