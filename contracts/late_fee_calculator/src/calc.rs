//! Integer late-fee formula.

use crate::types::{LateFeeError, BPS_DENOMINATOR};

/// Late fee for an overdue invoice, capped at a percentage of `amount`.
///
/// ```text
/// uncapped = floor(amount * days_overdue * fee_bps_per_day / 10_000)
/// cap      = floor(amount * max_fee_bps / 10_000)
/// fee      = min(uncapped, cap)
/// ```
///
/// Division truncates toward zero. The cap replaces the fee only when the
/// uncapped fee is strictly greater than the cap.
///
/// # Errors
///
/// - [`LateFeeError::NonPositiveAmount`] when `amount <= 0`.
/// - [`LateFeeError::MaxFeeBpsTooLarge`] when `max_fee_bps > 10_000`.
/// - [`LateFeeError::Overflow`] when the uncapped fee does not fit in `i128`.
///   The cap is applied only after that fee has been computed, so a rate whose
///   uncapped value overflows is an error even if the cap itself would fit.
///
/// `days_overdue == 0` yields `Ok(0)` after the two input checks. A zero
/// per-day rate also yields `0`.
///
/// # Examples
///
/// ```
/// use quittance_late_fee_calculator::late_fee;
///
/// // 1_000_000 * 10 days * 50 bps / 10_000 = 50_000, under a 10% cap.
/// assert_eq!(late_fee(1_000_000, 10, 50, 1_000).unwrap(), 50_000);
///
/// // Same invoice held long enough to hit the 10% cap (100_000).
/// assert_eq!(late_fee(1_000_000, 30, 50, 1_000).unwrap(), 100_000);
/// ```
#[must_use = "an Err means the fee was rejected or overflowed; check the result"]
pub fn late_fee(
    amount: i128,
    days_overdue: u32,
    fee_bps_per_day: u32,
    max_fee_bps: u32,
) -> Result<i128, LateFeeError> {
    if amount <= 0 {
        return Err(LateFeeError::NonPositiveAmount);
    }
    if max_fee_bps > BPS_DENOMINATOR {
        return Err(LateFeeError::MaxFeeBpsTooLarge);
    }
    if days_overdue == 0 || fee_bps_per_day == 0 {
        return Ok(0);
    }

    let rate = u128::from(days_overdue) * u128::from(fee_bps_per_day);
    let uncapped = mul_div_bps(amount, rate)?;
    let cap = cap_fee(amount, max_fee_bps);
    if uncapped > cap {
        Ok(cap)
    } else {
        Ok(uncapped)
    }
}

/// `floor(amount * max_fee_bps / 10_000)`.
///
/// `max_fee_bps` is at most 10_000, so the result is always in `0..=amount`
/// and cannot overflow `i128`.
fn cap_fee(amount: i128, max_fee_bps: u32) -> i128 {
    let bps = i128::from(max_fee_bps);
    let whole = amount / i128::from(BPS_DENOMINATOR);
    let remainder = amount % i128::from(BPS_DENOMINATOR);
    whole * bps + (remainder * bps) / i128::from(BPS_DENOMINATOR)
}

/// `floor(amount * factor / 10_000)`, or [`LateFeeError::Overflow`] when the
/// quotient does not fit in `i128`.
fn mul_div_bps(amount: i128, factor: u128) -> Result<i128, LateFeeError> {
    if factor == 0 {
        return Ok(0);
    }
    let amount = u128::try_from(amount).map_err(|_| LateFeeError::Overflow)?;
    let (hi, lo) = widening_mul(amount, factor);
    let quotient = div_by_bps_denominator(hi, lo)?;
    i128::try_from(quotient).map_err(|_| LateFeeError::Overflow)
}

/// 256-bit product `(hi << 128) | lo = a * b`.
fn widening_mul(a: u128, b: u128) -> (u128, u128) {
    let a_lo = a & 0xFFFF_FFFF_FFFF_FFFF;
    let a_hi = a >> 64;
    let b_lo = b & 0xFFFF_FFFF_FFFF_FFFF;
    let b_hi = b >> 64;

    let ll = a_lo * b_lo;
    let lh = a_lo * b_hi;
    let hl = a_hi * b_lo;
    let hh = a_hi * b_hi;

    let (mid_sum, carry_hi_lo) = lh.overflowing_add(hl);
    let (mid, carry_ll) = mid_sum.overflowing_add(ll >> 64);
    let mid_carry = u128::from(carry_hi_lo) + u128::from(carry_ll);

    let lo = (ll & 0xFFFF_FFFF_FFFF_FFFF) | ((mid & 0xFFFF_FFFF_FFFF_FFFF) << 64);
    let hi = hh.wrapping_add(mid >> 64).wrapping_add(mid_carry << 64);
    (hi, lo)
}

/// Divide a 256-bit value by [`BPS_DENOMINATOR`].
///
/// Returns [`LateFeeError::Overflow`] when the quotient does not fit in `u128`.
fn div_by_bps_denominator(hi: u128, lo: u128) -> Result<u128, LateFeeError> {
    const DENOM: u128 = BPS_DENOMINATOR as u128;
    if hi == 0 {
        return Ok(lo / DENOM);
    }
    // `hi >= DENOM` means the quotient is at least 2^128.
    if hi >= DENOM {
        return Err(LateFeeError::Overflow);
    }

    let mut remainder: u128 = 0;
    let mut quotient: u128 = 0;
    for i in (0..256).rev() {
        let bit = if i >= 128 {
            (hi >> (i - 128)) & 1
        } else {
            (lo >> i) & 1
        };
        remainder = remainder
            .checked_mul(2)
            .and_then(|value| value.checked_add(bit))
            .ok_or(LateFeeError::Overflow)?;
        quotient = quotient.checked_shl(1).ok_or(LateFeeError::Overflow)?;
        if remainder >= DENOM {
            remainder -= DENOM;
            quotient |= 1;
        }
    }
    Ok(quotient)
}
