# confirmation-quorum

A standalone Soroban contract for an N-of-M payment confirmation quorum.

A payment reference is only considered *confirmed* once a quorum of the
configured observer addresses has confirmed it. The observer set (**M**) is
configured once, right after deployment. The quorum size (**N**) is supplied by
the caller when the reference is evaluated, so the same deployed contract can
serve "2-of-3 confirmations to release a payment" and "3-of-3 confirmations to
settle a dispute" without a redeploy.

This crate is **not** wired into the frontend, the backend or any other contract
in this repository. It ships and is tested entirely on its own.

## The concept

- **Observer (M)** - an address in the configured observer set. Only an
  observer can confirm a payment reference, and only for itself: the confirming
  observer authorizes the call, so nobody can confirm on its behalf.
- **Reference** - a `Symbol` that identifies the payment under observation
  (an invoice id, a payment memo id, ...). Every reference keeps its own
  quorum. Soroban symbols only accept `[A-Za-z0-9_]`, so a reference like
  `payment_ref_1` is valid while `payment-ref-1` is not.
- **Quorum (N)** - the number of distinct observers that must have confirmed
  the reference. The comparison is inclusive: exactly `N` confirmations already
  form a quorum.

## API

- `initialize(admin: Address, observers: Vec<Address>) -> Result<(), Error>`
  configures the quorum exactly once. `admin` authorizes the call and is
  stored so the deployment can be audited. `observers` is the observer set
  (M): it must not be empty, must not exceed `MAX_OBSERVERS` (64) entries and
  must not list the same address twice. The observer set is immutable
  afterwards - re-initializing fails with `AlreadyInitialized`.
- `confirm(observer: Address, reference: Symbol) -> Result<(), Error>` records
  one observer's confirmation of a payment reference. The observer must belong
  to the configured set (`NotObserver` otherwise) and must not have confirmed
  the same reference before (`AlreadyConfirmed` otherwise). Confirming the same
  reference twice never increases the count, so a single observer can never
  inflate a quorum.
- `is_confirmed(reference: Symbol, threshold: u32) -> bool` returns whether at
  least `threshold` distinct observers confirmed the reference. A threshold of
  `0` is trivially satisfied; a threshold larger than the observer count can
  never be reached.
- `confirmation_count(reference: Symbol) -> u32` returns how many distinct
  observers confirmed the reference.
- `confirmations_needed(reference: Symbol, threshold: u32) -> u32` returns how
  many confirmations are still missing to satisfy the quorum, or `0` once the
  quorum is reached.
- `has_confirmed(observer: Address, reference: Symbol) -> bool` returns whether
  a specific observer already confirmed the reference.
- `observers() -> Vec<Address>` returns the configured observer set (M).
- `observer_count() -> u32` returns the size of the configured observer set.
- `is_observer(observer: Address) -> bool` returns whether an address belongs
  to the configured observer set.
- `admin() -> Option<Address>` returns the admin address, or `None` when the
  quorum has not been configured.

## Errors

| Error             | Meaning                                                      |
|-------------------|--------------------------------------------------------------|
| `AlreadyInitialized` | The quorum was already configured; the set is immutable. |
| `NotInitialized`  | The quorum was not configured yet.                           |
| `EmptyObserverSet` | At least one observer is required.                           |
| `TooManyObservers` | The observer set exceeds `MAX_OBSERVERS` (64).              |
| `DuplicateObserver` | The same address was listed twice.                          |
| `NotObserver`     | The caller is not part of the configured observer set.       |
| `AlreadyConfirmed` | The observer already confirmed this reference.              |

## Usage

```rust
use confirmation_quorum::{ConfirmationQuorum, ConfirmationQuorumClient};
use soroban_sdk::{vec, Address, Env, Symbol};

let env = Env::default();
let contract_id = env.register(ConfirmationQuorum, ());
let client = ConfirmationQuorumClient::new(&env, &contract_id);

let admin = Address::generate(&env);
let observer_a = Address::generate(&env);
let observer_b = Address::generate(&env);
let observer_c = Address::generate(&env);
let reference = Symbol::new(&env, "payment_ref_1");

// 2-of-3 quorum.
client.initialize(&admin, &vec![&env, &observer_a, &observer_b, &observer_c]);

client.confirm(&observer_a, &reference);
client.confirm(&observer_b, &reference);

assert!(client.is_confirmed(&reference, &2));
assert!(!client.is_confirmed(&reference, &3));
assert_eq!(client.confirmation_count(&reference), 2);
```

## Storage layout

| Key                             | Value                              |
|---------------------------------|------------------------------------|
| `Admin`                         | `Address` of the quorum admin.     |
| `Initialized`                   | `bool`, set once the quorum is configured. |
| `Observers`                     | `Vec<Address>`, the observer set (M). |
| `Confirmation(reference, observer)` | `bool`, one marker per observer and reference. |
| `ConfirmationCount(reference)`  | `u32`, number of distinct observers that confirmed the reference. |

All entries live in persistent storage, so confirmations survive ledger
closures.

## Build and test

```sh
cargo test --manifest-path contracts/confirmation_quorum/Cargo.toml
cargo clippy --manifest-path contracts/confirmation_quorum/Cargo.toml --all-targets -- -D warnings
```

The integration tests in `tests/` cover:

- **Happy path** - `tests/happy_path.rs`: a 2-of-3 quorum, a full 3-of-3
  quorum, a single-observer quorum and the per-observer confirmation flags.
- **Edge cases** - `tests/edge_cases.rs`: a zero threshold, a threshold above
  the observer count, the inclusive threshold boundary, unknown references and
  an uninitialized quorum.
- **Failures** - `tests/failures.rs`: double initialization, an empty or
  oversized observer set, a duplicated observer, a non-observer confirming, a
  repeated confirmation, confirming before initialization and the missing
  authorizations.
- **Quorum scenarios** - `tests/quorum_scenarios.rs`: per-reference
  independence, different observer subsets forming the quorum, silent
  observers, the authorization recorded for the confirming observer and a
  rejected confirmation leaving the quorum untouched.
- **Observer set** - `tests/observer_set.rs`: reading the configured set, the
  largest supported set and the immutability of the observer set.

The crate is independent of the root Cargo workspace and is not connected to
the application or other contracts.

## Out of scope

- Wiring the quorum into the Quittance invoice or payment flow.
- Deployment scripts and testnet/mainnet deployment of this crate.
- Cross-contract calls to other crates in this repository.

## License

MIT.
