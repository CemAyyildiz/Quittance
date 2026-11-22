# refund-reason-code

Records a fixed-enum refund reason code alongside a refund event for an invoice,
keyed by refund id. Once a reason is set for a given refund id it cannot be
changed — only read back.

This crate is a **self-contained learning/utility contract** in the same family
as `contracts/quittance_receipt_hash`, `contracts/destination_guard`, and
`contracts/auth_one_address`. It is not wired into the frontend, backend, or any
other contract in this repo. It ships and is tested entirely on its own, matching
how most existing crates under `contracts/` are structured (standalone
`Cargo.toml` with its own `[workspace]` table, not a member of the root
workspace).

## What it does

A refund is explained by exactly one reason from a fixed set. The contract maps
`refund_id -> ReasonCode` and refuses to overwrite that mapping:

| Step | Call | Result |
|------|------|--------|
| First record | `record_reason(refund_1, DuplicateCharge)` | `Ok(())` |
| Read back | `reason_for(refund_1)` | `Some(DuplicateCharge)` |
| Attempt a change | `record_reason(refund_1, Fraudulent)` | `Err(AlreadyRecorded)` |
| Read again | `reason_for(refund_1)` | `Some(DuplicateCharge)` — unchanged |
| Unknown refund | `reason_for(refund_2)` | `None` |

The reason set is a `#[contracttype]` enum, so no free-form text can ever enter
storage:

| Variant | Meaning |
|---------|---------|
| `ReasonCode::CustomerRequest` | The customer asked for the money back. |
| `ReasonCode::DuplicateCharge` | The same charge was applied more than once. |
| `ReasonCode::ServiceNotDelivered` | The paid good or service was never delivered. |
| `ReasonCode::Fraudulent` | The payment was reported as fraudulent. |
| `ReasonCode::Other` | A reason outside the named cases. |

`ReasonCode::label()` returns a stable lower-case English label for off-chain
display. The label is never stored on-chain, so it cannot change what a stored
code means.

## Public API

```text
record_reason(env, refund_id: Symbol, reason: ReasonCode) -> Result<(), Error>
reason_for(env, refund_id: Symbol) -> Option<ReasonCode>
```

- `record_reason` stores `reason` for `refund_id`. The **first successful call
  wins**. Every later call for the same refund id — repeating the same code or
  naming a different one — returns `Error::AlreadyRecorded` and leaves the stored
  reason untouched.
- `reason_for` returns the stored reason, or `None` when nothing has been
  recorded yet. Reading is side-effect free: the record is never consumed and can
  be read back any number of times.
- Refund ids are independent: recording one never affects another, including ids
  that differ by a single character.

Recorded entries live in persistent storage and are bumped from a 30-day
threshold out to 90 days on both write and read, so a stored reason stays
available for the usual invoice retention window.

### Errors

| Variant | Code | Meaning |
|---------|------|---------|
| `Error::AlreadyRecorded` | `1` | A reason is already recorded for this refund id. |

Each variant carries a stable `#[repr(u32)]` discriminant, and `Error::message()`
returns a stable English description for off-chain tooling.

### Usage

```rust
use refund_reason_code::{ReasonCode, RefundReasonCode, RefundReasonCodeClient};
use soroban_sdk::{symbol_short, Env};

let env = Env::default();
let contract_id = env.register(RefundReasonCode, ());
let client = RefundReasonCodeClient::new(&env, &contract_id);

let refund = symbol_short!("RFND1");

client.record_reason(&refund, &ReasonCode::DuplicateCharge);
assert_eq!(client.reason_for(&refund), Some(ReasonCode::DuplicateCharge));

// The record is immutable: a second write fails and changes nothing.
assert!(client.try_record_reason(&refund, &ReasonCode::Fraudulent).is_err());
assert_eq!(client.reason_for(&refund), Some(ReasonCode::DuplicateCharge));
```

The contract has no constructor and requires no authorization. Binding a refund
to the party allowed to explain it belongs to a future integration, not to this
primitive.

## Layout

```
src/lib.rs        contract entry points and crate documentation
src/logic.rs      persistent-storage record/read access with TTL bumps
src/types.rs      ReasonCode enum, storage keys, error codes
tests/common/     shared test setup
tests/            happy path, edge/boundary, failure, and immutability suites
```

## Tests

From the repository root:

```bash
cargo test --manifest-path contracts/refund_reason_code/Cargo.toml
cargo clippy --manifest-path contracts/refund_reason_code/Cargo.toml --all-targets -- -D warnings
```

Or from inside the crate:

```bash
cd contracts/refund_reason_code
cargo test
cargo clippy --all-targets -- -D warnings
```

A release build:

```bash
cargo build --release --manifest-path contracts/refund_reason_code/Cargo.toml
```

The suites in `tests/` cover:

- **Happy path** — record a reason and read it back, every variant round-trips,
  reads do not consume the record, distinct refund ids keep their own reason.
- **Edge and boundary** — the shortest (1 character) and longest (32 character)
  `Symbol` refund ids, ids that differ by one character, all five codes stored
  side by side.
- **Failures** — a second record is rejected with the exact error, a rejected
  record writes nothing, unknown ids return `None`, the error code and message
  stay stable.
- **Immutability** — a recorded reason cannot be replaced by any other reason in
  the set, re-recording the same reason is rejected too, repeated retries never
  change the record, and a failed change on one refund does not touch another.

This crate declares its own `[workspace]`, so it is deliberately **not** listed
in `contracts/Cargo.toml`'s workspace `members`. Building it never disturbs the
other contracts in the repo.

## Out of scope

- Wiring into the Next.js frontend or the Express backend.
- Cross-contract calls to any other crate in this repo.
- Deployment scripts or testnet/mainnet deployment.
- Hooking this primitive into Quittance's invoice, payment, or refund flow —
  that would be a separate, later integration.

## License

MIT — see `LICENSE` at the repository root.
