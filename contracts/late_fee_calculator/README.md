# quittance-late-fee-calculator

Integer late fee for an overdue invoice, capped at a configurable maximum
percentage of the principal.

An invoice that is still unpaid after its due date owes an extra fee that
grows with the number of overdue days. The fee is a basis-point rate per day
applied to the invoice amount. A separate basis-point ceiling stops a long
overdue period from charging more than an agreed percentage of that amount.
The same inputs always produce the same fee. There is no clock, no storage,
and no network call inside this crate.

This crate is **not** wired into the Next.js or Express apps, and it is **not**
a Soroban contract. It is the arithmetic a later contract or worker can call.

## What it does

| Input | Type | Meaning |
| --- | --- | --- |
| `amount` | `i128` | Invoice principal in the asset's smallest unit. Must be `> 0`. |
| `days_overdue` | `u32` | Whole days past due. `0` means the invoice is not overdue. |
| `fee_bps_per_day` | `u32` | Basis points charged per overdue day. `10_000` bps is 100% of `amount` per day. |
| `max_fee_bps` | `u32` | Ceiling on the fee, in basis points of `amount`. Must be `<= 10_000`. |

One basis point is `0.01%`. `10_000` bps is `100%`.

## Formula

```text
uncapped = floor(amount * days_overdue * fee_bps_per_day / 10_000)
cap      = floor(amount * max_fee_bps / 10_000)
fee      = min(uncapped, cap)
```

All of the math is integer math. Division truncates toward zero, so a fee
smaller than one unit of `amount / 10_000` becomes `0`.

The cap is used only when `uncapped` is strictly greater than `cap`. An equal
pair returns that shared value.

`days_overdue == 0` returns `0` after the input checks below. A daily rate of
`0` also returns `0`.

## Signatures

```rust
pub const BPS_DENOMINATOR: u32 = 10_000;

pub enum LateFeeError {
    NonPositiveAmount,
    MaxFeeBpsTooLarge,
    Overflow,
}

pub fn late_fee(
    amount: i128,
    days_overdue: u32,
    fee_bps_per_day: u32,
    max_fee_bps: u32,
) -> Result<i128, LateFeeError>;
```

| Result | When |
| --- | --- |
| `Err(NonPositiveAmount)` | `amount <= 0`, including `i128::MIN`. Checked before the zero-day shortcut. |
| `Err(MaxFeeBpsTooLarge)` | `max_fee_bps > 10_000`. `10_000` itself is accepted. |
| `Err(Overflow)` | The uncapped fee does not fit in `i128`. The cap is not a way around that. |
| `Ok(0)` | `days_overdue` is `0`, or the truncated fee is `0`. |
| `Ok(fee)` | The capped fee, in the same unit as `amount`. |

`fee_bps_per_day` may be larger than `10_000`. The ceiling is `max_fee_bps`,
not the daily rate. A daily rate of `20_000` bps (200% per day) is legal and
is then cut down by the cap.

## Usage

```rust
use quittance_late_fee_calculator::late_fee;

// 10 days at 50 bps/day (0.50% per day) on 1_000_000, cap 10% (1_000 bps).
// uncapped = 50_000, cap = 100_000, so the fee is 50_000.
let open = late_fee(1_000_000, 10, 50, 1_000).expect("inputs are in range");
assert_eq!(open, 50_000);

// 30 days at the same rate: uncapped = 150_000, which is over the cap.
let capped = late_fee(1_000_000, 30, 50, 1_000).expect("inputs are in range");
assert_eq!(capped, 100_000);

// Not overdue yet.
assert_eq!(late_fee(1_000_000, 0, 50, 1_000).unwrap(), 0);
```

## Tests

```bash
cargo test --manifest-path contracts/late_fee_calculator/Cargo.toml
```

From this directory, `cargo test` is the same run. The integration tests in
`tests/` cover:

- **Happy path** — a fee that stays under the cap, including a 100% one-day charge.
- **Boundaries** — zero days, zero daily rate, truncation to zero, exact equality with the cap, and `max_fee_bps == 10_000`.
- **Errors** — non-positive `amount`, `max_fee_bps > 10_000`, and an uncapped fee that does not fit in `i128`.
- **Cap** — one unit under the cap, one unit over it, a 0% cap, and a daily rate above 100%.

`cargo clippy --all-targets -- -D warnings` is clean for this crate.

## Out of scope (this PR)

- Wiring the fee into invoice payment, the pay page, or PDF export.
- A deployed Soroban contract. The function is plain Rust so a later contract can call the same formula.
- Any other crate under `contracts/`.

## License

MIT.
