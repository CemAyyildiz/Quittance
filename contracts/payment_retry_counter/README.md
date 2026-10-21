# payment-retry-counter

Standalone Soroban contract for counting retry attempts against a failed payment
reference. Each reference has its own persistent count. This crate is not wired
into the Quittance payment flow or any other contract.

## What it does

The caller chooses a `max_retries` cap on each call. `record_attempt` atomically
checks that the current count is below the cap, then increments it. At the cap
it returns `RetryLimitReached` (error code 1) and leaves the count unchanged.
`can_retry` performs the same check without writing. A zero cap rejects all
attempts. Counts start at zero and are tracked separately per `Symbol`.

The cap is **not** saved: a later call can supply a larger cap. Callers that
need a fixed policy must consistently provide the same cap. This primitive
does not verify that a payment failed or authenticate who reports an attempt;
an integrating contract must handle those rules. Persistent entries are
extended to 120 days when written and can expire if left untouched.

## Public API

```rust
record_attempt(env: Env, reference: Symbol, max_retries: u32) -> Result<u32, Error>
can_retry(env: Env, reference: Symbol, max_retries: u32) -> bool
get_attempts(env: Env, reference: Symbol) -> u32
```

`record_attempt` returns the new count. `get_attempts` returns zero for an
unseen reference. The contract is deployed without constructor arguments.

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/payment_retry_counter/Cargo.toml --target wasm32v1-none --release
cargo test --manifest-path contracts/payment_retry_counter/Cargo.toml
cargo clippy --manifest-path contracts/payment_retry_counter/Cargo.toml --all-targets -- -D warnings
```

The four test files cover successful recording, cap boundaries, rejected
attempts, and independent payment references. This crate declares its own
`[workspace]` and is not a member of `contracts/Cargo.toml`.
