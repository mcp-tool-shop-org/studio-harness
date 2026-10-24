#!/usr/bin/env node
/**
 * Class-pattern scanner for studio-harness: fails if a tracked file carries a home path, a machine path (drive
 * letter, WSL/Cygwin drive mount or UNC share), a personal email, an unhashed account identifier, a token or seed,
 * a private key, or a tailnet address.
 *
 * It holds class patterns only, never personal strings. The needle scan with personal strings runs locally, before
 * every push, and never in CI. A hit is reported as file:line:class, never with the matched value.
 * Each line is also checked in decoded form: percent-decoded, and every base64 run that decodes to printable text.
 *
 * Usage: node scripts/scan.mjs [file ...]   (default: every file `git ls-files` lists)
 * Exit codes: 0 clean, 1 hits found, 2 usage or read error.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Addresses that name no person: GitHub's noreply domain, the studio's own domain, the documentation domains.
const EMAIL_ALLOW =
  /@(?:users\.noreply\.github\.com|noreply\.github\.com|anthropic\.com|mcptoolshop\.com|example\.(?:com|org|net))$/i;

// Keys whose value names an account; the trio's identity rule stores them as sha256 only.
const ACCOUNT_KEYS = [
  "ggufRepo", "gguf_source", "PIN_GGUF_REPO", "hfRepo", "hostedRepo", "githubOwner", "authorEmail", "email", "homePath",
];
const KEYS = ACCOUNT_KEYS.join("|");
const NOT_HEX64 = "(?![0-9a-f]{64}(?![0-9a-f]))";
const SKIP_ACCOUNTS = "(?!(?:Public|Default|All Users)\\b)";

export const CLASS_PATTERNS = [
  // A Windows drive letter or an admin share (drive letter then '$'), then Users, then the account; any case.
  ["home-path", new RegExp(`\\b[A-Za-z][:$][\\\\/]+Users[\\\\/]+${SKIP_ACCOUNTS}[\\w.-]+`, "i")],
  // POSIX and macOS homes.
  ["home-path", new RegExp(`(?:^|[^\\w.])\\/(?:home|Users)\\/${SKIP_ACCOUNTS}[\\w.-]+`)],
  // A drive mount then Users then the account: Git Bash / MSYS (bare drive letter), WSL (mnt), Cygwin (cygdrive).
  ["home-path", new RegExp(`(?:^|[^\\w])\\/(?:(?:mnt|cygdrive)\\/)?[a-z]\\/Users\\/${SKIP_ACCOUNTS}[\\w.-]+`, "i")],
  ["machine-path", /(?<![A-Za-z0-9])[A-Za-z]:[\\/][A-Za-z0-9_.-]/],
  ["machine-path", /(?:^|[^\w])\/(?:mnt|cygdrive)\/[a-z]\/[A-Za-z0-9_.-]/i],
  ["machine-path", /\\\\[A-Za-z0-9._$-]{2,}\\[A-Za-z0-9._$-]{2,}/],
  // Quoted keys (JSON, JS, Python) or bare keys (YAML, env), with ':' or '='; the value must be a sha256 to pass.
  [
    "account-id",
    new RegExp(
      `(?<![\\w-])["']?(?:${KEYS})["']?\\s*[:=]\\s*(?:["']${NOT_HEX64}[^"'\\s][^"']*["']|(?!["'])${NOT_HEX64}(?!null\\b|true\\b|false\\b)[A-Za-z0-9][\\w./@-]*)`,
    ),
  ],
  ["hf-token", /\bhf_[A-Za-z0-9]{30,}\b/],
  [
    "api-token",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{20,}|xox[abpr]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/,
  ],
  // An Ed25519 XRPL family seed (RepoMesh's anchor account is Ed25519).
  ["xrpl-seed", /\bsEd[1-9A-HJ-NP-Za-km-z]{25,30}\b/],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\./],
  ["private-key", /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/],
  ["proxy-token", /colab-runtime-proxy-token=[^\s&"'<[]/],
  // A concrete tailnet (CGNAT) host; the block written as CIDR names a range, not a host.
  ["tailscale-ip", /\b(?!100\.64\.0\.0\/10\b)100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/],
];

// The domain label after '@' must start with a letter, so package specifiers (pkg@1.2.3-beta.rc) never match.
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z][A-Za-z0-9.-]*\.[A-Za-z]{2,}/g;
const B64_RUN_RE = /[A-Za-z0-9+/]{40,}={0,2}/g;
const PRINTABLE_RE = /^[\x09\x0a\x0d\x20-\x7e]+$/;

/** The line as written, percent-decoded, and each base64 run that decodes to printable text. */
function views(ln) {
  const out = [ln];
  if (/%[0-9A-Fa-f]{2}/.test(ln)) {
    try {
      out.push(decodeURIComponent(ln));
    } catch {
      // a stray '%' that isn't an escape: the line as written is still scanned
    }
  }
  for (const m of ln.matchAll(B64_RUN_RE)) {
    if (/^[0-9a-fA-F]+$/.test(m[0])) continue; // a hex digest, not base64 text
    const dec = Buffer.from(m[0], "base64").toString("utf8");
    if (dec.length >= 16 && PRINTABLE_RE.test(dec)) out.push(dec);
  }
  return out;
}

/** Returns [{ line, cls }] for one text, one hit per line and class. Never returns the matched value. */
export function scanText(text) {
  const hits = [];
  text.split(/\r?\n/).forEach((ln, i) => {
    const found = new Set();
    for (const v of views(ln)) {
      for (const [cls, re] of CLASS_PATTERNS) if (re.test(v)) found.add(cls);
      for (const m of v.matchAll(EMAIL_RE)) if (!EMAIL_ALLOW.test(m[0])) found.add("email");
    }
    for (const cls of found) hits.push({ line: i + 1, cls });
  });
  return hits;
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
}

export function scanFiles(files) {
  const out = [];
  for (const f of files) {
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
    hits = scanFiles(files);
  } catch (e) {
    console.error(`scan: cannot read a file (${e.code || e.message})`);
    process.exit(2);
  }
  for (const h of hits) console.log(`${h.file}:${h.line}:${h.cls}`);
  console.log(hits.length ? `RESULT HIT ${hits.length}` : `RESULT CLEAN (${files.length} files)`);
  process.exit(hits.length ? 1 : 0);
}
