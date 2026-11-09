//! Pure cooldown calculation helpers for `seller-cooldown-after-dispute`.

use crate::types::{CooldownError, CooldownStatus};

/// Compute the exact ledger at which a dispute flagged at `dispute_ledger`
/// with duration `cooldown` unlocks.
///
/// Returns [`CooldownError::UnlockOverflow`] if `dispute_ledger + cooldown`
/// exceeds `u32::MAX`.
pub fn unlock_ledger(dispute_ledger: u32, cooldown: u32) -> Result<u32, CooldownError> {
    dispute_ledger
        .checked_add(cooldown)
        .ok_or(CooldownError::UnlockOverflow)
}

/// Determine whether a seller with `dispute_ledger` is allowed to create an
/// invoice at `current_ledger` given `cooldown`.
#[must_use]
pub fn can_create_at(dispute_ledger: Option<u32>, current_ledger: u32, cooldown: u32) -> bool {
    if cooldown == 0 {
        return true;
    }
    let Some(flagged_at) = dispute_ledger else {
        return true;
    };
    if current_ledger < flagged_at {
        return false;
    }
    match flagged_at.checked_add(cooldown) {
        Some(unlock_at) => current_ledger >= unlock_at,
        None => false,
    }
}

/// Return how many ledgers remain before the seller can create invoices again.
#[must_use]
pub fn remaining_ledgers(dispute_ledger: Option<u32>, current_ledger: u32, cooldown: u32) -> u32 {
    if can_create_at(dispute_ledger, current_ledger, cooldown) {
        return 0;
    }
    let flagged_at = dispute_ledger.unwrap_or(0);
    match flagged_at.checked_add(cooldown) {
        Some(unlock_at) => unlock_at.saturating_sub(current_ledger),
        None => u32::MAX.saturating_sub(current_ledger).max(1),
    }
}

/// Build a [`CooldownStatus`] snapshot for `(dispute_ledger, current_ledger, cooldown)`.
#[must_use]
pub fn evaluate_status(
    dispute_ledger: Option<u32>,
    current_ledger: u32,
    cooldown: u32,
) -> CooldownStatus {
    let can_create = can_create_at(dispute_ledger, current_ledger, cooldown);
    let remaining = if can_create {
        0
    } else {
        remaining_ledgers(dispute_ledger, current_ledger, cooldown)
    };
    CooldownStatus {
        can_create,
        remaining_ledgers: remaining,
    }
}
