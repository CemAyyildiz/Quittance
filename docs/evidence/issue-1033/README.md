# Invoice keyboard verification

From `frontend/`, start `npm run dev -- --hostname 127.0.0.1 --port 3102`, then run `node e2e/invoice-keyboard.evidence.cjs` using an installed Chrome browser. Deterministic API fixtures and a local test wallet-state fixture are used. No wallet signing or network transaction occurs.

The browser checks keyboard submission, focus on the first invalid field, associated visible labels, amount-to-asset tab order, visible focus outlines and the pay button's accessible name/type at 1440px and 390px. Four screenshots show invalid-field focus and dashboard labels.

`npm test` passes all 718 frontend tests (base: 711). New tests cover input labels, focus order, invalid-submit announcements, no focus move on valid submission, and absent/present email proof actions. `npx --no-install tsc --noEmit` reports only the pre-existing `lib/export.ts:787` html2pdf option-type error also reproduced on unmodified base `9c1f9e7`.
