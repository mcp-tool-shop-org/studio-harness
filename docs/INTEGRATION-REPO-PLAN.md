# Integration repo for the trio work: plan, rev 2 (Book Keeper, 2026-10-24)

**Repo:** `mcp-tool-shop-org/studio-harness`. It's private, and the Publisher created it empty on 2026-10-24.
- The Director approved the name and gave the go.
- **No monorepo:** Attestia, Cognate, RepoMesh and interlock each keep their own repos, releases and Trusted
  Publishing. This repo only *uses* them, at pinned commits.
- **Rev 1** was sha256 7c7fb4d1.
- **Rev 2** folds in every finding from Argon's consult cf
  (`antigravity/replies/2026-10-24cf-integration-repo-plan.md`). The table at the end maps each finding to where it
  landed, and says where this plan departs from Argon's advice and why.

## Layout

```
studio-harness/
  README.md  LICENSE (MIT, © mcp-tool-shop)  SECURITY.md  CHANGELOG.md  .gitignore
  package.json  package-lock.json   # Node 22, "type": "module", npm; scripts: test, cross, scan, replay, queue
  pins.json                 # one entry per tool: repo, full 40-char sha, released version (if any), toolchain
  capabilities.json         # per tool and pin: which Phase 0 gaps are still open (see "Gap tests flip with pins")
  scripts/
    fetch-pins.mjs          # shallow clone at each pin into .pins/<tool>, build from source, link the trio together
    bump-pin.mjs            # bump-pin <tool> <sha>: rewrites pins.json, prints the diff, never pushes
    scan.mjs                # CI scanner: class patterns only (home paths, machine paths, account-id keys, emails,
                            #   HF/JWT/PEM/proxy-token patterns); no personal needles
  harness/
    lib/                    # hashing, the identity rule (account ids are sha256 only), event shapes, arg parsing
    phase0/replay.mjs       # the pure replay CLI only: --receipts (with a windows manifest), --worktrees|--pins, --out
    queue/                  # R&D's piece: queue.mjs (--store), POLICY.json (v2 dc37847f), EVENTS.md (v2 36f5dfc3)
    anchor/                 # Phase 2 run-record anchoring: builds and verifies offline only. Posting is a separate,
                            #   Publisher-approved run of RepoMesh's own workflow; no seed ever reaches this repo
  fixtures/
    receipts/               # synthetic windows + manifest.json: paid ok, paid stopped, CPU stub, lane; made-up ids
    external/               # synthetic stand-ins for the files replay hashes outside receipts (panel, design, scorer)
  tests/
    unit/                   # node --test, no network, no .pins
    cross/                  # the 15 Phase 0 gap probes plus the end-to-end replay, against .pins/, each in an
                            #   os.tmpdir() scratch dir with t.after() cleanup
  docs/
    PLAN.md  STUDIO-CONTEXT.md  INTEGRATION-REPO-PLAN.md
    phase0-findings.md      # the 21 findings in prose: no window ids, balances, receipt shas or quotes (see below)
  atlas/                    # Atlas map, made by @dogfood-lab/atlas@1.24.0
  .github/workflows/ci.yml
```

`.gitignore`: `out/`, `.pins/`, `node_modules/`, `coverage/`, `*.pem`, `*.key`, `keys/`, `.env*`.

## What moves, and what stays local

| Item | Where | Note |
|---|---|---|
| PLAN.md, STUDIO-CONTEXT.md, this plan | Repo, `docs/` | STUDIO-CONTEXT is rewritten for outsiders before any public flip (see Visibility) |
| replay.mjs, Job A (the replay) | Repo, `harness/phase0/replay.mjs`, about 350 lines | Windows are read from `<receipts>/manifest.json`, and external files from args. No hard-coded workspace (drive-letter) paths or window list |
| replay.mjs, Job B (15 gap probes, temp copies and junctions) | Repo, `tests/cross/*.test.mjs` | Each probe runs in an `os.tmpdir()` scratch dir with `t.after()` cleanup. Nothing is copied into an output dir, and no PEM is written |
| GAPS.md (real data) | **Local only**, `trio-runs/out/phase0/GAPS.md` | It holds real window ids, receipt shas, a Colab balance and an internal quote. See "Departures" |
| phase0-findings.md | Repo, `docs/` | Written fresh from GAPS.md. The tests in `tests/cross/` are the living record |
| queue POLICY.json, EVENTS.md, queue.mjs | Repo, `harness/queue/` | R&D repoints `rnd-2026-10-24-trio-queue-script.md` here |
| **The live queue store** | **Local only**, default `trio-runs/out/queue-store/`, set with `queue.mjs --store <dir>` | Its card events carry local ticket, card and reply paths and conversation ids |
| Event stores made from real data (attestia-events.jsonl, events.jsonl, ledger/, anchor/) | **Local only**, `trio-runs/out/` | Built from the Publisher's private receipts |
| The Publisher's receipts and the `-trio0` clones | **Local only** | Never copied into the repo |
| **Signing keys, XRPL seed, tokens** | **Never in any file** | Event-signing keys come from the environment or the OS credential store. The XRPL testnet seed stays in RepoMesh's Actions secret only. Tests make a throwaway Ed25519 key in memory |

After the move, `<trio-runs>/` keeps `out/` and a README pointing at the repo.

## Pins and cross tests

- **What `pins.json` holds:** each tool's repo, its full 40-character sha, its released version if any, and its
  toolchain.
  - attestia, cognate: pnpm@10;
  - repomesh: npm, plus separate `ledger/` and `anchor/xrpl/` installs;
  - interlock: Python 3.12 + uv.
  - The first pins are the Phase 0 shas (bd0176d, eea65c6, 67079b4, 7fbc75b), expanded to full shas.
- **How `fetch-pins.mjs` works:**
  - **Clone:** shallow-clones each public tool repo at its pin into `.pins/<tool>`, with no secret needed.
  - **Build from source:**
    - attestia and cognate: `corepack enable`, `pnpm install --frozen-lockfile`, `pnpm build`;
    - repomesh: `npm ci` at the root, in `ledger/` and in `anchor/xrpl/`;
    - interlock: `uv sync --frozen`.
  - **Link the trio:** it overrides Cognate's `@mcptoolshop/attestia` to `.pins/attestia/packages/attestia`, so an
    Attestia change is actually exercised through Cognate.
  - **Why from source:** the tests need repo-only parts that never ship in the packages: `@cognate/node`, and
    RepoMesh's `validate-ledger.mjs`, `compute-root.mjs`, `verifier.policy.json` and `ledger/nodes/`. A candidate
    commit has no package yet, either.
- **Published-surface check:** a small check runs for each pin that has a released version. It installs the released
  npm or PyPI package in a scratch dir, and asserts that the exports the harness uses exist, so source and package
  can't drift silently.
- **Where the cross tests live:** here, in `tests/cross/`.
  - Each tool's own CI keeps its fast unit and schema tests.
  - Before a release, each tool runs `gh workflow run ci.yml -R mcp-tool-shop-org/studio-harness -f override="<tool>=<sha>"`
    from its release checklist. That runs the cross tests with that one tool at its candidate commit.
- **Bumping a pin:** `node scripts/bump-pin.mjs <tool> <sha>`, then run `npm run cross` locally, then open a PR with
  the tool's changelog lines between the old and new pin. The Publisher merges. A pin never floats.
- **Gap tests flip with pins.**
  - At the Phase 0 pins, each of the 15 probes asserts that its gap is **present**. For example,
    `proveRecordedEvent` returns `attestia.event-not-found`, and `evaluated → evaluated` throws.
  - `capabilities.json` records, per tool and pin, which gaps are open.
  - The PR that bumps a pin past a Phase 1 fix flips that gap to closed in `capabilities.json`, in the same change.
    The probe then asserts the fixed behaviour. That's the same pattern as moving the Atlas pin and its map together.
  - A probe whose gap closes without a matching flip fails, so a fix is never unrecorded.
- **Later, optional:** a weekly pin-freshness job that opens PRs. It must meet the automation-rule conditions: not
  push-triggered, ubuntu-latest, a timeout, a concurrency block, workflow_dispatch, and it never pushes to main.

## CI (`ci.yml`, the only push-triggered workflow)

- **Triggers:**
  - `push` to `main`, paths-gated to `harness/**`, `scripts/**`, `tests/**`, `fixtures/**`, `pins.json`,
    `capabilities.json`, `package.json`, `package-lock.json`, `atlas/**` and `.github/workflows/**`;
  - `pull_request` with no paths filter (it's the required check);
  - `workflow_dispatch`, with an optional `override` input.
- **Bounds:** `ubuntu-latest`, `timeout-minutes: 20`, and concurrency
  `group: ${{ github.workflow }}-${{ github.head_ref || github.ref }}`, `cancel-in-progress: true`.
- **Setup:** Node 22, `corepack enable` (pnpm@10), Python 3.12, and `astral-sh/setup-uv`. Caches for
  `~/.local/share/pnpm/store`, `~/.npm` and `~/.cache/uv` are keyed on `hashFiles('pins.json')`.
- **Steps:**
  1. `npm ci`;
  2. `npm run scan`, the class-pattern scanner over every tracked file;
  3. unit tests;
  4. if `pins.json` has entries: `fetch-pins`, then the published-surface check, then `npm run cross`;
  5. coverage on `harness/`, with the floor enforced from PR 2 on (first measurement rounded down, ratcheting toward
     90);
  6. `npx --yes @dogfood-lab/atlas@1.24.0 check`.
- **Secrets:** none.

## Order of work

1. **Scaffold, straight to `main`** (repo-first rule):
   - **Files:** README, LICENSE (MIT, © mcp-tool-shop), SECURITY.md, CHANGELOG.md, `.gitignore`.
   - **package.json and package-lock.json:** no dependencies yet.
   - **An empty `pins.json`** (`{"tools": {}}`): steps 4 and 5 are skipped while it's empty.
   - **The scanner and one smoke unit test,** so steps 2 and 3 really run.
   - **ci.yml,** and `atlas/` made by `atlas map`.
   - **Before the push:** identity-scan.py with personal needles on a `git archive` of HEAD returns CLEAN, and the
     commit author is the org noreply address.
   - **After the push:** CI is green on that sha.
2. **PR 1, docs:** PLAN.md, STUDIO-CONTEXT.md, this plan, and phase0-findings.md. CI passes, since pins are still
   empty.
3. **PR 2, the harness:**
   - `harness/lib` and `phase0/replay.mjs`;
   - fixtures with their manifest;
   - unit tests and `tests/cross/` with the 15 probes;
   - `pins.json` at the Phase 0 shas and `capabilities.json` with all gaps open;
   - the coverage floor set.
4. **R&D's queue PR,** into `harness/queue/`, carded to Argon.
5. **Reviews and merges:** each PR gets an Argon review card, then the Publisher's merge. Before each one, I run
   identity-scan.py, the `%ae` check and the by-eye checks (no quotes, balances, account names or paths).

## Visibility

**Private to start.** Before it could go public:
- fixtures only, with no real window ids, balances or receipt shas anywhere in history;
- STUDIO-CONTEXT.md rewritten for outsiders, without internal seats or the private repo's owner;
- docs/phase0-findings.md re-read for the same;
- the identity scan CLEAN on HEAD, and `%ae` in history noreply only;
- shipcheck's hard gates (SECURITY.md, a threat model in the README, error shapes, CHANGELOG, LICENSE);
- the Publisher's go.

## Who owns what

| Area | Owner |
|---|---|
| This plan, the scaffold, `harness/phase0`, fixtures, `tests/cross`, `scripts/`, pins and bumps, CI | Book Keeper (code built by Argon through R&D's cards, or by me where the Publisher says so) |
| `harness/queue/` | R&D, through Argon cards |
| Phase 1 builds in the four tool repos | Argon via R&D's cards, one PR per repo per concern |
| Every merge, visibility, any testnet posting | Publisher |
| Direction | Director |

## Argon cf findings and where each one landed

| cf finding | In rev 2 |
|---|---|
| Name: not studio-ledger | `studio-harness`, the Director's choice. Argon had offered it as the broader alternative to `trio-runs` |
| fetch-pins from source plus an exports check | "Pins and cross tests", including the Cognate → Attestia link |
| Cross tests here, plus pre-release dispatch from each tool | "Pins and cross tests" |
| 1: ci paths missing atlas/** and the lockfile | CI triggers. `package-lock.json` is in the layout and the scaffold |
| 2: toolchains (pnpm@10, npm, Python 3.12 + uv) | `pins.json` toolchain field, fetch-pins, CI setup and caches |
| 3: GAPS.md holds a balance, a quote and real ids | GAPS.md stays local, and `docs/phase0-findings.md` is written fresh (see Departures) |
| 4: the queue store boundary | `out/queue-store/`, gitignored, and `queue.mjs --store` |
| 5: split replay.mjs | Job A becomes the CLI, and Job B becomes `tests/cross/`, using tmpdir and a windows manifest |
| 6: the scanner in CI | `scripts/scan.mjs` (class patterns), plus the local needle scan before every push |
| 7: pins and coverage-floor order | An empty pins file skips the fetch and cross steps. The floor starts in PR 2 |
| 8: tests moving from gaps to passes | `capabilities.json`, flipped in the same PR as the pin bump |

## Departures from Argon's advice

1. **GAPS.md:** Argon offered two choices, (a) regenerate it from fixtures or (b) scrub it and flag it for the
   visibility checklist. I chose neither as written.
   - **What I chose:** the real GAPS.md stays local, and the repo gets `docs/phase0-findings.md`, the 21 findings in
     prose with no window ids, balances, receipt shas or quotes.
   - **Why:** scrubbing a 49 KB report line by line risks missing something, and anything missed lives in git history
     for good. A fixture-regenerated report would lose the real-run evidence that made the findings credible. That
     evidence stays local, and the tests in `tests/cross/` carry the findings in executable form.
2. **The scanner in CI is a new script, not identity-scan.py.** identity-scan.py reads personal needles from
   `~/.grok/secrets/`, which must never reach CI. So `scripts/scan.mjs` carries only the class patterns Argon listed.
   The needle scan stays local, before every push, run by me.

Everything else follows Argon's advice as given.

## Standards compliance

| Standard | Score | Evidence |
|---|---|---|
| PIN_PER_STEP | 2 | Full-sha tool pins, the exact Atlas pin, and toolchains recorded per pin. Bumps go by PR only |
| ANDON_AUTHORITY | 2 | The required CI check fails on a scan hit, a cross failure or an unflipped gap. The local needle scan blocks a push |
| NAMED_COMPENSATORS | 2 | A scaffold push to main is undone by a revert commit (Publisher). A merged PR, by a revert PR (Publisher). A public flip, by flipping back to private (Publisher; caches persist, hence the checklist first) |
| DECOMPOSE_BY_SECRETS | 2 | Tool code stays in the tool repos. This repo holds integration, fixtures and pins. Real data and keys stay out |
| UNCERTAINTY_GATED_HUMANS | 2 | The Publisher reads this rev before the scaffold, and gates every merge, visibility change and posting |
| EXTERNAL_VERIFIER | 2 | Argon consulted on rev 1 (cf), and every PR gets an Argon review card |
