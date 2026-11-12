//! Pure arithmetic and cap enforcement for `refund-cap-per-invoice`.

use crate::types::RefundCapError;

/// Compute the updated cumulative refund total and validate against `original_amount`.
pub fn checked_next_refund_total(
    current_total: i128,
    original_amount: i128,
    refund_amount: i128,
) -> Result<i128, RefundCapError> {
    if original_amount <= 0 {
        return Err(RefundCapError::InvalidOriginalAmount);
    }
    if refund_amount <= 0 {
        return Err(RefundCapError::InvalidRefundAmount);
    }
    let next = current_total
        .checked_add(refund_amount)
        .ok_or(RefundCapError::ArithmeticOverflow)?;
    if next > original_amount {
        return Err(RefundCapError::RefundExceedsOriginalAmount);
    }
    Ok(next)
}
