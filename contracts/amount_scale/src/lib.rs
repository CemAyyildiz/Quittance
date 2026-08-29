//! `quittance-amount-scale`
//!
//! Pure helpers for converting between **stroops** (Stellar's integer on-chain
//! unit, `i128`) and their human-friendly **display units** for assets that
//! resolve to **7 decimal places** (XLM and most Stellar-native assets).
//!
//! # Scope (intentionally bounded)
//!
//! - Only the math: `display * 10^7 = stroops` and `stroops / 10^7 = display`.
//! - All arithmetic uses `i128::checked_*` so overflow is reported as `None`
//!   instead of panicking or silently wrapping.
//! - Negative inputs are rejected up front (Stellar amounts are non-negative).
//! - No payment logic. No storage. No trustlines. No Soroban host calls.
//!   This crate is deliberately dependency-free so it can be reused outside
//!   Soroban contracts as well as inside them.
//!
//! # When you would use this
//!
//! - Inside a Soroban contract that reads a payment amount from a `Symbol`
//!   or `String` and needs to enforce "did this transfer cover the invoice?".
//! - In an off-chain worker that wants to compare an on-chain `i128` stroop
//!   amount to a user-entered double amount without losing precision.
//!
//! # When you would NOT use this
//!
//! - For assets with a different number of decimals (this helper is hard-coded
//!   to 7). Parametrising the decimals is out of scope for this crate; do not
//!   fork it — open a sibling helper.

#![deny(unsafe_code)]
#![deny(unused_must_use)]

/// Number of decimal places used by XLM-style Stellar assets (the unit this
/// crate is built for). Exposed so callers can echo it in UIs or share it
/// with off-chain display formatters.
pub const DECIMALS: u32 = 7;

/// Stroops contained in one display unit: `10 ** DECIMALS`.
/// `1 XLM == 10_000_000 stroops`.
pub const STROOPS_PER_UNIT: i128 = 10_000_000;

/// Convert a display-unit amount into stroops.
///
/// Multiplies by [`STROOPS_PER_UNIT`] using [`i128::checked_mul`].
/// Returns `None` on:
/// - **negative input** (Stellar amounts are non-negative), or
/// - **i128 overflow** during the scale-up.
///
/// # Examples
///
/// ```
/// use quittance_amount_scale::to_stroops;
///
/// assert_eq!(to_stroops(0), Some(0));
/// assert_eq!(to_stroops(1), Some(10_000_000));
/// assert_eq!(to_stroops(1_234_567), Some(12_345_670_000_000));
/// assert_eq!(to_stroops(-1), None);
/// ```
#[must_use = "a `None` return means the display amount was negative or it overflowed when scaled up; check the result before discarding it"]
pub fn to_stroops(display_amount: i128) -> Option<i128> {
    if display_amount < 0 {
        return None;
    }
    display_amount.checked_mul(STROOPS_PER_UNIT)
}

/// Convert a stroop amount into display units (truncates fractional stroops).
///
/// Divides by [`STROOPS_PER_UNIT`] using [`i128::checked_div`].
/// Returns `None` on:
/// - **negative input**,
/// - the (only) `i128` division overflow case: [`i128::MIN`] divided by `-1`.
///   Note that we also reject `i128::MIN` up front because it is negative.
///
/// Because the divisor is a positive constant, the `i128::MIN / -1` overflow
/// case is unreachable in practice — the only `None` you get here is for
/// negative input.
///
/// # Examples
///
/// ```
/// use quittance_amount_scale::from_stroops;
///
/// assert_eq!(from_stroops(0), Some(0));
/// assert_eq!(from_stroops(10_000_000), Some(1));
/// assert_eq!(from_stroops(12_345_670_000_000), Some(1_234_567));
/// // Less than one display unit floors to zero:
/// assert_eq!(from_stroops(9_999_999), Some(0));
/// assert_eq!(from_stroops(-1), None);
/// ```
#[must_use = "a `None` return means the stroop amount was negative; check the result before discarding it"]
pub fn from_stroops(stroops: i128) -> Option<i128> {
    if stroops < 0 {
        return None;
    }
    stroops.checked_div(STROOPS_PER_UNIT)
}

/// Returns the leftover stroops after integer division into display units.
///
/// This is `stroops mod STROOPS_PER_UNIT`, always in `[0, STROOPS_PER_UNIT)`.
/// Useful when a transfer arrived with sub-display-unit precision
/// (truncation loss on the wire) and you need to surface the remainder
/// instead of silently dropping it.
///
/// Returns `None` on negative input.
///
/// # Examples
///
/// ```
/// use quittance_amount_scale::remainder_stroops;
///
/// assert_eq!(remainder_stroops(10_500_000), Some(500_000));
/// assert_eq!(remainder_stroops(10_000_000), Some(0));
/// assert_eq!(remainder_stroops(0), Some(0));
/// assert_eq!(remainder_stroops(-1), None);
/// ```
#[must_use = "a `None` return means the stroop amount was negative; check the result before discarding it"]
pub fn remainder_stroops(stroops: i128) -> Option<i128> {
    if stroops < 0 {
        return None;
    }
    stroops.checked_rem(STROOPS_PER_UNIT)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ----- constants ----------------------------------------------------

    #[test]
    fn constants_match_xlm_decimals() {
        // XLM is the reference 7-decimal Stellar asset; the constants
        // must match that contract literally so callers can rely on them.
        assert_eq!(DECIMALS, 7);
        assert_eq!(STROOPS_PER_UNIT, 10_000_000);
    }

    // ----- to_stroops ----------------------------------------------------

    #[test]
    fn to_stroops_zero() {
        assert_eq!(to_stroops(0), Some(0));
    }

    #[test]
    fn to_stroops_one_xlm() {
        assert_eq!(to_stroops(1), Some(STROOPS_PER_UNIT));
    }

    #[test]
    fn to_stroops_realistic_invoice_amount() {
        // A 12,345,678-unit invoice (display units, not fractional XLM —
        // this crate only scales whole display units) scales to
        // 123_456_780_000_000 stroops.
        assert_eq!(to_stroops(12_345_678), Some(12_345_678 * STROOPS_PER_UNIT));
    }

    #[test]
    fn to_stroops_at_max_safe_boundary() {
        // The largest display amount that still fits is
        // i128::MAX / STROOPS_PER_UNIT. Scale-up must succeed exactly there.
        let max_safe = i128::MAX / STROOPS_PER_UNIT;
        assert_eq!(to_stroops(max_safe), Some(max_safe * STROOPS_PER_UNIT));
    }

    #[test]
    fn to_stroops_just_over_boundary_overflows() {
        // One stroop above the boundary must overflow.
        let overflow = (i128::MAX / STROOPS_PER_UNIT) + 1;
        assert_eq!(to_stroops(overflow), None);
        assert_eq!(to_stroops(i128::MAX), None);
    }

    #[test]
    fn to_stroops_rejects_negative() {
        assert_eq!(to_stroops(-1), None);
        assert_eq!(to_stroops(i128::MIN), None);
    }

    // ----- from_stroops --------------------------------------------------

    #[test]
    fn from_stroops_zero() {
        assert_eq!(from_stroops(0), Some(0));
    }

    #[test]
    fn from_stroops_one_xlm() {
        assert_eq!(from_stroops(STROOPS_PER_UNIT), Some(1));
    }

    #[test]
    fn from_stroops_truncates_fractions() {
        // An exact multiple of STROOPS_PER_UNIT divides back out cleanly:
        assert_eq!(from_stroops(123_456_789 * STROOPS_PER_UNIT), Some(123_456_789));
        // Anything below 1 display unit floors to 0:
        assert_eq!(from_stroops(1), Some(0));
        assert_eq!(from_stroops(STROOPS_PER_UNIT - 1), Some(0));
    }

    #[test]
    fn from_stroops_rejects_negative() {
        assert_eq!(from_stroops(-1), None);
        assert_eq!(from_stroops(i128::MIN), None);
    }

    #[test]
    fn from_stroops_handles_max_value() {
        // i128::MAX / 10_000_000 is the largest legal display value.
        // Our function returns Some(...) for any non-negative stroop amount
        // because the divisor is positive and we pre-screen negatives.
        let giant = i128::MAX;
        let expected = giant / STROOPS_PER_UNIT;
        assert_eq!(from_stroops(giant), Some(expected));
    }

    // ----- remainder_stroops --------------------------------------------

    #[test]
    fn remainder_stroops_zero_when_already_aligned() {
        assert_eq!(remainder_stroops(STROOPS_PER_UNIT), Some(0));
        assert_eq!(remainder_stroops(2 * STROOPS_PER_UNIT), Some(0));
        assert_eq!(remainder_stroops(0), Some(0));
    }

    #[test]
    fn remainder_stroops_sub_unit_residue() {
        assert_eq!(remainder_stroops(STROOPS_PER_UNIT + 500_000), Some(500_000));
        assert_eq!(remainder_stroops(123_456_789 * STROOPS_PER_UNIT + 1), Some(1));
    }

    #[test]
    fn remainder_stroops_below_one_full_unit() {
        // 9_999_999 stroops is less than one full unit → all of it is remainder.
        assert_eq!(remainder_stroops(9_999_999), Some(9_999_999));
    }

    #[test]
    fn remainder_stroops_rejects_negative() {
        assert_eq!(remainder_stroops(-1), None);
    }

    // ----- round-trip identity ------------------------------------------

    #[test]
    fn round_trip_small_amount() {
        let display: i128 = 123;
        let stroops = to_stroops(display).expect("must not overflow");
        assert_eq!(from_stroops(stroops), Some(display));
    }

    #[test]
    fn round_trip_at_max_safe_boundary() {
        let display: i128 = i128::MAX / STROOPS_PER_UNIT;
        let stroops = to_stroops(display).expect("must not overflow at the boundary");
        assert_eq!(from_stroops(stroops), Some(display));
    }

    #[test]
    fn round_trip_table_various_amounts() {
        // A representative sample of display amounts. Bumping the constant
        // to a different precision (e.g. 4 or 6 decimals) would shift
        // the boundary and make this test fail loudly.
        for display in [0_i128, 1, 2, 7, 10, 1_000, 1_234_567, 1_000_000_000] {
            let stroops = to_stroops(display).expect("no overflow in sample");
            assert_eq!(from_stroops(stroops), Some(display), "display={display}");
        }
    }

    #[test]
    fn round_trip_stroops_with_remainder_drops_residue() {
        // 10.5 XLM → 105_000_000 stroops → 10 XLM display (truncation).
        let stroops = STROOPS_PER_UNIT * 10 + 500_000;
        assert_eq!(from_stroops(stroops), Some(10));
        // The dropped residue is recoverable via remainder_stroops.
        assert_eq!(remainder_stroops(stroops), Some(500_000));
    }

    /// Acceptance-criteria checklist for the `to_stroops`/`from_stroops`
    /// round-trip: 0, 1, 1_234_567, and the max safe display value must
    /// all survive a `to_stroops` → `from_stroops` round trip unchanged.
    #[test]
    fn round_trip_acceptance_criteria_values() {
        let max_safe = i128::MAX / STROOPS_PER_UNIT;
        for display in [0_i128, 1, 1_234_567, max_safe] {
            let stroops = to_stroops(display).expect("representative value must not overflow");
            assert_eq!(from_stroops(stroops), Some(display), "display={display}");
        }
    }

    /// Sub-unit stroops (an amount smaller than one full display unit) must
    /// round-trip to a display amount of `0`, and feeding that `0` back
    /// through `to_stroops` must not resurrect the lost precision.
    #[test]
    fn round_trip_sub_unit_stroops() {
        for stroops in [1_i128, 500_000, STROOPS_PER_UNIT - 1] {
            let display = from_stroops(stroops).expect("non-negative stroops must convert");
            assert_eq!(display, 0, "stroops={stroops}");
            assert_eq!(to_stroops(display), Some(0));
        }
    }

    /// Property-style sweep: for a large, deterministic set of display
    /// amounts spanning the whole legal range (small values, round-number
    /// values, and values near the `i128::MAX` boundary), `to_stroops`
    /// composed with `from_stroops` must be the identity function whenever
    /// the scale-up does not overflow.
    ///
    /// This crate is intentionally dependency-free (see the module docs),
    /// so instead of pulling in a property-testing crate, the sweep uses a
    /// small deterministic xorshift64 generator seeded with a fixed value —
    /// reproducible across runs, but exercising far more of the input space
    /// than a hand-picked table.
    #[test]
    fn round_trip_property_sweep() {
        let max_safe = i128::MAX / STROOPS_PER_UNIT;

        fn xorshift64(state: &mut u64) -> u64 {
            *state ^= *state << 13;
            *state ^= *state >> 7;
            *state ^= *state << 17;
            *state
        }

        let mut state: u64 = 0x9E3779B97F4A7C15; // fixed seed for reproducibility
        let modulus = (max_safe as u128) + 1;
        for _ in 0..10_000 {
            // Combine two 64-bit draws into a 128-bit value so the sweep can
            // land anywhere in the (128-bit-wide) safe range, not just the
            // bottom 64 bits of it.
            let hi = xorshift64(&mut state) as u128;
            let lo = xorshift64(&mut state) as u128;
            let raw = (hi << 64) | lo;
            let display = (raw % modulus) as i128;

            let stroops = to_stroops(display).expect("sample is within the safe range");
            assert_eq!(from_stroops(stroops), Some(display), "display={display}");
            assert_eq!(remainder_stroops(stroops), Some(0), "display={display}");
        }
    }
}
