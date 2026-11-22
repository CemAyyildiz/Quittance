# Payment duplicate window guard

A standalone Soroban contract that tracks the latest accepted ledger for each
payment reference. A reference is a duplicate from its recorded ledger through
`window` ledgers after it, inclusive. It becomes reusable once that interval
has elapsed.

This crate is not connected to Quittance's frontend, backend, or other
contracts, and is intentionally not a member of the root workspace.

## Public API

```rust
record_reference(reference: Symbol, ledger: u32) -> bool
is_duplicate(reference: Symbol, current_ledger: u32, window: u32) -> bool
last_seen(reference: Symbol) -> Option<u32>
```

`record_reference` stores a new or later ledger and returns `true`. An
out-of-order ledger is rejected with `false`, leaving the latest observation
unchanged. `is_duplicate` is inclusive at the beginning and end of the window.
If `current_ledger` precedes the stored ledger it conservatively returns
`true`, rather than allowing inconsistent time input to bypass the guard.

## Example

```rust
use payment_duplicate_window_guard::{
    PaymentDuplicateWindowGuard, PaymentDuplicateWindowGuardClient,
};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
let id = env.register(PaymentDuplicateWindowGuard, ());
let client = PaymentDuplicateWindowGuardClient::new(&env, &id);
let reference = symbol_short!("pay_1");

assert!(client.record_reference(&reference, &100));
assert!(client.is_duplicate(&reference, &105, &5));
assert!(!client.is_duplicate(&reference, &106, &5));
```

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/payment_duplicate_window_guard/Cargo.toml
cargo test --manifest-path contracts/payment_duplicate_window_guard/Cargo.toml
cargo clippy --manifest-path contracts/payment_duplicate_window_guard/Cargo.toml --all-targets -- -D warnings
```

The integration suites cover the happy path, window boundaries, invalid
ledger ordering, and independent references/reuse.

## License

MIT.
