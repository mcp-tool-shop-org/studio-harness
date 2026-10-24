# Studio context for Argon on the trio work (Book Keeper, 2026-10-24)

Things only we know, which a brief has to carry because Argon can't see them. Read this with every trio card.

## Identity: what must never appear in the clear in a record

- **Our account names.** The studio's public author is `mcp-tool-shop`, and the private Hugging Face GGUF repo's
  owner name is the Director's own account. Any id that contains an account name gets hashed: HF repo ids, GitHub
  usernames, emails, Windows or WSL home paths.
  - The 2026-10-24 Phase 0 draft carried `ggufRepo` and `gguf_source` in the clear. That was our brief's gap, not
    Argon's.
- **Panels, answer keys, prompts and inputs.** Hash these too. Don't open `panel-key.HIDDEN.jsonl`; its sha256 is
  pinned in `critic-false-refusals/build_bench_inputs.py`.
- **What the scanner won't catch.** Check these by eye before anything is committed:
  - **The studio's never-quote law** (`F--AI/memory/Feedback/feedback_never_quote_the_director.md`): record
    decisions, not utterances. The quote-gate hook enforces it on Claude's writes, but not on Argon's outputs.
  - **Real Colab balances and spend figures:** these come from the Publisher's receipts and stay in local outputs
    only.
  - Found 2026-10-24 by Argon's consult cf: GAPS.md:620-623 and :740. The identity scan was CLEAN.
- **Secrets.** No tokens, seeds or keys in any output. The colab CLI can print a colab runtime proxy token (a JWT) in
  failed-upload URLs.

## How to check

- **The scanner:** `python %USERPROFILE%\.grok\bin\identity-scan.py <path>`. Its rules are `CLASS_PATTERNS` at
  about line 40.
- **Before handing back:** run it on every output folder and paste its full output, RESULT line included.
- **If it reports HIT:** hash the field it names and re-run.
- The Book Keeper also runs it on every hand-back.

## Hard lines

- **Security advisories are fixed at the root** (Director's decision, 2026-10-24).
  - Never use audit ignores, overrides or lowered audit levels.
  - CI stays red until the real fix lands, for example a dependency upgrade in its own PR.
  - A feature PR never touches the audit config.
- XRPL testnet only. No XRPL transaction unless the Publisher has approved that exact step.
- GPU: none, unless the Publisher grants it.
- Receipts are read only. Use fresh `-trio*` clones. Never touch `<workspace>/repomesh`, `<workspace>/attestia`, `<workspace>/cognate`.

## Who's who

- **The Director** sets direction.
- **The Publisher** approves spend, merges and any posting.
- **R&D** sends the cards and designs the experiments.
- **Colab:** the Publisher approves and books every job, one job at a time. The Book Keeper launches, watches and
  closes each one (confirmed by the Publisher, 2026-10-24).
- **The Book Keeper** also works the trio with you.
- **Questions** go back through R&D: ask, don't guess.
