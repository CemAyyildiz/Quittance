# `sliding-window-counter`

A generic sliding ledger-window event counter, implemented as a standalone
Soroban contract.

The contract records the ledger of every event and answers the question
**"how many of those events fall inside the last `window` ledgers?"**. It is
deliberately generic: the same counter can back any "N events per window"
rule — rate limits, burst allowances, per-seller invoice pacing, or a
cooldown window after a large payment.

This crate is a self-contained learning/utility primitive. It is **not** wired
into the Quittance frontend, backend, or any other contract in this
repository — it ships and is tested entirely on its own, exactly like the
other crates under `contracts/`. It is also *not* a member of the root
workspace; it declares its own standalone workspace in its `Cargo.toml`.

## What it does

| Concept        | Meaning                                                          |
|----------------|------------------------------------------------------------------|
| Event          | A single occurrence, recorded with the ledger it happened in.     |
| Window         | The last `window` ledgers, inclusive on both ends.               |
| Current ledger | The ledger the window ends at; normally the head of the chain.    |

Window semantics, in one table:

| `window` | Ledgers covered when `current_ledger == 100` | Count of an event at ledger 100 |
|----------|-----------------------------------------------|--------------------------------|
| `0`      | *(empty window)*                              | not counted                    |
| `1`      | `100`                                        | counted                        |
| `10`     | `91..=100`                                   | counted                        |
| `100`    | `1..=100`                                    | counted                        |

Events recorded **above** `current_ledger` are never counted — the window
only looks backwards.

## Public API

### Free functions (pure, no storage)

| Function         | Signature                                                                              | Returns                                              |
|------------------|----------------------------------------------------------------------------------------|------------------------------------------------------|
| `window_start`   | `fn window_start(current_ledger: u32, window: u32) -> u32`                             | First ledger inside the window.                     |
| `is_in_window`   | `fn is_in_window(ledger: u32, current_ledger: u32, window: u32) -> bool`                | Whether a ledger is inside the window.              |
| `count_in_window`| `fn count_in_window<I: IntoIterator<Item = u32>>(records: I, current_ledger: u32, window: u32) -> u32` | How many records are inside the window. |
| `is_prunable`    | `fn is_prunable(ledger: u32, current_ledger: u32, window: u32) -> bool`                | Whether a record has aged out and can be dropped.   |

### Contract entry points

| Method            | Signature                                                        | Behaviour                                                          |
|-------------------|------------------------------------------------------------------|--------------------------------------------------------------------|
| `record`          | `fn record(env: Env, ledger: u32) -> u32`                         | Records an event and returns the total number of events.            |
| `count_in_window` | `fn count_in_window(env: Env, current_ledger: u32, window: u32) -> u32` | Counts the events inside the window.                      |
| `total`           | `fn total(env: Env) -> u32`                                       | Total number of recorded events, in every window.                  |
| `prune`           | `fn prune(env: Env, current_ledger: u32, window: u32) -> u32`    | Drops aged-out events and returns how many remain.                 |
| `clear`           | `fn clear(env: Env) -> u32`                                       | Removes every event and returns how many were removed.             |

The contract API is **total**: none of the entry points can fail, so there is
no error enum. Degenerate inputs (a zero-length window, an empty counter,
ledger `0`, ledger `u32::MAX`) always produce a well-defined number instead
of an error.

## Storage model

| Key                 | Storage  | Value                          |
|---------------------|----------|--------------------------------|
| `DataKey::Records`  | instance | `Vec<u32>` of recorded ledgers |

The recorded ledgers are kept in insertion order. `prune` and `clear` exist
so that long-lived deployments can bound the stored history.

## Events

| Event           | Topics   | Data                     |
|-----------------|----------|--------------------------|
| `RecordedEvent` | `ledger` | `total`                  |
| `PrunedEvent`   | —        | `removed`, `remaining`    |
| `ClearedEvent`  | —        | `removed`                |

## Usage

```rust
use sliding_window_counter::{SlidingWindowCounter, SlidingWindowCounterClient};
use soroban_sdk::Env;

let env = Env::default();
let contract_id = env.register(SlidingWindowCounter, ());
let client = SlidingWindowCounterClient::new(&env, &contract_id);

// Three events, one per ledger.
assert_eq!(client.record(&100), 1);
assert_eq!(client.record(&101), 2);
assert_eq!(client.record(&102), 3);

// A three-ledger window ending at 102 sees all three.
assert_eq!(client.count_in_window(&102, &3), 3);

// A two-ledger window ending at 103 sees only the newest two.
assert_eq!(client.count_in_window(&103, &2), 2);
```

## Tests

```bash
cargo test --manifest-path contracts/sliding_window_counter/Cargo.toml
```

The suite is split across four integration test files plus a unit-test module:

| File                    | Focus                                                                                     |
|-------------------------|-------------------------------------------------------------------------------------------|
| `tests/happy_path.rs`   | Recording events, counting them, and sliding the window forward.                          |
| `tests/boundary.rs`     | Zero-length window, window start inclusion/exclusion, future events, ledger extremes.     |
| `tests/failure.rs`      | Total-API guarantees: empty counter, no-op prune/clear, duplicate ledgers, saturation.     |
| `tests/scenario.rs`     | Bursts aging out of the window, pruning to bound history, restarting after a clear.       |
| `src/test.rs`           | Unit tests for the window arithmetic and the contract lifecycle.                           |

## Building for wasm

```bash
# The Soroban environment requires `wasm32v1-none` on Rust 1.84+.
# On Rust 1.81 and older use `wasm32-unknown-unknown` instead.
rustup target add wasm32v1-none
cargo build \
  --manifest-path contracts/sliding_window_counter/Cargo.toml \
  --target wasm32v1-none \
  --release
```

## Out of scope

- Wiring into the Quittance frontend, backend, or invoice/payment flow.
- Cross-contract calls to any other crate in this repository.
- Deployment scripts or testnet/mainnet deployment.
- Per-key counters (this contract counts a single global stream of events).
- Persistent storage with TTL buckets — the recorded history lives in
  instance storage and is expected to be pruned.
- Changes to `contracts/Cargo.toml` — this crate stays a standalone
  workspace, like most crates under `contracts/`.

## License

MIT.
