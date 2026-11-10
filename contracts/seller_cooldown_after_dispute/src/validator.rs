use crate::types::CooldownError;

pub fn check_cooldown_elapsed(
    last_dispute_ledger: Option<u32>,
    current_ledger: u32,
    cooldown: u32,
) -> Result<bool, CooldownError> {
    match last_dispute_ledger {
        None => Ok(true),
        Some(dispute_ledger) => {
            if current_ledger < dispute_ledger {
                return Err(CooldownError::InvalidLedgerRegression);
            }
            let unlock_ledger = dispute_ledger.saturating_add(cooldown);
            Ok(current_ledger >= unlock_ledger)
        }
    }
}

pub fn remaining_ledgers(
    last_dispute_ledger: Option<u32>,
    current_ledger: u32,
    cooldown: u32,
) -> u32 {
    match last_dispute_ledger {
        None => 0,
        Some(dispute_ledger) => {
            let unlock_ledger = dispute_ledger.saturating_add(cooldown);
            unlock_ledger.saturating_sub(current_ledger)
        }
    }
}
