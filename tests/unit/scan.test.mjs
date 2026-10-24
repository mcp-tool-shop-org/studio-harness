import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { scanText, scanFiles } from "../../scripts/scan.mjs";

// Samples are assembled at run time, so this file never carries a literal the scanner would flag.
const j = (...p) => p.join("");
const SAMPLES = {
  "home-path": j("C:", "\\", "Users", "\\", "someone", "\\x"),
  "machine-path": j("D", ":/", "data/file.txt"),
  email: j("someone", "@", "mail", ".example-provider.com"),
  "account-id": j('{"', "ggufRepo", '": "', "someone/models", '"}'),
  "hf-token": j("hf", "_", "A".repeat(34)),
  jwt: j("ey", "J", "a".repeat(12), ".", "b".repeat(12), ".", "c"),
  "private-key": j("-----BEGIN ", "PRIVATE KEY", "-----"),
  "proxy-token": j("colab-runtime-proxy", "-token=", "abc"),
};

test("each class is caught (negative controls)", () => {
  for (const [cls, text] of Object.entries(SAMPLES)) {
    const hits = scanText(text);
    assert.ok(hits.some((h) => h.cls === cls), `${cls} not caught`);
  }
});

test("hits name file, line and class, never the value", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-"));
  const f = path.join(dir, "x.txt");
  fs.writeFileSync(f, `clean line\n${SAMPLES["home-path"]}\n`);
  const hits = scanFiles([f]);
  assert.deepEqual(hits.map(({ line, cls }) => ({ line, cls })).filter((h) => h.cls === "home-path"), [
    { line: 2, cls: "home-path" },
  ]);
  assert.ok(!JSON.stringify(hits).includes("someone"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("clean text passes", () => {
  const clean = [
    "https://github.com/mcp-tool-shop-org/studio-harness",
    j("64996768+mcp-tool-shop", "@", "users.noreply.github.com"),
    j('{"', "ggufRepo", '": "', "a".repeat(64), '"}'),
    "relative/path/to/file.mjs and ./scripts/scan.mjs",
    "ratio 3:4 and time 12:30",
  ].join("\n");
  assert.deepEqual(scanText(clean), []);
});
