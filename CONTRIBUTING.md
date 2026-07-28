# Contributing to Quittance

Thanks for contributing. Quittance is an invoice-and-proof tool for freelancers on Stellar. See [`README.md`](./README.md) for an overview and [`PLAN.md`](./PLAN.md) for the product and delivery plan.

## House rules

- **English only** — code, comments, docs, UI strings, and commit messages.
- **One issue = one PR.** Do not bundle multiple Wave issues or unrelated changes in the same PR.
- **Owned files only.** Only touch the files listed in the issue's _Context_ / _Owned files_ section. If the issue says "Own CONTRIBUTING.md only," do not edit anything else.
- **Do not touch hot paths.** The issue lists hot files that are off-limits. Respect that list exactly.
- **Do not edit** `package.json`, `package-lock.json`, `vitest.config.ts`, or `contracts/Cargo.toml` unless the issue explicitly owns that tooling path.

## Wave — single-file ownership and no bundling

Quittance uses a **[Wave](https://www.drips.network/)** contribution system. Every Wave issue is scoped to a specific set of files. The core rules:

1. **Single-file ownership.** Each issue owns exactly the file(s) listed in its _Context_ block. If the issue says _"Own CONTRIBUTING.md only,"_ your PR must contain only changes to `CONTRIBUTING.md`.
2. **No bundling.** Do not combine two Wave issues in one PR. Do not slip in refactors, unrelated fixes, or "while I'm here" changes. If it is not part of the issue's owned files, it does not go in the PR.
3. **One PR per issue.** Open one PR per assigned Wave issue. The PR description should reference the issue number.

Before starting, read the issue carefully: the _Context_ tells you which files you own, the _Rules_ tell you what not to touch, and the _Acceptance criteria_ tell you what must be true when you are done.
