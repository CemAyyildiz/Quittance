# Payment retry backoff guard

A standalone Soroban contract that enforces a caller-supplied minimum ledger
gap between retry attempts for each payment reference. The first attempt is
accepted immediately; later attempts are recorded only after the gap elapses.

The primitive is intentionally isolated from Quittance's payment flow and is
not a member of the repository's root contract workspace.

## Public API

```rust
record_attempt(reference: Symbol, ledger: u32, min_gap: u32) -> Result<(), Error>
last_attempt(reference: Symbol) -> Option<u32>
can_attempt(reference: Symbol, ledger: u32, min_gap: u32) -> bool
```

The minimum gap is inclusive: with a previous attempt at ledger 100 and a gap
of 5, ledger 105 is accepted and ledger 104 is rejected. A zero gap permits a
second attempt in the same ledger. Ledger values older than the stored attempt
are rejected as `LedgerRegression`. Neither failure changes stored state.

## Example

```rust
use payment_retry_backoff_guard::{
    PaymentRetryBackoffGuard, PaymentRetryBackoffGuardClient,
};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
let id = env.register(PaymentRetryBackoffGuard, ());
let client = PaymentRetryBackoffGuardClient::new(&env, &id);
let reference = symbol_short!("pay_1");

client.record_attempt(&reference, &100, &5);
assert!(!client.can_attempt(&reference, &104, &5));
assert!(client.can_attempt(&reference, &105, &5));
```

## Build and test

From the repository root:

```bash
cargo build --manifest-path contracts/payment_retry_backoff_guard/Cargo.toml
cargo test --manifest-path contracts/payment_retry_backoff_guard/Cargo.toml
cargo clippy --manifest-path contracts/payment_retry_backoff_guard/Cargo.toml --all-targets -- -D warnings
```

Separate integration suites cover the happy path, exact and numeric
boundaries, failure/state-preservation behavior, and reference isolation.

## License

MIT.
