# Cross probes: state at pause (2026-10-24)

PR 2 is paused behind the Phase 1 product PRs (develop first, then test). Every probe below was run against the
pinned code (attestia bd0176d, cognate eea65c6, repomesh 67079b4, interlock 7fbc75b) and reproduces its gap for the
stated reason. Each becomes a gap() test when PR 2 resumes.

| Gap | What the pinned code does | Flips with |
|---|---|---|
| attestia.event-source-cognate | `isEventMetadata` rejects `source: "cognate"`, accepts `external` | attestia #25 |
| attestia.witness-accepts-unvalidated | `XrplVerifier.verify` returns `verified: true` for an unvalidated, tecPATH_DRY tx from an untrusted account | attestia witness PR (GAPS §3 PR 2) |
| cognate.proof-leaf-unbound | `proveRecordedEvent` gives the same root and leaf when appendedAt, previousHash and hash are tampered (the hash chain catches it; the proof alone does not) | cognate proof PR (GAPS §3 PR 7), after attestia #25 |
| cognate.single-evaluation | `evaluated -> evaluated` throws INVALID_TRANSITION | cognate evaluations PR (GAPS §3 PR 6) |
| cognate.approved-cannot-reject | `approved -> rejected` throws INVALID_TRANSITION | cognate evaluations PR (GAPS §3 PR 6) |
| cognate.runs-stream-unprovable | an event on `cognate-<tenant>-runs` returns `attestia.event-not-found` | cognate proof PR (GAPS §3 PR 7) |
| cognate.panelkey-not-withheld | an event whose payload holds `panelKey` is served with a proof | cognate proof PR (GAPS §3 PR 7) |
| cognate.creation-unattested | `POST /registry/models` returns 200 and appends 0 events | cognate proof PR (GAPS §3 PR 7) |
| cognate.header-only-auth | `authenticate` accepts headers alone, with no signature | cognate auth PR (GAPS §3 PR 8) |
| repomesh.no-run-attestation-type | validate-ledger: "attestations/0/type must be equal to one of the allowed values" | repomesh run types PR (GAPS §3 PR 3) |
| repomesh.governance-cannot-sign | validate-ledger: signer kind must be one of {attestor, registry}, even when trusted | repomesh run types PR (GAPS §3 PR 3) |
| repomesh.anchor-close-time / anchors-index-txhash | committed ledger.anchor notes carry `closeTimeIso: null`; anchors.json release entries `all` with `txHash: null` | repomesh anchors PR (GAPS §3 PR 4) |
| interlock.scrub-misses-drive-paths | receipt validation (`receipt.py` `_HOME`, `_UNC`) has no drive-letter or WSL mount rule | interlock PR (GAPS §3 PR 9) |

Contract (passes today): RepoMesh accepts an event signed over the canonical hash's 32 bytes and rejects one signed
over the UTF-8 JSON (New 1). A probe's baseline case (attestor kind, trusted, `provenance`) validates, so each failing
case fails for its own reason.

Not probed (they describe something that doesn't exist yet, so a probe would only check a name is missing): Cognate
run types (a), role-assembly scope (c), RepoMesh per-launch anchor (d), interlock events, registration and release
gate, New 2, New 4. Cognate `anchorPartition` (g) is pending by design (Cognate holds no XRPL keys); that is a design
question, not a defect.
