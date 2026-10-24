# Security

## Reporting

Report a vulnerability privately through GitHub's "Report a vulnerability" (Security advisories) on this repository.
Don't open a public issue.

## What this repo holds

- Harness code, synthetic fixtures, tool pins and tests. No real records, receipts, keys, seeds or tokens.
- CI needs no secrets. `scripts/scan.mjs` runs on every tracked file and fails the build on a home or machine path,
  a personal email, an unhashed account id, a token, a JWT or a private key.

## Advisories

A dependency advisory is fixed at the root, by upgrading or replacing the dependency. Audit ignores, overrides and
lowered audit levels are not used.
