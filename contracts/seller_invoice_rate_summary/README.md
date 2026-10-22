# seller-invoice-rate-summary

Rolling invoice-creation rate summary for Quittance on Stellar.

Rate limits say *no*; this primitive says *how many*. Given a seller's
recorded invoice-creation ledger numbers, it reports **how many invoices
were created within a caller-specified recent ledger window** — a
read-only, reporting counterpart to rate-limiting primitives, with no
rejection behavior of its own.

The contract stores nothing and never rejects: it counts entries in the
caller's own list and returns the number (or a small summary snapshot
pairing the count with the window it answers for).

This crate is a **standalone Soroban contract**. It is not wired into the
Next.js / Express MVP demos, it makes no cross-contract calls, and it is not
a member of the `contracts/Cargo.toml` workspace.

## What it does

Given the recorded creation ledgers, the current ledger, and a window
width, it returns how many entries fall inside the window:

| Input | Result | Reason |
|-------|--------|--------|
| Entry with age `< window` | counted | Inside the window. |
| Entry with age `== window` | not counted | The window spans exactly `window` ledgers. |
| Entry `> current_ledger` | not counted | Future-dated records are ignored. |
| `window == 0` | `0` | An empty window holds nothing. |
| Empty list | `0` | Nothing to count. |

## Window semantics

The window covers the `window` most recent ledgers, **ending at and
including `current_ledger`**:

- `window == 10`, `current_ledger == 100` → ledgers `91 ..= 100`;
- an entry at ledger `90` (exactly 10 ledgers old) is **excluded**;
- an entry at ledger `91` (9 ledgers old) is **included**;
- `window == 1` contains only `current_ledger`;
- a window reaching before ledger `0` saturates at `0`;
- duplicates count separately (two invoices in one ledger are two
  invoices), unsorted input changes nothing, and future-dated entries are
  ignored rather than clamped;
- the count accumulates with `u32::saturating_add`, so no input list can
  wrap the counter.

## Public API

```rust
// Contract entry points (Soroban).
pub fn count_in_recent_window(
    env: Env,
    creation_ledgers: Vec<u32>,
    current_ledger: u32,
    window: u32,
) -> u32

pub fn summarize(
    env: Env,
    creation_ledgers: Vec<u32>,
    current_ledger: u32,
    window: u32,
) -> RateSummary

// Free functions — the same logic off-chain, over any u32 iterator.
pub fn count_in_recent_window<I: IntoIterator<Item = u32>>(
    creation_ledgers: I,
    current_ledger: u32,
    window: u32,
) -> u32
pub fn is_recent(ledger: u32, current_ledger: u32, window: u32) -> bool
pub fn window_start(current_ledger: u32, window: u32) -> u32

// Summary snapshot returned by `summarize`.
pub struct RateSummary {
    pub count: u32,
    pub current_ledger: u32,
    pub window: u32,
}
impl RateSummary {
    pub fn new(count: u32, current_ledger: u32, window: u32) -> Self
    pub fn window_start(&self) -> u32
    pub fn is_empty(&self) -> bool
}
```

## Usage

```rust
use seller_invoice_rate_summary::{
    SellerInvoiceRateSummary, SellerInvoiceRateSummaryClient,
};
use soroban_sdk::{vec, Env};

let env = Env::default();
let contract_id = env.register(SellerInvoiceRateSummary, ());
let client = SellerInvoiceRateSummaryClient::new(&env, &contract_id);

// Invoices created at ledgers 95, 98, 100 and 120.
let creation_ledgers = vec![&env, 95_u32, 98, 100, 120];

// At ledger 100 the last 10 ledgers (91..=100) hold three of them;
// ledger 120 is future-dated relative to 100 and is ignored.
assert_eq!(client.count_in_recent_window(&creation_ledgers, &100, &10), 3);

// Advance to ledger 105: 95 is now exactly 10 ledgers old and drops out.
assert_eq!(client.count_in_recent_window(&creation_ledgers, &105, &10), 2);

// The summary pairs the count with the window it answers for.
let summary = client.summarize(&creation_ledgers, &100, &10);
assert_eq!(summary.count, 3);
assert_eq!(summary.window_start(), 91);
assert!(!summary.is_empty());
```

Off-chain, the identical logic is a free function over any `u32` iterator:

```rust
use seller_invoice_rate_summary::count_in_recent_window;

// Window of 10 ending at 100 covers ledgers 91..=100.
assert_eq!(count_in_recent_window([95_u32, 91, 90, 100], 100, 10), 3);
```

## Tests

```bash
cargo test --manifest-path contracts/seller_invoice_rate_summary/Cargo.toml
cargo clippy --manifest-path contracts/seller_invoice_rate_summary/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **Happy path** — in-window entries counted, out-of-window entries not,
  contract and free-function results agreeing.
- **Edge / boundary** — an entry exactly `window` ledgers old excluded vs.
  one ledger newer included, `window == 1`, `current_ledger == 0`,
  `window == u32::MAX`, `u32::MAX` ledgers without overflow, and
  saturation of `window_start` at ledger `0`.
- **Failure / degenerate input** — empty list, `window == 0`,
  future-dated entries ignored, duplicates counted separately without
  wrapping, and unsorted input producing identical counts.
- **Scenarios** — a sliding window whose count rises and then decays as
  `current_ledger` advances, two sellers' lists summarized independently,
  and order-independence of the summary.

## Out of scope (this PR)

- Wiring into the Next.js or Express MVP demos.
- Deployment scripts or testnet/mainnet deployment.
- Cross-contract calls to other crates in this repo.
- Any actual rate-limiting / rejection behavior (this issue is the
  reporting primitive only; enforcement would be a separate issue).
- Any change to `frontend/`, `backend/`, or any other contract.

## License

MIT.
