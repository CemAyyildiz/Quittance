# `event_invoice_paid`

Soroban helper crate for the Quittance `invoice_paid` event.

This crate exists so that every Quittance Soroban contract emits an
`invoice_paid` signal with the **same topic layout** and the **same
data shape**. Off-chain indexers, dashboards, and receipts code can then
subscribe once and consume the event across contracts and versions.

This crate only **builds** the topics and data. It does not register or
emit from any specific contract; emitting is the consumer contract's
job (typically via `env.events().publish(...)`).

## Event shape

| Position | Type      | Meaning                                              |
|----------|-----------|------------------------------------------------------|
| topic[0] | `Symbol`  | Always the small symbol `"invoice_paid"`             |
| topic[1] | `String`  | The Quittance invoice id (e.g. `"inv-001"`)          |
| topic[2] | `Address` | The payer account                                    |
| topic[3] | `Address` | The seller (invoice creator) account                 |
| data     | tuple     | `(amount: i128, asset: Address, paid_at: u64)`       |

The topic count (exactly **four**) and the data tuple field order are
**part of the public ABI of this crate**. Changing either is a
breaking change and requires a major version bump.

`paid_at` is the **host-ledger timestamp in seconds** (the standard
Soroban convention). Callers should pass `env.ledger().timestamp()`,
not a wall-clock unix time, so the value is consistent with the rest
of the on-chain timeline.

## Stability

- Event-name symbol: `"invoice_paid"` (12 bytes — fits the small-symbol limit).
- Topic order: `name, invoice_id, payer, seller`. Do not reorder.
- Data tuple order: `amount, asset, paid_at`. Do not reorder.

## Public API

```rust
use soroban_sdk::{Address, Env, String};
use event_invoice_paid::{publish, topic, topics, data, EVENT_NAME};

// topic[0] only
let name: soroban_sdk::Symbol = topic(&env);

// Full topic vec
let topics = topics(&env, &invoice_id, &payer, &seller);

// Data payload as a single Val encoding (amount, asset, paid_at)
let payload = data(&env, amount, &asset, paid_at);

// Or do it all in one call
publish(
    &env,
    &invoice_id,
    &payer,
    &seller,
    amount,
    &asset,
    paid_at,
);
```

## Run the tests

```bash
cargo test -p event_invoice_paid
```

Tests live in `src/test.rs` and are wired in via a `#[cfg(test)] mod
test;` declaration at the bottom of `src/lib.rs`. They use **only
the regular public `soroban-sdk` API** — no `testutils` feature:

* `Env::default()`, `Symbol::new`, `String::from_str`,
  `Vec::from_array`, `IntoVal`, `Address::from_str`.
* `Address` fixtures are three precomputed, CRC16-XMODEM-valid
  Stellar account-id StrKey constants at the top of `src/test.rs`
  (`A_STRKEY`, `B_STRKEY`, `C_STRKEY`). These are test fixtures, not
  real funded accounts.
* No `env.events().all()` round-trip — `Events::all` is
  `testutils`-gated, and the helper is a pure topic/data builder,
  so the issue #50 acceptance criterion ("Topic builder covered by
  unit tests") is met by topic-and-data-builder tests alone.

The dev-dependency comment in `Cargo.toml` documents why
`testutils` is intentionally not enabled: `soroban-sdk v22.0.0`
hard-pins `soroban-env-host = "=22.1.0"`, and env-host 22.1.0's
`builtin_contracts::testutils::with_test_prng` lambda is
uncompilable against the resolved `rand 0.8` /
`ed25519-dalek 3.x` trait graph (an upstream
`ChaCha20Rng: ed25519_dalek::rand_core::CryptoRng` trait-bound
mismatch). The `cargo test` failure mode is internal to
`soroban-env-host`, so the workaround is to leave `testutils` off
and use the regular SDK surface instead.

## Scope

This crate is **only a helper**. It does not own Quittance business
logic, does not store state, and is not a `#[contract]` entry point.
Consuming contracts depend on it through `Cargo.toml`, not through
deploy-time imports.

## License

MIT.
