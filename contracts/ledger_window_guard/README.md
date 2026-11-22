# ledger-window-guard

Generic ledger timestamp window guard for Quittance on Stellar.

This crate answers one reusable question with a single predicate: **is this
timestamp within `[start, end]`?** It is the "grace period", "retry window",
"TTL check" primitive in generic form — any subsystem that needs to decide
whether a moment in time falls inside a ledger timestamp window can call it.

The guard is deliberately **overflow-free**: it only ever compares integers,
never subtracts them, so no combination of inputs can wrap, underflow, or
panic. A malformed (inverted) window matches nothing instead of silently
corrupting the comparison.

This crate is a **standalone Soroban contract**. It is not wired into the
Next.js / Express MVP demos, it stores nothing on chain, and it is not a
member of the `contracts/Cargo.toml` workspace.

## What it does

Given three `u64` values it returns a single `bool`:

| Input | Result | Reason |
|-------|--------|--------|
| `start <= ts <= end` | `true` | Inside — both bounds are inclusive. |
| `ts < start` | `false` | Before the window opened. |
| `ts > end` | `false` | After the window closed. |
| `start > end` (inverted) | `false` | Malformed window matches nothing. |

## Rules

1. **Both bounds are inclusive** — `ts == start` and `ts == end` are inside
   the window.
2. **Inverted windows are empty** — `start > end` returns `false` for every
   `ts`; the window is never silently repaired or reordered.
3. **Overflow-safe arithmetic** — no `ts - start` or `end - start` is ever
   computed from caller input. The companion `window_len` helper uses
   `u64::checked_sub`, so an inverted window is reported as `None` rather
   than wrapping to a huge number (or panicking with overflow checks on).
4. **Read-only** — no storage, no configuration, no authorization. The same
   inputs always produce the same output.

## Public API

```rust
// Contract entry point (Soroban).
pub fn in_window(env: Env, ts: u64, start: u64, end: u64) -> bool

// Free functions — the same predicates off-chain, without a host.
pub fn in_window(ts: u64, start: u64, end: u64) -> bool
pub fn window_len(start: u64, end: u64) -> Option<u64>

// Owned value type bundling a bound pair.
pub struct Window { pub start: u64, pub end: u64 }
impl Window {
    pub fn new(start: u64, end: u64) -> Self
    pub fn contains(&self, ts: u64) -> bool
    pub fn span(&self) -> Option<u64>
    pub fn is_inverted(&self) -> bool
}
```

## Usage

```rust
use ledger_window_guard::{LedgerWindowGuard, LedgerWindowGuardClient};
use soroban_sdk::Env;

let env = Env::default();
let contract_id = env.register(LedgerWindowGuard, ());
let client = LedgerWindowGuardClient::new(&env, &contract_id);

// A retry window of 300 seconds, opened at t = 1_000_000.
let start = 1_000_000_u64;
let end = 1_000_300_u64;

assert!(client.in_window(&1_000_150, &start, &end)); // inside
assert!(client.in_window(&1_000_000, &start, &end)); // exactly start
assert!(client.in_window(&1_000_300, &start, &end)); // exactly end
assert!(!client.in_window(&1_000_301, &start, &end)); // too late
assert!(!client.in_window(&1_000_150, &end, &start)); // inverted window
```

Off-chain, the identical predicate is available as a free function:

```rust
use ledger_window_guard::{in_window, window_len};

assert!(in_window(150, 100, 200));
assert_eq!(window_len(100, 200), Some(100));
assert_eq!(window_len(200, 100), None); // inverted, no underflow
```

## Tests

```bash
cargo test --manifest-path contracts/ledger_window_guard/Cargo.toml
cargo clippy --manifest-path contracts/ledger_window_guard/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **Happy path** — timestamps clearly inside / outside a well-formed window,
  contract and free-function results agreeing.
- **Edge / boundary** — `ts` exactly at `start` and `end`, single-instant
  windows (`start == end`), `window == 0`, and the `u64` extremes
  (`0 ..= u64::MAX`) without overflow.
- **Failure cases** — inverted windows match nothing, timestamps just
  outside the bounds are rejected, `window_len` returns `None` for
  malformed windows, all without panicking.
- **Scenarios** — retry grace windows, hourly timestamp buckets, and a
  window re-evaluated as ledger time advances.

## Out of scope (this PR)

- Wiring into the Next.js or Express MVP demos.
- Deployment scripts or testnet/mainnet deployment.
- Cross-contract calls to other crates in this repo.
- Any change to `frontend/`, `backend/`, or any other contract.

## License

MIT.
