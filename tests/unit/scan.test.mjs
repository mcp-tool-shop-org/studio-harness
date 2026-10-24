import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanText, scanFiles } from "../../scripts/scan.mjs";

// Samples are assembled at run time, so this file never carries a literal the scanner would flag.
const j = (...p) => p.join("");
const has = (text, cls) => scanText(text).some((h) => h.cls === cls);
const b64 = (s) => Buffer.from(s).toString("base64");
const GR = j("gguf", "Repo"); // account-id key names are assembled too

// One or more negative controls per class: each must be caught.
const CAUGHT = {
  "home-path": [
    j("C:", "\\", "Users", "\\", "someone", "\\x"),
    j("c:", "\\", "users", "\\", "someone"),
    j("\\\\", "host", "\\", "C$", "\\", "Users", "\\", "someone"),
    j("/home/", "someone", "/work"),
    j("/Users/", "someone", "/work"),
    j("/c/Users/", "someone", "/work"),
    j("/mnt/", "c/Users/", "someone", "/work"),
    j("/cyg", "drive/", "c/Users/", "someone"),
    j("C%3", "A%5CUsers%5C", "someone%5Cx"),
  ],
  "machine-path": [
    j("D", ":/", "data/file.txt"),
    j("/mnt/", "e/AI/work"),
    j("/cyg", "drive/", "e/work"),
    j("\\\\", "rig-host", "\\", "share"),
  ],
  email: [j("someone", "@", "mail", ".example-provider.com")],
  "account-id": [
    j('{"', GR, '": "', "someone/models", '"}'),
    j(GR, ": ", "someone/models"),
    j("{'gguf", "_source': '", "someone/models", "'}"),
    j("PIN_GGUF", "_REPO=", "someone/models"),
    j("{ author", "Email: '", "x", "' }"),
  ],
  "hf-token": [j("hf", "_", "A".repeat(34)), `ROW:1:${b64(j('{"token":"hf', "_", "A".repeat(34), '"}'))}:END`],
  "api-token": [j("ghp", "_", "A".repeat(36)), j("github", "_pat_", "B".repeat(40)), j("AKIA", "C".repeat(16))],
  "xrpl-seed": [j("sEd", "7".repeat(28))],
  jwt: [j("ey", "J", "a".repeat(12), ".", "b".repeat(12), ".", "c")],
  "private-key": [j("-----BEGIN ", "PRIVATE KEY", "-----"), j("-----BEGIN RSA ", "PRIVATE KEY-----")],
  "proxy-token": [j("colab-runtime-proxy", "-token=", "abc")],
  "tailscale-ip": [j("100", ".90.12.34")],
};

test("each class is caught, in every form it covers (negative controls)", () => {
  for (const [cls, samples] of Object.entries(CAUGHT)) {
    for (const s of samples) assert.ok(has(s, cls), `${cls} missed sample ${CAUGHT[cls].indexOf(s)}`);
  }
});

test("hits name file, line and class, never the value", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-"));
  const f = path.join(dir, "x.txt");
  fs.writeFileSync(f, `clean line\n${CAUGHT["home-path"][0]}\n`);
  const hits = scanFiles([f]);
  assert.deepEqual(
    hits.filter((h) => h.cls === "home-path").map(({ line, cls }) => ({ line, cls })),
    [{ line: 2, cls: "home-path" }],
  );
  assert.ok(!JSON.stringify(hits).includes("someone"));
  fs.rmSync(dir, { recursive: true, force: true });
});

test("honest content passes", () => {
  const clean = [
    "https://github.com/mcp-tool-shop-org/studio-harness",
    j("64996768+mcp-tool-shop", "@", "users.noreply.github.com"),
    j("security", "@", "mcptoolshop.com"),
    "npx --yes @dogfood-lab/atlas@1.24.0 check and pkg@1.24.0-beta.rc",
    j('{"', GR, '": "', "a".repeat(64), '"}'),
    j(GR, ": ", "a".repeat(64)),
    j(GR, ": null"),
    "the fields ggufRepo and gguf_source are hashed",
    "relative/path/to/file.mjs, ./scripts/scan.mjs, ratio 3:4, time 12:30",
    "the block 100.64.0.0/10 is reserved",
    "sha256 " + "0123456789abcdef".repeat(4),
    "cache dirs ~/.npm and ~/.cache/uv",
  ].join("\n");
  assert.deepEqual(scanText(clean), []);
});

test("Users\\Public is not a home path", () => {
  assert.ok(!has(j("C:", "\\", "Users", "\\", "Public", "\\x"), "home-path"));
});

test("the scanner's own source scans clean (no self-skip needed)", () => {
  const self = fileURLToPath(new URL("../../scripts/scan.mjs", import.meta.url));
  assert.deepEqual(scanFiles([self]), []);
});
