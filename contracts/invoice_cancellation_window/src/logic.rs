//! Pure cancellation window arithmetic for `invoice-cancellation-window`.

use crate::types::Error;

/// Validate whether a cancellation at `current_ledger` is inside the inclusive
/// window `[created_at, created_at + window]`.
///
/// Uses `checked_sub` so `created_at + window` never overflows `u32::MAX`.
pub fn can_cancel_at(created_at: u32, current_ledger: u32, window: u32) -> Result<(), Error> {
    let Some(elapsed) = current_ledger.checked_sub(created_at) else {
        return Err(Error::InvalidLedgerOrder);
    };
    if elapsed > window {
        return Err(Error::WindowClosed);
    }
    Ok(())
}

/// Return how many ledgers remain in the cancellation window at `current_ledger`,
/// or `None` if `current_ledger` is outside `[created_at, created_at + window]`.
#[must_use]
pub fn remaining_window(created_at: u32, current_ledger: u32, window: u32) -> Option<u32> {
    let elapsed = current_ledger.checked_sub(created_at)?;
    window.checked_sub(elapsed)
}
