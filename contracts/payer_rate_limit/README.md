# payer-rate-limit

Limits the number of payment attempts a single payer address can make
within a ledger window.

This is a self-contained learning/utility crate in the same family as
`contracts/quittance_receipt_hash` and `contracts/destination_guard`. It
ships and is tested entirely on its own — it is **not** wired into the
frontend, backend, or any other contract in this repo, and it is **not**
a member of the root `contracts/` Cargo workspace.

## What it does

`PayerRateLimiter` keeps an in-memory, per-payer log of the ledger
sequence numbers at which payment attempts were recorded, and answers
whether a payer has made too many attempts within a trailing window of
ledgers.

- The window is `[ledger - window + 1, ledger]` (inclusive), so a
  `window` of `0` only counts the current ledger.
- A payer with no recorded attempts is never rate limited.
- Attempts naturally fall out of the window as the ledger advances, so a
  previously rate-limited payer recovers once their old attempts age
  out — this is a sliding window, not a fixed one.

## Public API

```rust
pub struct PayerRateLimiter { /* .. */ }

impl PayerRateLimiter {
    pub fn new() -> Self;

    pub fn record_attempt(&mut self, payer: &str, ledger: u32) -> u32;

    pub fn is_rate_limited(
        &self,
        payer: &str,
        ledger: u32,
        window: u32,
        max_attempts: u32,
    ) -> bool;

    pub fn attempts_in_window(&self, payer: &str, ledger: u32, window: u32) -> u32;
}
```

```rust
use payer_rate_limit::PayerRateLimiter;

let mut limiter = PayerRateLimiter::new();
limiter.record_attempt("GPAYER", 100);
limiter.record_attempt("GPAYER", 101);
limiter.record_attempt("GPAYER", 102);

assert!(limiter.is_rate_limited("GPAYER", 102, /* window */ 5, /* max_attempts */ 3));
```

## Build & test

```sh
cargo test --manifest-path contracts/payer_rate_limit/Cargo.toml
cargo clippy --manifest-path contracts/payer_rate_limit/Cargo.toml --all-targets -- -D warnings
```
