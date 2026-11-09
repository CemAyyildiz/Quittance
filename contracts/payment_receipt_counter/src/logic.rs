//! Checked increment logic for `payment-receipt-counter`.

use crate::types::Error;

pub const fn checked_increment(current: u32) -> Result<u32, Error> {
    match current.checked_add(1) {
        Some(next) => Ok(next),
        None => Err(Error::CounterOverflow),
    }
}
