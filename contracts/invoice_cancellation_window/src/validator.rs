use crate::types::CancellationError;

pub fn validate_within_window(
    created_at: u32,
    current_ledger: u32,
    window: u32,
) -> Result<(), CancellationError> {
    if current_ledger < created_at {
        return Err(CancellationError::InvalidLedgerOrder);
    }
    let deadline = created_at.saturating_add(window);
    if current_ledger > deadline {
        return Err(CancellationError::WindowExpired);
    }
    Ok(())
}
