# studio-harness

The integration harness for the trio, [Attestia](https://github.com/mcp-tool-shop-org/attestia), [Cognate](https://github.com/mcp-tool-shop-org/cognate) and [RepoMesh](https://github.com/mcp-tool-shop-org/repomesh), plus [interlock](https://github.com/mcp-tool-shop-org/interlock).
It holds no tool code and no real records. Each tool keeps its own repo, releases and Trusted Publishing. This repo
pins each one to an exact commit and tests them together.

## What's here

- `pins.json`: the commit each tool is tested at. A pin never floats. It moves by pull request.
- `scripts/scan.mjs`: a class-pattern scanner run on every tracked file in CI. It flags home and machine paths,
  personal emails, unhashed account ids, tokens, JWTs and private keys, and reports file:line:class only.
- `tests/`: unit tests here, and cross-tool tests against the pinned tools as they land.

The harness, fixtures and cross tests are added by pull request. The plan is in `docs/` once PR 1 lands.

## Rules

- No keys, seeds or tokens in any file. Signing keys come from the environment. The XRPL testnet seed lives only in
  RepoMesh's own Actions secret.
- Real event stores and receipts stay outside the repo. Only synthetic fixtures are committed.
- XRPL testnet only.

## Develop

```
npm ci
npm test
npm run scan
```

## License

MIT, © mcp-tool-shop.
