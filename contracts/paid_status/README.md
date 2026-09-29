# paid-status

Compact encode/decode enum for the Quittance invoice **paid status**, with a
single, stable `u8` wire encoding shared by off-chain indexers, dashboards,
and (eventually) Soroban contracts.

The on-wire representation of a status is **one `u8` byte**. The byte values
below are part of this crate's public ABI: they are written to disk, passed
across the wire, and embedded in storage. They must **not** be renumbered or
reused, and no new variants may be added without reserving a fresh value
forever.

## Wire encoding: variant → discriminant

| `u8` discriminant | Variant    | Meaning                                                            | Terminal |
| ----------------- | ---------- | ------------------------------------------------------------------ | -------- |
| `0`               | `Pending`  | Invoice issued but no payment has been confirmed.                   | No       |
| `1`               | `Paid`     | Payment confirmed on the ledger.                                   | Yes      |
| `2`               | `Expired`  | Settlement window elapsed without a confirmed payment.             | Yes      |
| `3`               | `Cancelled`| Invoice cancelled by seller before settlement.                     | Yes      |

Only the discriminants `0..=3` are valid. Any other byte (including `4` and
`255`) is rejected by [`PaidStatus::from_discriminant`] with
`InvalidStatus { got }`, where `got` is the offending byte.

## Encoding / decoding

- Encode: `status.discriminant()` → `u8`. This is the single source of truth
  for the wire value; never hand-write a literal.
- Decode: `PaidStatus::from_discriminant(byte)` → `Result<PaidStatus, InvalidStatus>`.

```rust
use paid_status::PaidStatus;

// encode
let wire: u8 = PaidStatus::Paid.discriminant(); // 1

// decode
let decoded = PaidStatus::from_discriminant(wire).unwrap(); // Paid
assert_eq!(decoded, PaidStatus::Paid);
```

## Terminal states

`Pending` is the only non-terminal state. Every other variant is terminal,
i.e. it cannot transition to any other state (`PaidStatus::is_terminal()`).

## Notes

- This crate contains no persistence, no contract storage, and no host calls.
- It contains no transition logic ("when does `Pending` become `Paid`?");
  that is the consumer contract's responsibility.
- `PaidStatus::message()` returns a stable English string mirroring
  `contracts/error_codes/src/lib.rs`, for tooling, logs, and off-chain
  metadata — not for user-facing UI.
