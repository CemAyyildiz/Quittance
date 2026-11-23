# JSON invoice backup verification

`GET /api/invoices/export?sellerPublicKey=<key>` returns an attachment containing the import contract's JSON array of invoice records. It exports every matching seller record, independent of UI filters and pagination. Customer email is absent unless `includeCustomerEmail=true`; line items are retained when present. The endpoint uses the same public-wallet scoping model as the existing invoice-list API and does not introduce an authentication claim.

From `frontend/`, start `npm run dev -- --hostname 127.0.0.1 --port 3103`, then run `node e2e/invoice-backup.evidence.cjs` with an installed Chrome browser. This intercepts deterministic API responses and checks the actual downloaded JSON, wallet query, default email exclusion, explicit opt-in and desktop/mobile controls. No transaction is signed or sent.

Validation against base `9c1f9e7`:

- Backend export tests: six pass, covering 61 records, foreign-wallet exclusion, email consent, exact fields/dates, line items and invalid queries.
- Frontend: all 714 tests pass (base: 711), including consent reset, successful download and retry.
- Backend: 574 tests pass with the same two failures reproduced on the base (issuer validation and legacy controller fixture). Backend TypeScript passes.
- Frontend TypeScript/build remain affected by the existing `lib/export.ts:787` html2pdf option-type diagnostic recorded in issue #1040's evidence.

The import endpoint is not on `main` yet: it is implemented by @emirykl in PR #1087 (head `f4ff878a32d08c513861b6e6c045bc2d1d1592d9`). After reviewing its entire diff, a separate integration worktree ran its five import tests plus an additional round-trip test using this branch's `createInvoiceBackup` serializer: all six passed. The extra check serializes paid and pending invoices, clears storage, imports through the actual HTTP route, and compares ids, memos, amounts, assets, statuses, hashes, dates and lookup indexes. #1087 must land for production restore to be available; this export PR does not copy or merge that contributor's implementation.
