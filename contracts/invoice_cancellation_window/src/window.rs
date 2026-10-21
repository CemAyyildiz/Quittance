use soroban_sdk::{panic_with_error, Address, Env, Symbol};

use crate::types::{CancelError, DataKey};

pub(crate) fn is_within_window(created_at: u32, current_ledger: u32, window: u32) -> Result<bool, CancelError> {
    if current_ledger < created_at {
        return Err(CancelError::InvalidLedger);
    }
    let deadline = created_at.saturating_add(window);
    Ok(current_ledger <= deadline)
}

pub(crate) fn cancel(
    env: &Env,
    payer: &Address,
    invoice_id: &Symbol,
    created_at: u32,
    current_ledger: u32,
    window: u32,
) {
    payer.require_auth();

    if env.storage().persistent().has(&DataKey::Cancelled(invoice_id.clone())) {
        panic_with_error!(env, CancelError::AlreadyCancelled);
    }

    match is_within_window(created_at, current_ledger, window) {
        Ok(true) => {
            env.storage()
                .persistent()
                .set(&DataKey::Cancelled(invoice_id.clone()), &true);
        }
        Ok(false) => {
            panic_with_error!(env, CancelError::WindowClosed);
        }
        Err(err) => {
            panic_with_error!(env, err);
        }
    }
}

pub(crate) fn is_cancelled(env: &Env, invoice_id: &Symbol) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::Cancelled(invoice_id.clone()))
}
