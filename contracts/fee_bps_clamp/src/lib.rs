//! `quittance-fee-bps-clamp`
//!
//! Pure helper for clamping a **basis-points** value into the only range that
//! is meaningful for a fee: `0..=10_000` (0% through 100%).
//!
//! # Scope (intentionally bounded)
//!
//! - Only the clamp: values below `0` become `0`, values above `10_000`
//!   become `10_000`, values already in range pass through unchanged.
//! - No payment logic. No storage. No trustlines. No Soroban host calls.
//! - **Explicitly not wired into Quittance payments.** This crate does not read
//!   or change any invoice amount. It exists so a future fee feature has a
//!   single, tested definition of "a basis-points value is between 0 and
//!   10000" to lean on.
//!
//! # Why basis points
//!
//! A basis point (bps) is one hundredth of a percent: `1 bps == 0.01%`, so a
//! full `100%` is `10_000 bps`. Fees are commonly expressed this way because
//! it keeps the math in integers and avoids floating-point rounding.
//!
//! # When you would use this
//!
//! - Inside a future Soroban contract or off-chain worker that accepts a
//!   caller-supplied fee in basis points and must guarantee it never exceeds
//!   `100%` before doing any arithmetic with it.
//!
//! # When you would NOT use this
//!
//! - To compute an actual fee amount, or to touch a payment. That is out of
//!   scope; this crate only bounds the bps value itself.

#![deny(unsafe_code)]
#![deny(unused_must_use)]

/// The minimum valid basis-points value: `0` (0%).
pub const MIN_BPS: i32 = 0;

/// The maximum valid basis-points value: `10_000` (100%).
///
/// One basis point is `0.01%`, so `10_000 bps` is a full `100%`.
pub const MAX_BPS: i32 = 10_000;

/// Clamp a basis-points value into the valid `MIN_BPS..=MAX_BPS` range.
///
/// - Anything below [`MIN_BPS`] (including negatives) becomes [`MIN_BPS`].
/// - Anything above [`MAX_BPS`] becomes [`MAX_BPS`].
/// - Values already within `0..=10_000` are returned unchanged.
///
/// This never panics and never overflows: it only ever returns one of the two
/// bounds or the input itself.
///
/// # Examples
///
/// ```
/// use quittance_fee_bps_clamp::clamp_bps;
///
/// // Negative input floors to 0.
/// assert_eq!(clamp_bps(-1), 0);
/// assert_eq!(clamp_bps(i32::MIN), 0);
///
/// // Mid-range input passes through unchanged.
/// assert_eq!(clamp_bps(250), 250);
///
/// // Over 100% ceils to 10_000.
/// assert_eq!(clamp_bps(10_001), 10_000);
/// assert_eq!(clamp_bps(i32::MAX), 10_000);
/// ```
#[must_use = "clamp_bps returns the clamped value; using it in place has no effect"]
pub fn clamp_bps(bps: i32) -> i32 {
    bps.clamp(MIN_BPS, MAX_BPS)
}

/// Returns `true` when `bps` is already inside the valid `0..=10_000` range.
///
/// Useful when a caller would rather reject an out-of-range value than
/// silently clamp it.
///
/// # Examples
///
/// ```
/// use quittance_fee_bps_clamp::is_valid_bps;
///
/// assert!(is_valid_bps(0));
/// assert!(is_valid_bps(10_000));
/// assert!(!is_valid_bps(-1));
/// assert!(!is_valid_bps(10_001));
/// ```
#[must_use = "is_valid_bps reports whether the value is in range; check the result"]
pub fn is_valid_bps(bps: i32) -> bool {
    (MIN_BPS..=MAX_BPS).contains(&bps)
}

/// Converts a basis-points value into a whole-number percent.
///
/// The input is first clamped into `MIN_BPS..=MAX_BPS` via [`clamp_bps`], so
/// this never panics or overflows, and the result is always in `0..=100`.
/// Conversion is integer division (`clamped / 100`), so fractional percents
/// (e.g. `250` bps == `2.5%`) truncate toward zero — `250` becomes `2`, not
/// `3`.
///
/// # Examples
///
/// ```
/// use quittance_fee_bps_clamp::bps_to_whole_percent;
///
/// assert_eq!(bps_to_whole_percent(250), 2);
/// assert_eq!(bps_to_whole_percent(10_000), 100);
///
/// // Out-of-range input is clamped before conversion.
/// assert_eq!(bps_to_whole_percent(-1), 0);
/// assert_eq!(bps_to_whole_percent(50_000), 100);
/// ```
#[must_use = "bps_to_whole_percent returns the converted value; using it in place has no effect"]
pub fn bps_to_whole_percent(bps: i32) -> i32 {
    clamp_bps(bps) / 100
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ----- constants ----------------------------------------------------

    #[test]
    fn constants_bound_zero_to_one_hundred_percent() {
        // 0 bps is 0%, 10_000 bps is 100%. These bounds are the whole point
        // of the crate, so pin them literally.
        assert_eq!(MIN_BPS, 0);
        assert_eq!(MAX_BPS, 10_000);
    }

    // ----- clamp_bps: negative ------------------------------------------

    #[test]
    fn clamp_negative_floors_to_zero() {
        assert_eq!(clamp_bps(-1), 0);
        assert_eq!(clamp_bps(-500), 0);
        assert_eq!(clamp_bps(i32::MIN), 0);
    }

    /// Issue #497 — pin the i32::MIN edge case: the most negative
    /// representable i32 must clamp to MIN_BPS without overflow.
    #[test]
    fn clamp_i32_min_resolves_to_min_bps() {
        let result = clamp_bps(i32::MIN);
        assert_eq!(result, MIN_BPS, "i32::MIN should clamp to MIN_BPS (0)");
        assert_eq!(result, 0, "i32::MIN must resolve to exactly 0");
    }

    // ----- clamp_bps: mid-range -----------------------------------------

    #[test]
    fn clamp_mid_range_passes_through() {
        assert_eq!(clamp_bps(1), 1);
        assert_eq!(clamp_bps(250), 250); // 2.5%
        assert_eq!(clamp_bps(5_000), 5_000); // 50%
        assert_eq!(clamp_bps(9_999), 9_999);
    }

    // ----- clamp_bps: over 10000 ----------------------------------------

    #[test]
    fn clamp_over_max_ceils_to_ten_thousand() {
        assert_eq!(clamp_bps(10_001), 10_000);
        assert_eq!(clamp_bps(50_000), 10_000);
        assert_eq!(clamp_bps(i32::MAX), 10_000);
    }

    // ----- clamp_bps: exact boundaries ----------------------------------

    #[test]
    fn clamp_exact_boundaries_are_unchanged() {
        assert_eq!(clamp_bps(MIN_BPS), MIN_BPS);
        assert_eq!(clamp_bps(MAX_BPS), MAX_BPS);
    }

    // ----- clamp_bps: idempotence ---------------------------------------

    #[test]
    fn clamp_is_idempotent() {
        // Clamping an already-clamped value must not change it further.
        for input in [i32::MIN, -1, 0, 250, 10_000, 10_001, i32::MAX] {
            let once = clamp_bps(input);
            assert_eq!(clamp_bps(once), once);
        }
    }

    // ----- is_valid_bps -------------------------------------------------

    #[test]
    fn is_valid_bps_reports_range_membership() {
        assert!(is_valid_bps(0));
        assert!(is_valid_bps(250));
        assert!(is_valid_bps(10_000));

        assert!(!is_valid_bps(-1));
        assert!(!is_valid_bps(10_001));
        assert!(!is_valid_bps(i32::MIN));
        assert!(!is_valid_bps(i32::MAX));
    }

    #[test]
    fn clamped_value_is_always_valid() {
        for input in [i32::MIN, -7, 0, 42, 10_000, 12_345, i32::MAX] {
            assert!(is_valid_bps(clamp_bps(input)));
        }
    }

    // ----- bps_to_whole_percent ------------------------------------------

    #[test]
    fn bps_to_whole_percent_converts_mid_range_values() {
        assert_eq!(bps_to_whole_percent(250), 2);
        assert_eq!(bps_to_whole_percent(10_000), 100);
    }

    #[test]
    fn bps_to_whole_percent_truncates_fractional_percent() {
        // 250 bps is 2.5%, which truncates to 2, not rounds to 3.
        assert_eq!(bps_to_whole_percent(299), 2);
        assert_eq!(bps_to_whole_percent(1), 0);
        assert_eq!(bps_to_whole_percent(99), 0);
    }

    #[test]
    fn bps_to_whole_percent_boundaries() {
        assert_eq!(bps_to_whole_percent(MIN_BPS), 0);
        assert_eq!(bps_to_whole_percent(MAX_BPS), 100);
    }

    #[test]
    fn bps_to_whole_percent_clamps_out_of_range_input() {
        assert_eq!(bps_to_whole_percent(-1), 0);
        assert_eq!(bps_to_whole_percent(i32::MIN), 0);
        assert_eq!(bps_to_whole_percent(10_001), 100);
        assert_eq!(bps_to_whole_percent(50_000), 100);
        assert_eq!(bps_to_whole_percent(i32::MAX), 100);
    }
}
