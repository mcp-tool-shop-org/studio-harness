#!/usr/bin/env node
/**
 * Class-pattern scanner for studio-harness: fails if a tracked file carries a home path, a machine (drive-letter)
 * path, a personal email, an unhashed account identifier, or a token, JWT or private key.
 *
 * It holds class patterns only, never personal strings. The needle scan with personal strings runs locally, before
 * every push, and never in CI. A hit is reported as file:line:class, never with the matched value.
 *
 * Usage: node scripts/scan.mjs [file ...]   (default: every file `git ls-files` lists)
 * Exit codes: 0 clean, 1 hits found, 2 usage or read error.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Addresses that name no person: GitHub's noreply domain and the documentation domains.
const EMAIL_ALLOW = /@(?:users\.noreply\.github\.com|noreply\.github\.com|anthropic\.com|example\.(?:com|org|net))$/i;

// Keys whose value names an account; the trio's identity rule stores them as sha256 only.
const ACCOUNT_KEYS = ["ggufRepo", "gguf_source", "hfRepo", "hostedRepo", "githubOwner", "email", "homePath"];

export const CLASS_PATTERNS = [
  ["home-path", /\b[A-Za-z]:[\\/]+Users[\\/]+(?!(?:Public|Default|All Users)\b)[\w.-]+/],
  ["home-path", /(?:^|[^\w.])\/(?:home|Users)\/[\w.-]+/],
  ["home-path", /(?:^|[^\w])\/[a-z]\/Users\/[\w.-]+/],
  ["machine-path", /(?<![A-Za-z0-9])[A-Za-z]:[\\/][A-Za-z0-9_.-]/],
  ["account-id", new RegExp(`"(?:${ACCOUNT_KEYS.join("|")})"\\s*:\\s*"(?![0-9a-f]{64}")[^"]+"`)],
  ["hf-token", /\bhf_[A-Za-z0-9]{30,}\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./],
  ["private-key", /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
  ["proxy-token", /colab-runtime-proxy-token=[^\s&"'<[]/],
];

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Returns [{ line, cls }] for one text. Never returns the matched value. */
export function scanText(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((ln, i) => {
    for (const [cls, re] of CLASS_PATTERNS) if (re.test(ln)) hits.push({ line: i + 1, cls });
    for (const m of ln.matchAll(EMAIL_RE)) if (!EMAIL_ALLOW.test(m[0])) hits.push({ line: i + 1, cls: "email" });
  });
  return hits;
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
}

export function scanFiles(files, self) {
  const out = [];
  for (const f of files) {
    // This file defines the patterns, so it would match itself.
    if (self && path.resolve(f) === self) continue;
    const buf = fs.readFileSync(f);
    if (buf.includes(0)) continue; // binary
    for (const h of scanText(buf.toString("utf8"))) out.push({ file: f, ...h });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let files;
  try {
    files = process.argv.length > 2 ? process.argv.slice(2) : trackedFiles();
  } catch (e) {
    console.error(`scan: cannot list files (${e.code || e.message}); pass files as arguments`);
    process.exit(2);
  }
  let hits;
  try {
    hits = scanFiles(files, fileURLToPath(import.meta.url));
  } catch (e) {
    console.error(`scan: cannot read a file (${e.code || e.message})`);
    process.exit(2);
  }
  for (const h of hits) console.log(`${h.file}:${h.line}:${h.cls}`);
  console.log(hits.length ? `RESULT HIT ${hits.length}` : `RESULT CLEAN (${files.length} files)`);
  process.exit(hits.length ? 1 : 0);
}
