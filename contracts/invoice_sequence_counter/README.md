# invoice-sequence-counter

Per-seller invoice sequence counter for Quittance.

This crate issues a monotonically increasing sequence number for each
seller and checks whether a submitted number is the one that seller is
allowed to use next. Replaying an already issued number is a collision.
Skipping ahead, submitting `0`, or submitting anything once the counter
is stuck at `u64::MAX` is out of order. The same seller string always
sees the same counter. A different string, even by one byte, is a
different seller.

This crate is the off-chain equivalent of a Soroban contract with the
same rules. It is **not** a `soroban-sdk` wasm crate, and it is **not**
a member of the `contracts` workspace. It is not wired into the Next.js
or Express apps, and it does not call any other contract in this repo.

## What it does

The counter stores the last issued `u64` for each seller. Nothing is
stored until the first successful `next_seq` call.

| Call | Result |
| --- | --- |
| First `next_seq(seller)` | `1` |
| Each later `next_seq(seller)` | previous value `+ 1` |
| `is_valid_seq(seller, candidate)` | `true` only when `candidate` is that next value |

`is_valid_seq` does not issue a number. Calling it any number of times
leaves the counter where it was.

Seller ids are compared as raw UTF-8. The crate does not trim whitespace
and does not fold case. `""` is rejected. A single space is a real seller
id.

## Contract API

A future Soroban contract can expose the same two operations. On chain
the seller is an `Address` and an empty address cannot be constructed,
so the contract returns a bare `u64` / `bool` and traps if it is asked
to move past `u64::MAX`. This crate uses `&str` and `Result` so those
failures are ordinary values:

| Contract | This crate |
| --- | --- |
| `next_seq(seller: Address) -> u64` | `next_seq(&mut self, seller: &str) -> Result<u64, SequenceError>` |
| `is_valid_seq(seller: Address, candidate: u64) -> bool` | `is_valid_seq(&self, seller: &str, candidate: u64) -> Result<bool, SequenceError>` |

`is_valid_seq` is `true` only when `candidate == last + 1`. If the seller
has no issued number, `last + 1` is defined as `1`.

Two extra reads make the same rule explicit:

| Function | Signature | Role |
| --- | --- | --- |
| `expected_seq` | `(&self, seller: &str) -> Result<Option<u64>, SequenceError>` | The number `next_seq` would issue, or `None` at `u64::MAX`. |
| `classify` | `(&self, seller: &str, candidate: u64) -> Result<SequenceVerdict, SequenceError>` | `Accept`, `Collision`, or `OutOfOrder`. |
| `last_issued` | `(&self, seller: &str) -> Result<Option<u64>, SequenceError>` | Last issued number, if any. |

`SequenceVerdict` splits a rejected candidate:

| Verdict | When |
| --- | --- |
| `Accept` | `candidate` is the next number. |
| `Collision` | `candidate` is in `1..=last` (already issued). |
| `OutOfOrder` | `candidate` is `0`, skips past the next number, or the counter is saturated and the candidate was never issued. |

`SequenceError` discriminants are stable:

| Variant | Code | When |
| --- | --- | --- |
| `EmptySeller` | `1` | `seller` is `""`. State is not changed. |
| `Saturated` | `2` | `next_seq` was asked to go past `u64::MAX`. The stored value stays `u64::MAX`. |

## Sequencing rules

For one seller, with `last` absent until the first issue:

```
next expected = 1                  if nothing has been issued
next expected = last + 1           if last < u64::MAX
next expected = none               if last == u64::MAX

is_valid_seq(candidate) = candidate == next expected
```

Issuing is the only write:

```
next_seq:
  reject "" 
  reject when next expected is none
  store next expected
  return it
```

Counters for different sellers never affect each other. The map starts
empty. There is no clock, no ledger sequence, and no persistence in this
crate: a process that restarts begins again at `1` unless a later
integration loads the last issued numbers itself.

## Usage

```rust
use invoice_sequence_counter::{InvoiceSequenceCounter, SequenceVerdict};

let mut counter = InvoiceSequenceCounter::new();

assert!(counter.is_valid_seq("seller-a", 1).unwrap());
assert_eq!(counter.next_seq("seller-a").unwrap(), 1);

// 1 is now a replay. 2 is the only acceptable submission. 3 skips 2.
assert_eq!(
    counter.classify("seller-a", 1).unwrap(),
    SequenceVerdict::Collision
);
assert!(counter.is_valid_seq("seller-a", 2).unwrap());
assert_eq!(
    counter.classify("seller-a", 3).unwrap(),
    SequenceVerdict::OutOfOrder
);

// A second seller still starts at 1.
assert_eq!(counter.next_seq("seller-b").unwrap(), 1);
```

`SellerId::parse` applies the same empty-string check when a caller
wants to validate the id before touching the counter.

## Tests

From the repository root:

```bash
cargo test --manifest-path contracts/invoice_sequence_counter/Cargo.toml
cargo clippy --manifest-path contracts/invoice_sequence_counter/Cargo.toml --all-targets -- -D warnings
```

Or from this directory:

```bash
cargo test
cargo clippy --all-targets -- -D warnings
```

The tests cover:

- **Happy path** — the first number is `1`, later numbers increase by `1`,
  sellers are independent, and a validity check does not issue a number.
- **Boundaries** — `0` and `u64::MAX` before any issue, whitespace and
  case as distinct ids, a long id, and a thousand contiguous issues.
- **Errors** — `""` is rejected by every entry point and does not consume
  a sequence number.
- **Collisions and out-of-order submissions** — replay of the latest or
  an earlier number, a skipped number, and the same number on a different
  seller.

Saturation at `u64::MAX` is covered by a unit test in `src/counter.rs`.
`next_seq` returns `Saturated` and does not wrap.

## Out of scope (this PR)

- Wiring the counter into invoice creation, payment, or the receipt hash.
- A deployed Soroban contract. The table above is the API a later
  contract can mirror.
- Persistence, authorization, and cross-contract calls.
- Any edit outside `contracts/invoice_sequence_counter/`.

## License

MIT.
