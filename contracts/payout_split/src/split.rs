use crate::error::SplitError;
use crate::types::{SplitPlan, BPS_TOTAL, MAX_PAYEES};

/// Returns true when `bps` is a usable split: 1..=MAX_PAYEES shares summing to 10_000.
pub fn splits_are_valid(bps: &[u32]) -> bool {
    validate_bps(bps).is_ok()
}

/// Checks the share list without looking at a payment amount.
pub fn validate_bps(bps: &[u32]) -> Result<(), SplitError> {
    if bps.is_empty() {
        return Err(SplitError::Empty);
    }
    if bps.len() > MAX_PAYEES {
        return Err(SplitError::TooManyPayees);
    }
    let mut sum: u64 = 0;
    for share in bps {
        sum += u64::from(*share);
    }
    if sum != u64::from(BPS_TOTAL) {
        return Err(SplitError::SumNotExact);
    }
    Ok(())
}

/// Splits `amount` by `bps`.
///
/// Integer division drops dust. The leftover units are added to the last payee
/// so the returned shares add back to `amount`.
pub fn apply_bps(amount: i128, bps: &[u32]) -> Result<SplitPlan, SplitError> {
    validate_bps(bps)?;
    if amount < 0 {
        return Err(SplitError::NegativeAmount);
    }

    let mut shares = [0_i128; MAX_PAYEES];
    let mut allocated: i128 = 0;
    for (index, share_bps) in bps.iter().enumerate() {
        let share = amount
            .checked_mul(i128::from(*share_bps))
            .ok_or(SplitError::Overflow)?
            / i128::from(BPS_TOTAL);
        shares[index] = share;
        allocated = allocated.checked_add(share).ok_or(SplitError::Overflow)?;
    }

    let last = bps.len() - 1;
    let remainder = amount.checked_sub(allocated).ok_or(SplitError::Overflow)?;
    shares[last] = shares[last]
        .checked_add(remainder)
        .ok_or(SplitError::Overflow)?;

    Ok(SplitPlan {
        shares,
        len: bps.len(),
    })
}
