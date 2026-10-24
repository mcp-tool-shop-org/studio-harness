#!/usr/bin/env node
/**
 * Clone each tool in pins.json at its pinned commit into .pins/<tool>, build it from source with the tool's own
 * pinned toolchain, and link the trio together (Cognate uses the pinned Attestia, not the one in its lockfile).
 *
 * - pnpm tools run the pnpm version their package.json `packageManager` names, through npx, so the lockfile is
 *   honoured whatever pnpm is installed.
 * - npm tools run `npm ci` in each of their `installDirs`.
 * - uv tools run `uv sync --frozen`.
 * - OVERRIDE="<tool>=<40-char sha>" swaps one tool's pin for a candidate commit (pre-release testing).
 * - PINS_DIR changes where the clones live (default .pins/).
 * A tool already cloned and built at its pin is left as it is.
 *
 * Usage: node scripts/fetch-pins.mjs
 * Exit codes: 0 ok, 1 a clone, build or link failed, 2 bad pins.json or OVERRIDE.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHA_RE = /^[0-9a-f]{40}$/;
const WIN = process.platform === "win32";

export function pinsDir() {
  return path.resolve(ROOT, process.env.PINS_DIR || ".pins");
}

/** pins.json's tools with any OVERRIDE applied; throws on a malformed entry. */
export function loadPins(file = path.join(ROOT, "pins.json"), override = process.env.OVERRIDE || "") {
  const { tools } = JSON.parse(fs.readFileSync(file, "utf8"));
  const out = structuredClone(tools);
  if (override) {
    const m = /^([a-z][a-z0-9-]*)=([0-9a-f]{40})$/.exec(override.trim());
    if (!m || !out[m[1]]) throw new Error(`OVERRIDE must be <tool>=<40-char sha> for a pinned tool, got "${override}"`);
    out[m[1]].sha = m[2];
    out[m[1]].overridden = true;
  }
  for (const [name, t] of Object.entries(out)) {
    if (!/^[\w.-]+\/[\w.-]+$/.test(t.repo || "")) throw new Error(`${name}: repo must be owner/name`);
    if (!SHA_RE.test(t.sha || "")) throw new Error(`${name}: sha must be a full 40-character commit sha`);
    if (!["pnpm", "npm", "uv"].includes(t.toolchain)) throw new Error(`${name}: toolchain must be pnpm, npm or uv`);
  }
  return out;
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: WIN });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed in ${path.basename(cwd)} (exit ${r.status})`);
}

function headOf(dir) {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

const STAMP = ".studio-harness-built";

function clone(name, t, dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  run("git", ["init", "-q"], dir);
  run("git", ["remote", "add", "origin", `https://github.com/${t.repo}.git`], dir);
  run("git", ["fetch", "-q", "--depth", "1", "origin", t.sha], dir);
  run("git", ["checkout", "-q", "FETCH_HEAD"], dir);
  if (headOf(dir) !== t.sha) throw new Error(`${name}: checked out ${headOf(dir)}, expected ${t.sha}`);
}

function build(name, t, dir) {
  if (t.toolchain === "pnpm") {
    const pm = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")).packageManager || "";
    const m = /^pnpm@([0-9][\w.-]*)/.exec(pm);
    if (!m) throw new Error(`${name}: package.json has no pnpm packageManager field`);
    const pnpm = `pnpm@${m[1]}`;
    run("npx", ["--yes", pnpm, "install", "--frozen-lockfile"], dir);
    run("npx", ["--yes", pnpm, "build"], dir);
  } else if (t.toolchain === "npm") {
    for (const sub of t.installDirs || ["."]) run("npm", ["ci", "--no-audit", "--no-fund"], path.join(dir, sub));
  } else {
    run("uv", ["sync", "--frozen"], dir);
  }
}

/** Point every `node_modules/<pkg>` under dir (outside pnpm's store) at the pinned target package. */
export function linkPackage(dir, pkg, target) {
  const linked = [];
  const walk = (d, depth) => {
    if (depth > 4) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === ".git" || e.name === ".pnpm") continue;
      const p = path.join(d, e.name);
      if (e.name === "node_modules") {
        const link = path.join(p, ...pkg.split("/"));
        if (fs.existsSync(link) || fs.lstatSync(path.dirname(link), { throwIfNoEntry: false })) {
          if (fs.lstatSync(link, { throwIfNoEntry: false })) {
            fs.rmSync(link, { recursive: true, force: true });
            fs.mkdirSync(path.dirname(link), { recursive: true });
            fs.symlinkSync(target, link, WIN ? "junction" : "dir");
            linked.push(path.relative(dir, link));
          }
        }
        continue;
      }
      walk(p, depth + 1);
    }
  };
  walk(dir, 0);
  return linked;
}

export function fetchAll(tools = loadPins(), base = pinsDir()) {
  fs.mkdirSync(base, { recursive: true });
  for (const [name, t] of Object.entries(tools)) {
    const dir = path.join(base, name);
    const stamp = path.join(dir, STAMP);
    const fresh = headOf(dir) === t.sha && fs.existsSync(stamp) && fs.readFileSync(stamp, "utf8").trim() === t.sha;
    if (fresh) {
      console.log(`${name}: at ${t.sha.slice(0, 7)}, already built`);
      continue;
    }
    console.log(`${name}: cloning ${t.repo} at ${t.sha.slice(0, 7)}${t.overridden ? " (OVERRIDE)" : ""}`);
    clone(name, t, dir);
    build(name, t, dir);
    fs.writeFileSync(stamp, `${t.sha}\n`);
  }
  for (const [name, t] of Object.entries(tools)) {
    for (const [pkg, rel] of Object.entries(t.links || {})) {
      const target = path.join(base, ...rel.split("/"));
      if (!fs.existsSync(path.join(target, "package.json"))) throw new Error(`${name}: link target ${rel} missing`);
      const linked = linkPackage(path.join(base, name), pkg, target);
      if (linked.length === 0) throw new Error(`${name}: no node_modules/${pkg} found to link`);
      console.log(`${name}: ${pkg} -> pinned ${rel} (${linked.length} link${linked.length === 1 ? "" : "s"})`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let tools;
  try {
    tools = loadPins();
  } catch (e) {
    console.error(`fetch-pins: ${e.message}`);
    process.exit(2);
  }
  try {
    fetchAll(tools);
  } catch (e) {
    console.error(`fetch-pins: ${e.message}`);
    process.exit(1);
  }
}
