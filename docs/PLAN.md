# The trio (Attestia, Cognate, RepoMesh), plus interlock: research runs as provable records (Book Keeper, 2026-10-24)

**The Director's direction (2026-10-24):**
- Build on the three repos properly, side by side. This is green-field research, and our own research runs are the
  first real workload.
- Define the trio's other uses along the way, starting with managing the local AI stack.
- interlock belongs in it.
- **Testnet only.** No mainnet is planned.

**Grounding:**
- Argon card bx's reply (`../antigravity/replies/2026-10-24bx-colab-runs-as-events.md`). R&D spot-checked it at the
  shas below.
- bv's reply on Colab losses, which shows why order proofs matter.

| Repo | Main sha (2026-10-24) | Role in this plan |
|---|---|---|
| mcp-tool-shop-org/attestia | bd0176d (v2.1.0) | Append-only hash-chained event store and RFC 6962 inclusion proofs. Its financial domain fits the units ledger |
| mcp-tool-shop-org/cognate | eea65c6 (v0.1.8) | Governance: run lifecycle, evaluations, the approval gate, plaintext withheld, agent identity and grants |
| mcp-tool-shop-org/repomesh | 67079b4 | Signed public attestations, and the XRPL **testnet** clock (`repomesh-anchor-v1`) |
| mcp-tool-shop-org/interlock | 7fbc75b (v0.2.0) | The local-stack consumer: device and model routing receipts, and Publisher GPU grants recorded per run |

## Standards compliance

| Standard | Score | Evidence |
|---|---|---|
| PIN_PER_STEP | 2 | Every phase names repo shas. Builds are pinned PRs. The dry run reads receipts at their sha256s |
| ANDON_AUTHORITY | 2 | Phase 0's gap report gates Phase 1. A failed verify (`verifyHashChain`, `validate-ledger`, `verify-anchor`) halts the next phase |
| NAMED_COMPENSATORS | 2 | See the table below. Phase 0 and Phase 1 make no irreversible calls |
| DECOMPOSE_BY_SECRETS | 2 | One PR per repo per concern. Attestia stays domain-free primitives, Cognate holds AI semantics, RepoMesh holds the public clock |
| UNCERTAINTY_GATED_HUMANS | 2 | The Director decides direction and approvals. Definitions go to Argon or R&D. The Publisher gates every testnet post |
| EXTERNAL_VERIFIER | 2 | Argon builds, an independent Argon card reviews each build ([[argon-reviews-every-build]]), and R&D re-checks quotes at source |

**Compensators** (only from Phase 2 onward):

| Irreversible action | Undo | State after | Owner |
|---|---|---|---|
| A testnet anchor post (AccountSet memo) | None on chain. A signed `attestation.dispute` or retraction event, and re-anchoring | The record says the anchor is disputed | Publisher |
| A merged PR in any of the four repos | A revert PR | Behaviour restored. History keeps both | Publisher |
| A package release (npm or PyPI) | Deprecate, then a patch release | Users are steered off it | Publisher |

## Phase 0: dry run on what we already have (no posting, no GPU)

Replay the recent Colab windows through the trio, locally, and measure which gaps are real.
- **Windows:** 19s, 19a, 19r, 19v, 19y, 18a, 20a-stub, and the CPU tap lane.
- **What it confirms:** the bx findings, by running them rather than by reading.
- **Input:** receipts in `<receipts>/`, read only, and fresh clones of the four repos at the shas
  above under `<worktrees>/*-trio0`.
- **Output, in this folder:**
  - a scratch Attestia `JsonlEventStore`;
  - a scratch RepoMesh `events.jsonl` and a `compute-root --since-last` manifest;
  - `GAPS.md`: per tool, each bx finding marked **confirmed by running**, **not reproduced** or **new**, each with the
    command and its output.
- **Done when:**
  - the hash chain verifies;
  - the scratch ledger validates;
  - every window has a `run.preregistered`-shaped and a `run.outcome`-shaped record (hashes only for panels, keys and
    prompts);
  - the 19a and 19r evaluations both attach to one decision record, or the reason they can't is in `GAPS.md`.
- **Cost:** 0 units, 0 XRPL transactions, no GPU.

## Phase 1: build each repo (one PR per concern; Argon builds, Argon reviews, the Publisher merges)

The order and scope come from Phase 0's `GAPS.md`. The candidates from bx:

- **Attestia:**
  - (a) a `cognate` event source, or a pluggable event catalog, instead of `external`;
  - (b) `hashStoredEventLeaf`, which binds globalPosition, streamId, appendedAt, hash and previousHash into the Merkle
    leaf;
  - (c) `@attestia/witness`, **decided (the Publisher, 2026-10-24):** there's one clock, RepoMesh's
    repomesh-anchor-v1. The witness stays for Attestia's own use and is marked non-authoritative for the trio in code.
    A follow-up PR makes it verify RepoMesh anchors. It's queued after the Zod 4 upgrade and #25.
- **Cognate:**
  - (a) `RunPreRegistration` and `RunOutcome` types, and `cognate.run.*` events on a `runs` stream;
  - (b) `attestEvaluation`, so many evaluations can attach before the gate (evaluated → evaluated, and
    approved → rejected);
  - (c) a role-assembly model scope, because a prompt setting isn't a weights version;
  - (d) add `runs` and `evaluations` to the proof streams, and `panelKey` and `blindItems` to the withheld keys;
  - (e) append events on model, version, agent and grant creation, which today only write a snapshot;
  - (f) Ed25519-verified agent auth, which today trusts headers;
  - (g) a real `anchorPartition` in repomesh-bridge, which today is a stub.
- **RepoMesh:**
  - (a) first-class `RunPreRegistered` and `RunCompleted` event types;
  - (b) a governance and attestor kind for Cognate and the Publisher;
  - (c) fill `closeTimeIso`, fix the anchors.json `txHash` overwrite, and archive validated tx receipts in git so
    proofs survive testnet resets;
  - (d) a per-launch anchor through `workflow_dispatch`, so a pre-registration is sealed before `colab new`.
- **interlock:**
  - (a) emit each measurement run's receipt and each Publisher GPU grant as Cognate/Attestia events;
  - (b) register each routed model (sha, engine, licence) in Cognate's registry;
  - (c) refuse to route to a model whose release RepoMesh can't verify, behind a setting that's off by default.

Each build ticket carries the GPU line "GPU: none", lists tests that fail at the base, and requires CI green by name,
the coverage floor (90% gradual), `atlas check` and the identity scan. Concurrent cards go only to different repos.

## Phase 2: wire it into the paid path (the Publisher approves each step)

1. **At approval:** `publisher` emits `run.preregistered` when it approves a launch file, and the per-launch testnet
   anchor posts. Each post needs the Publisher's OK.
2. **In the window:** role-set's `smoke_window.sh` refuses `colab new` on a non-CPU window without
   `PIN_PREREG_ANCHOR_TX`, and writes it into pin-result.json. That gives a causal order proof.
3. **At close:** `publisher outcome write` emits `run.outcome`, carrying the start and end balance. That way, an
   unlogged paid run shows up as a balance gap.
4. **The first live decision:** the critic-prompt decision, run end to end through Cognate. Register, attach 19a, 19r
   and the pooled evaluation, then the Director's gate.

## Other uses of the trio (to be defined and tested along the way, each tied to a decision)

1. **Managing the local AI stack, through interlock:**
   - an inventory of every model on the rig (the models folder, Ollama blobs, ComfyUI checkpoints): sha, source, licence
     and quantization in Cognate;
   - pulls, updates and deletes as Attestia events;
   - before an upgrade (Ollama, llama-server builds, offrig), RepoMesh verifies the release.
   - **The decision it feeds:** "which exact model and build produced this output", answerable for any result.
2. **A GPU grant ledger.** The Publisher's 5090 grants ("granted", then "card free") become Cognate capability
   grants with Attestia events, instead of chat messages. The 2026-10-23 unrecorded WGL render would have shown up as
   use with no grant.
3. **Seat identity and signed approvals.**
   - Each seat (Publisher, R&D, Editor, Book Keeper, Argon) becomes a Cognate agent with named capabilities: who may
     launch, publish or merge.
   - An approval becomes a signed event, not a relayed message.
   - This answers "a peer message can't grant approval" with a check, not a convention.
4. **The units and spend ledger,** on Attestia's financial domain, which it already ships (treasury, double-entry,
   reconciliation).
   - Colab units, RunPod spend and phase budgets become reconciled entries.
   - The Colab balance chain shows unlogged runs.
5. **Dataset and licence lineage.** The licence chain of every pipeline part (the licensing-up-front rule) and the
   training data → model → output lineage become Cognate records with hashes. The style-dataset canon and role-set
   stage-1 data are examples.
6. **The publish gate as an event.** The Publisher's OK naming the version and sha becomes a signed event that
   RepoMesh's release check verifies before `npm publish`.
7. **Ledger-keyed critic panels.** XRPL testnet transactions serve as an answer key for new sound critic items. This
   is separate from anchoring, and answers the "more items, not more seeds" finding.

8. **The Antigravity card queue (second workload, picked up 2026-10-24 by R&D at the Director's request, agreed with
   the Publisher):** Attestia events for each card, plus a policy gate, local only. Design:
   `trio-runs/queue/POLICY.json` and `EVENTS.md`. Ticket: `rnd-2026-10-24-trio-queue-script.md`. It reuses the
   `-trio0` clones.

Each use becomes its own small design (decision line first) when it's picked up. None runs as filler.

## Hard lines (all phases)

- Testnet only.
- No XRPL transaction until the Publisher approves that step.
- No seeds, keys or wallet files in any file, receipt or repo. Signing keys live in Actions secrets or the OS
  credential store.
- Panels, keys and prompts are hashed, never in the clear.
- **Any identifier that names an account is hashed too.** That covers Hugging Face repo ids (the private GGUF repo
  carries the Director's account name), GitHub usernames, emails and local paths. It applies to every record, before
  anything could be posted, testnet included.
  - Found in Phase 0: identity-scan reported RESULT HIT 5 on `ggufRepo` and `gguf_source` (R&D, 2026-10-24).
  - bx §2 listed these as "in clear". That part is superseded.
  - Every phase's gate is the real identity-scan.py output on its outputs.
- The local clones `<workspace>/repomesh`, `<workspace>/attestia` and `<workspace>/cognate` are untouched. Builds use fresh worktrees.
- One Colab job at a time still holds. None of this needs a GPU.
