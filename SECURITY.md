# Security

## Reporting

Report a vulnerability privately by email to rnd@mcptoolshop.com. Don't open a public issue.

## What this repo holds

- Harness code, synthetic fixtures, tool pins and tests. No real records, receipts, keys, seeds or tokens.
- CI needs no secrets. `scripts/scan.mjs` runs on every tracked file and fails the build on a home or machine path,
  a personal email, an unhashed account id, a token, an XRPL seed, a JWT, a private key or a tailnet host.

## Advisories

A dependency advisory is fixed at the root, by upgrading or replacing the dependency. Audit ignores, overrides and
lowered audit levels are not used.
