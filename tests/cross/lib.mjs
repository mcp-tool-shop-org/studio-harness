/**
 * Shared helpers for the cross tests: where the pinned tools live, how to import them, and the gap rule.
 *
 * The gap rule (Publisher, 2026-10-24): every gap in capabilities.json is probed against real behaviour of the
 * pinned tool code. A probe returns one of three states:
 *   - "open":   the gap shows, for its stated reason (matched on the tool's own error or result);
 *   - "closed": the fixed behaviour shows;
 *   - anything else is "broken" and fails the test, so a probe never passes by failing for the wrong reason.
 * The test then asserts the state matches capabilities.json. A gap that closes without its entry being flipped (in
 * the same PR that bumps the pin) fails, and so does an entry flipped before the fix is pinned.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PINS = path.resolve(ROOT, process.env.PINS_DIR || ".pins");
const CAPS = JSON.parse(fs.readFileSync(path.join(ROOT, "capabilities.json"), "utf8"));

/** Absolute path inside a pinned tool's clone. */
export const pin = (tool, ...p) => path.join(PINS, tool, ...p);

/** Import a module from a pinned tool's clone. */
export const load = (tool, ...p) => import(pathToFileURL(pin(tool, ...p)).href);

/** A scratch directory removed when the test ends. */
export function scratch(t, name = "cross-") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), name));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

export const OPEN = (evidence) => ({ state: "open", evidence });
export const CLOSED = (evidence) => ({ state: "closed", evidence });
export const BROKEN = (evidence) => ({ state: "broken", evidence });

/**
 * Declare the probe for one gap. `probe(t)` returns OPEN(...), CLOSED(...) or BROKEN(...).
 * The gap must exist in capabilities.json with `open: true|false`.
 */
export function gap(id, probe) {
  const entry = CAPS.gaps[id];
  test(`gap ${id}: ${entry ? (entry.open ? "open" : "closed") : "UNKNOWN"} at the pin`, async (t) => {
    assert.ok(entry, `gap ${id} is not in capabilities.json`);
    const r = await probe(t);
    assert.notEqual(r.state, "broken", `probe for ${id} is broken: ${r.evidence}`);
    const want = entry.open ? "open" : "closed";
    assert.equal(
      r.state,
      want,
      r.state === "closed"
        ? `gap ${id} is closed at this pin: flip it in capabilities.json in the same PR (${entry.flips_with}). ${r.evidence}`
        : `gap ${id} is open at this pin, but capabilities.json says closed. ${r.evidence}`,
    );
  });
}

/** Every gap id in capabilities.json must have a probe file that declares it. */
export function allGapIds() {
  return Object.keys(CAPS.gaps);
}
