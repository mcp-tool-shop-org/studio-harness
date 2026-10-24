# Changelog

## Unreleased

- Docs: README and SECURITY.md checked against the code. Security reports go by email (private vulnerability
  reporting isn't offered on a private repo); the scanner's list of classes now names XRPL seeds and tailnet hosts;
  the stale "once PR 1 lands" is gone.
- scan.mjs, after Argon's review (card ck): admin-share and any-case drive homes; WSL, Cygwin and UNC machine
  paths; account ids in YAML, Python, JS and env forms; GitHub, OpenAI, Slack and AWS tokens; Ed25519 XRPL seeds;
  tailnet hosts; percent- and base64-decoded views of each line; exact sender addresses allowed (never a whole real domain); package specifiers no
  longer read as emails. Negative controls for every form, and its own source now scans clean, so the self-skip is
  gone.
- Docs: the trio plan, the studio context for builders, the integration-repo plan (rev 2), and the Phase 0 findings
  written fresh (no window ids, balances, receipt hashes or quotes).
- Scaffold: README, LICENSE (MIT), SECURITY.md, the class-pattern scanner (`scripts/scan.mjs`) with unit tests, an
  empty `pins.json`, CI and the Atlas map.
