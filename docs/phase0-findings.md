# Phase 0 findings: the trio and interlock, run together for the first time

**What Phase 0 was:** a local dry run on 2026-10-24.
- Eight recent research windows (paid GPU runs, CPU stubs, a stopped run and a two-hour lane) were replayed through
  Attestia, Cognate, RepoMesh and interlock, at these commits:

  | Tool | Commit |
  |---|---|
  | attestia | bd0176d |
  | cognate | eea65c6 |
  | repomesh | 67079b4 |
  | interlock | 7fbc75b |

- No network posting, no XRPL transaction and no GPU. A throwaway signing key existed only in memory.
- **The tally:** of the 17 candidate gaps the plan listed, all 17 were confirmed by running, and 4 new ones turned up.

This summary is written fresh from the run's local gap report, which stays outside the repo because it quotes real
receipts. The probes that showed each gap move into `tests/cross/` (PR 2), where each one asserts its gap is present
at the pins above and flips when a fix lands.

## The replay itself worked

- **Attestia:** 17 events in its hash-chained store, and `verifyHashChain` was valid at every position.
- **RepoMesh:** 16 signed attestations in a scratch ledger. `compute-root --since-last` made a v2 partition root,
  and `validate-ledger` passed on the scratch ledger.
- **Cognate:** `proveRecordedEvent` returned an inclusion proof for an event on a stream it already knows.
- **The answer key:** the hidden panel key was never opened. Only its pinned hash appears.

## Attestia

- **(a) There's no event source for Cognate.** `EventMetadata.source` allows only Attestia's own domains plus
  `external`, so AI-governance events can't be told apart. *Being addressed:* attestia #25 adds `cognate`.
- **(b) The Merkle leaf doesn't bind the store envelope.** A proof shows that an event's content is in the set. It
  doesn't show its position, stream, append time or chain link. *Being addressed:* #25 adds `hashStoredEventLeaf`.
- **(c) The XRPL witness is a second, weaker clock.** It stamps time from the host clock, not the ledger close time,
  and its verifier doesn't check that the transaction validated, that it succeeded, or which account sent it.
  *Decided:* RepoMesh's anchor is the only clock for the trio. The witness is marked non-authoritative for trio use
  in code, and a follow-up makes it verify RepoMesh anchors.

## Cognate

- **(a) There's no run lifecycle.** There are no pre-registration or outcome types or events.
- **(b) Only one evaluation per version.** The state machine allows registered → evaluated → approved or rejected.
  A second evaluation (a replication) can't attach, and an approved version can't be rejected. A decision built on
  two runs that disagree has nowhere to live.
- **(c) The wrong grain for a prompt setting.** A model version means weights, config and manifest. Treating a
  prompt arm as a version conflates it with a weights change. Needed: a role-assembly scope (role, weights hash,
  prompt hashes, harness hashes, server binary hash).
- **(d) Proof streams and withheld keys are closed lists.** Events on new `runs` and `evaluations` streams return
  "event not found" from the proof endpoint, and the withheld-plaintext keys don't cover panels or blind items.
- **(e) Creation isn't attested.** Creating a model, a version, an agent or a grant writes a snapshot but appends no
  event, so these acts have no proof.
- **(f) Agent auth trusts headers.** No signature is checked against the agent's public key.
- **(g) Partition anchoring is a stub.** `anchorPartition` in the RepoMesh bridge returns pending with no transaction.

## RepoMesh

- **(a) There are no research-run event types.** The event schema expects a release: a semver version, a commit and
  artifacts.
- **(b) There's no governance attestor kind.** The trust policy lists only attestor, registry and policy nodes, so a
  governance node (Cognate, the Publisher) can't sign attestations that verify.
- **(c) Anchor records lose their time.**
  - Anchor notes carry no close time.
  - An "all" partition entry can overwrite a real partition's transaction hash in the anchors index.
  - Validated transaction receipts aren't archived, so a testnet reset erases the proof.
- **(d) Anchoring is daily.** A pre-registration and its outcome can land in one partition, so the XRPL clock can't
  show which came first. Needed: an anchor at each launch, started through `workflow_dispatch`.

## interlock

- **(a) Receipts and grants aren't events.** Measurement receipts and the Publisher's GPU grants don't reach Cognate
  or Attestia.
- **(b) Routed models aren't registered.** There's no Cognate registration with digest, engine, licence and quant.
- **(c) There's no release gate.** The router can't refuse a model whose release RepoMesh can't verify. Planned as a
  setting that's off by default.

## New in Phase 0

1. **RepoMesh signs the hash's bytes, not the JSON.** The ledger validator checks Ed25519 signatures over the raw 32
   bytes of the canonical hash. It also requires every maintainer key to name a contact. A Cognate emitter has to do
   the same, or its attestations fail validation.
2. **The run lifecycle needs more states than done.** A CPU stub in a subfolder had no outcome record of its own. A
   run can be in progress, cancelled before it starts, or stopped by hand and retired, and each needs a recorded
   outcome rather than a missing one.
3. **interlock's path scrub misses drive-letter paths.** Its receipt scrub catches home paths but not drive-letter
   workspace paths, so committed receipts carry local workspace paths. It should match the Publisher's machine-path
   rule.
4. **Account identifiers must be hashes.** Any identifier that names an account (model-hosting repo ids, GitHub
   owners, emails, home paths) is stored as sha256 only, like panels, keys and prompts. The first replay carried a
   model repo id in clear, and the studio's identity scan caught it. This is now a hard rule for every record, and
   CI's scanner enforces it on committed files.

## Order of Phase 1 work

One PR per repo per concern. Each gets an Argon build and an independent review, then the Publisher's merge:

1. **attestia:** event source and leaf binding, (a) and (b). This is #25, rebasing on the Zod 4 upgrade (#26).
2. **attestia:** the witness, non-authoritative for the trio, verifying RepoMesh anchors, (c).
3. **repomesh:** run event types and the governance attestor, (a), (b) and New 1.
4. **repomesh:** close time, the anchors-index fix, receipt archive and per-launch anchor, (c) and (d).
5. **cognate:** run types and events, plus the hash-only identifier rule, (a), New 2 and New 4.
6. **cognate:** multiple evaluations and the role-assembly scope, (b) and (c).
7. **cognate:** proof streams, withheld keys and attested creation, (d), (e) and New 4.
8. **cognate:** signed agent auth and real partition anchoring, (f), (g) and New 1.
9. **interlock:** receipts and grants as events, and the path-scrub fix, (a) and New 3.
10. **interlock:** model registration and the optional release gate, (b) and (c).
