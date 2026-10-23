//! Fixed-point payment split logic.

use crate::types::{BPS_DENOMINATOR, SplitError};

/// Split `total` across `shares_bps` by basis-point shares.
///
/// Each recipient `i` receives `floor(total * shares_bps[i] / 10_000)`.
/// The rounding remainder (the sub-unit that basis-point division drops)
/// is assigned to the recipient at `remainder_index` so the parts always sum
/// exactly to `total`.
///
/// # Errors
///
/// - [`SplitError::NegativeTotal`] when `total < 0`.
/// - [`SplitError::EmptyShares`] when `shares_bps` is empty.
/// - [`SplitError::SharesExceedWhole`] when the shares exceed 100% (10_000 bps).
/// - [`SplitError::InvalidRemainderIndex`] when `remainder_index` is out of bounds.
/// - [`SplitError::Overflow`] when an intermediate value does not fit in `i128`.
pub fn split_amount(
    total: i128,
    shares_bps: &[u32],
    remainder_index: u32,
) -> Result<Vec<i128>, SplitError> {
    if total < 0 {
        return Err(SplitError::NegativeTotal);
    }
    if shares_bps.is_empty() {
        return Err(SplitError::EmptyShares);
    }
    if remainder_index as usize >= shares_bps.len() {
        return Err(SplitError::InvalidRemainderIndex);
    }

    let mut sum_bps: u64 = 0;
    for &bps in shares_bps {
        sum_bps = sum_bps.saturating_add(u64::from(bps));
    }
    if sum_bps > u64::from(BPS_DENOMINATOR) {
        return Err(SplitError::SharesExceedWhole);
    }

    let mut shares = Vec::with_capacity(shares_bps.len());
    let mut allocated: i128 = 0;
    for &bps in shares_bps {
        let share = mul_bps(total, bps)?;
        allocated = allocated
            .checked_add(share)
            .ok_or(SplitError::Overflow)?;
        shares.push(share);
    }

    let remainder = total
        .checked_sub(allocated)
        .ok_or(SplitError::Overflow)?;
    let index = remainder_index as usize;
    shares[index] = shares[index]
        .checked_add(remainder)
        .ok_or(SplitError::Overflow)?;

    Ok(shares)
}

/// `floor(amount * bps / 10_000)`, computed with overflow-safe arithmetic.
fn mul_bps(amount: i128, bps: u32) -> Result<i128, SplitError> {
    let denominator = i128::from(BPS_DENOMINATOR);
    let rate = i128::from(bps);
    let whole = (amount / denominator)
        .checked_mul(rate)
        .ok_or(SplitError::Overflow)?;
    let fractional = (amount % denominator)
        .checked_mul(rate)
        .ok_or(SplitError::Overflow)?
        / denominator;
    whole
        .checked_add(fractional)
        .ok_or(SplitError::Overflow)
}
