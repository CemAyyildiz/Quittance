# quittance-recurring-schedule

Next due timestamp for a recurring invoice.

An invoice series starts at an anchor (unix seconds) and repeats every
`interval_secs`. Given the current time, this crate returns the next
instant a new invoice should be issued. The same inputs always produce
the same `u64`. There is no clock, no storage, and no Soroban host type
in the implementation, so a later contract can apply the identical rules
on chain.

This crate is not wired into the Next.js or Express apps, and it is not
a member of the `contracts/` workspace.

## What it does

`next_due` compares `now` with the series `anchor, anchor + interval,
anchor + 2 * interval, ...` and returns one timestamp:

| Condition | Result |
| --- | --- |
| `interval_secs == 0` | `Err(ScheduleError::ZeroInterval)` |
| `now < anchor` | `anchor` (the first due; the series has not started) |
| `now == anchor` | `anchor + interval_secs` |
| `now` equals some later `anchor + n * interval_secs` | the following occurrence, strictly after `now` |
| `now` falls strictly between two dues | the smaller of those dues that is still after `now` |
| that sum does not fit in `u64` | `Err(ScheduleError::Overflow)` |

`now == anchor` is the same rule as any other exact hit. The anchor is
the occurrence already reached at this instant, so the function does not
return `now`. It returns the next one. A caller that still needs to emit
the invoice for the instant it is standing on should treat `now` itself
as due before asking for the following date.

## Public API

```rust
pub fn next_due(
    anchor: u64,
    interval_secs: u64,
    now: u64,
) -> Result<u64, ScheduleError>
```

| Item | Type | Meaning |
| --- | --- | --- |
| `next_due(anchor, interval_secs, now)` | `fn(u64, u64, u64) -> Result<u64, ScheduleError>` | Next due strictly after `now`, or `anchor` when `now` is still before the series. |
| `ScheduleError::ZeroInterval` | `u32` code `1` | `interval_secs` was `0`. Checked first. |
| `ScheduleError::Overflow` | `u32` code `2` | `anchor + n * interval_secs` does not fit in `u64`. |
| `ScheduleError::message` | `fn(self) -> &'static str` | Stable English description. |

Zero interval wins over the anchor comparison and over overflow. An
addition is reported as overflow only after the interval is known to be
positive.

## Usage

```rust
use recurring_schedule::next_due;

let anchor = 1_700_000_000;
let day = 86_400;

// Before the series starts, the first invoice is the anchor.
assert_eq!(next_due(anchor, day, anchor - 1).unwrap(), anchor);

// Standing on the anchor, the next invoice is one day later.
assert_eq!(next_due(anchor, day, anchor).unwrap(), anchor + day);

// Ten seconds into the first day, the upcoming due is still that next day.
assert_eq!(next_due(anchor, day, anchor + 10).unwrap(), anchor + day);
```

## Tests

From the repository root:

```bash
cargo test --manifest-path contracts/recurring_schedule/Cargo.toml
cargo clippy --manifest-path contracts/recurring_schedule/Cargo.toml --all-targets -- -D warnings
```

Or from this directory:

```bash
cd contracts/recurring_schedule
cargo test
```

The integration tests cover:

- **Happy path** — `now` before the anchor, and `now` strictly inside a later period.
- **Boundaries** — one second before and after the anchor, one second before a later due, a one-second interval, and the largest result that still fits in `u64`.
- **Errors** — a zero interval (including when `now` is before the anchor) and additions that overflow `u64`.
- **Exact boundary** — `now == anchor` and `now` equal to a later due both return the following occurrence, not `now`.

No extra toolchain components are required beyond `cargo` and `clippy`.
The crate has no dependencies.

## Out of scope

- Wiring this helper into invoice creation, payment, or the web apps.
- Deploying a Soroban contract.
- Calendar months, time zones, or leap days. The period is a fixed number of seconds.

## License

MIT.
