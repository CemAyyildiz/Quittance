use crate::types::{PayoutBinding, PayoutBindingError};

pub const DEFAULT_REBIND_COOLDOWN_LEDGERS: u32 = 100;

pub fn validate_rebind_allowed(
    existing: Option<&PayoutBinding>,
    ledger: u32,
    cooldown: u32,
) -> Result<(), PayoutBindingError> {
    if let Some(prev) = existing {
        if ledger < prev.bound_at_ledger {
            return Err(PayoutBindingError::LedgerRegression);
        }
        let earliest_rebind = prev.bound_at_ledger.saturating_add(cooldown);
        if ledger < earliest_rebind {
            return Err(PayoutBindingError::RebindCooldownActive);
        }
    }
    Ok(())
}
