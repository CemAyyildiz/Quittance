# Seller display name verification

The screenshots use deterministic invoice data and intercepted API responses; no wallet is connected to a network and no transaction is submitted. The browser assertions cover the visible seller label and destination key on both pages, plus the create-form field at desktop and mobile widths.

Reproduce from `frontend/` with `npm run dev -- --hostname 127.0.0.1 --port 3101` running, then `node e2e/seller-display-name.evidence.cjs` (an installed Chrome browser is used).

Validation against base `9c1f9e7`:

- Backend: `npm test` reports 574 passing tests and the same two pre-existing failures as the unmodified base (568 passing): malformed USDC issuer validation and the legacy controller asset-mismatch fixture. The six new HTTP tests pass, including persistence, whitespace/length boundaries and public-key-only payment verification.
- Frontend: `npm test` passes all 714 tests (base: 711).
- Backend: `npx --no-install tsc --noEmit` passes.
- Frontend typecheck and production build reach the same existing `lib/export.ts:787` html2pdf option-type error on both the base and this branch; no new diagnostic is introduced.
