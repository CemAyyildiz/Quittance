//! Pure cumulative refund arithmetic for `refund-cap-per-invoice`.

use crate::types::{Error, RefundRecord};

pub fn apply_refund(
    existing: Option<&RefundRecord>,
    original_amount: i128,
    refund_amount: i128,
) -> Result<RefundRecord, Error> {
    if original_amount <= 0 {
        return Err(Error::InvalidOriginalAmount);
    }
    if refund_amount <= 0 {
        return Err(Error::InvalidRefundAmount);
    }
    let current_total = if let Some(rec) = existing {
        if rec.original_amount != original_amount {
            return Err(Error::OriginalAmountMismatch);
        }
        rec.refunded_total
    } else {
        0
    };
    let next_total = current_total
        .checked_add(refund_amount)
        .ok_or(Error::ArithmeticOverflow)?;
    if next_total > original_amount {
        return Err(Error::RefundCapExceeded);
    }
    Ok(RefundRecord {
        original_amount,
        refunded_total: next_total,
    })
}
