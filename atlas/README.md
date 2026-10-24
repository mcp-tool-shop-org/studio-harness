# studio-harness: how it works

Mapped at 2026-10-24 from commit b2b3fa1 by Atlas 1.24.0.

## What this is

Integration harness for Attestia, Cognate, RepoMesh and interlock, tested together at pinned commits. (written by a person)

4 parts, mostly JavaScript (2 files). Work enters through 1 door; the busiest is CI, which reaches 2 parts.

## What changed since the last map

This is the first map.

## What comes in

1. **CI.** On a pull request to main; on a push to main touching 10 paths; or by hand. Runs scripts/scan.mjs and tests/.

## What happens through CI

1. The workflow runs scripts/scan.mjs in scripts and tests/ in tests.
2. It runs git.

## Who reads the results

CI writes nothing this map can see.

## What breaks what

- **scripts** is imported only from tests, by 1 part (tests), and sits on the path of 1 door.

## What tends to change together

No two source files changed together often enough to name.

Window: 180 days; a pair counts from 3 shared commits, since the window holds fewer than 30 qualifying commits.

## What no test touches

Every code part is imported by at least one test.

## Written but never read

No place this map can see is written, so none goes unread.

## Helpers that look duplicated

No two parts export a helper that looks alike.

## Generated, never hand-edited

Nothing in this repository writes to a tracked place this map can see.

## Hand-authored

People write .github/ and the repository root. Nothing in this repository writes to them.

## Where to start

.github/workflows/ci.yml → scripts/scan.mjs

Read those in order to follow one pull request end to end.

## What this map cannot see

- 1 read uses a path built at run time and is not named here.
- Statistics confidence is low: fewer than 30 qualifying commits in the window, and fewer than 20 source files reach 10 revisions.

Regenerate with `npx --yes @dogfood-lab/atlas map`.
