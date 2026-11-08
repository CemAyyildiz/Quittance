use crate::types::ReceiptCounterError;

pub const MAX_BATCH_INCREMENT: u32 = 1_000;

pub fn checked_increment(current: u32, delta: u32) -> Result<u32, ReceiptCounterError> {
    if delta == 0 || delta > MAX_BATCH_INCREMENT {
        return Err(ReceiptCounterError::InvalidBatchSize);
    }
    current
        .checked_add(delta)
        .ok_or(ReceiptCounterError::CounterOverflow)
}
