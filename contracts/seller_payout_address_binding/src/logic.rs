//! Pure cooldown validation logic for `seller-payout-address-binding`.

use crate::types::Error;

/// Verify whether a seller last bound at `last_bound_at` can rebind at
/// `current_ledger` given `cooldown_ledgers`.
pub fn verify_rebind_allowed(
    last_bound_at: u32,
    current_ledger: u32,
    cooldown_ledgers: u32,
) -> Result<(), Error> {
    if current_ledger < last_bound_at {
        return Err(Error::LedgerRegression);
    }
    let unlock_ledger = last_bound_at
        .checked_add(cooldown_ledgers)
        .ok_or(Error::CooldownOverflow)?;
    if current_ledger < unlock_ledger {
        return Err(Error::CooldownActive);
    }
    Ok(())
}
