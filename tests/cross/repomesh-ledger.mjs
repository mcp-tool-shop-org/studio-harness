/**
 * Run the pinned RepoMesh ledger validator against a scratch ledger, in place, without copying its scripts.
 * validate-ledger.mjs reads the ledger, nodes, policy and manifests from env overrides, and the schemas from its own
 * repo, which is the part under test.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { load, pin } from "./lib.mjs";

const { canonicalizeForHash } = await load("repomesh", "ledger", "scripts", "canonicalize.mjs");

/** A throwaway Ed25519 key, in memory only. */
export function throwawayKey(keyId = "cross-throwaway") {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  return { keyId, privateKey, publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString() };
}

/** Sign an unsigned RepoMesh event. `over: "hash-bytes"` is RepoMesh's rule; "utf8-json" is the wrong one. */
export function signEvent(unsigned, key, over = "hash-bytes") {
  const canonical = canonicalizeForHash(unsigned);
  const canonicalHash = crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
  const msg = over === "hash-bytes" ? Buffer.from(canonicalHash, "hex") : Buffer.from(canonical, "utf8");
  return {
    ...unsigned,
    signature: { alg: "ed25519", keyId: key.keyId, value: crypto.sign(null, msg, key.privateKey).toString("base64"), canonicalHash },
  };
}

/** An AttestationPublished event from `repo`, with one attestation of `attType`. */
export function attestation(repo, attType, n = 1) {
  const digest = crypto.createHash("sha256").update(`cross-${n}`).digest("hex");
  return {
    type: "AttestationPublished",
    repo,
    version: `0.0.${n}`,
    commit: "0000000",
    timestamp: "2026-10-24T00:00:00.000Z",
    artifacts: [{ name: `cross-${n}.json`, sha256: digest, uri: `urn:cross:${n}` }],
    attestations: [{ type: attType, uri: `urn:cross:att:${n}`, sha256: digest }],
    notes: "studio-harness cross test",
  };
}

/**
 * Write a scratch network (one node, the pinned policy, optional policy edits, the events) and run the validator.
 * `node` is a node.json object; its maintainers get the throwaway key.
 */
export function validate(dir, { node, key, events, policyEdit }) {
  const [owner, name] = node.id.split("/");
  const nodesDir = path.join(dir, "nodes");
  fs.mkdirSync(path.join(nodesDir, owner, name), { recursive: true });
  fs.writeFileSync(
    path.join(nodesDir, owner, name, "node.json"),
    JSON.stringify({ ...node, maintainers: [{ name: "Cross Throwaway", keyId: key.keyId, publicKey: key.publicKeyPem, contact: "https://github.com/mcp-tool-shop-org/studio-harness" }] }, null, 2),
  );
  const policy = JSON.parse(fs.readFileSync(pin("repomesh", "verifier.policy.json"), "utf8"));
  if (policyEdit) policyEdit(policy);
  const policyPath = path.join(dir, "verifier.policy.json");
  fs.writeFileSync(policyPath, JSON.stringify(policy, null, 2));
  const manifests = path.join(dir, "manifests");
  fs.mkdirSync(manifests, { recursive: true });
  const ledger = path.join(dir, "events.jsonl");
  fs.writeFileSync(ledger, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  const r = spawnSync(process.execPath, [pin("repomesh", "ledger", "scripts", "validate-ledger.mjs")], {
    cwd: pin("repomesh"),
    encoding: "utf8",
    env: {
      ...process.env,
      HEAD_LEDGER: ledger,
      REPOMESH_NODES_PATH: nodesDir,
      REPOMESH_VERIFIER_POLICY_PATH: policyPath,
      REPOMESH_MANIFESTS_PATH: manifests,
      BASE_LEDGER: "",
    },
  });
  return { status: r.status, out: `${r.stdout}\n${r.stderr}` };
}

/** The pinned cognate node.json, as RepoMesh ships it. */
export function cognateNode() {
  return JSON.parse(fs.readFileSync(pin("repomesh", "ledger", "nodes", "mcp-tool-shop-org", "cognate", "node.json"), "utf8"));
}
