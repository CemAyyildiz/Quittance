//! State transition validation for `invoice-void-flag`.

use soroban_sdk::{Address, Env, Symbol};

use crate::storage;
use crate::types::{Error, InvoiceState};

/// Validate that `state` allows transitioning to `InvoiceState::Void`.
pub const fn ensure_can_void(state: InvoiceState) -> Result<(), Error> {
    match state {
        InvoiceState::Open => Ok(()),
        InvoiceState::Void => Err(Error::AlreadyVoid),
        InvoiceState::Paid => Err(Error::AlreadyPaid),
        InvoiceState::Expired => Err(Error::InvoiceExpired),
    }
}

/// Void `invoice_id` on behalf of `seller` if it is currently `Open` and
/// owned by `seller` (when an owner is registered).
pub(crate) fn apply_void(env: &Env, seller: &Address, invoice_id: &Symbol) -> Result<(), Error> {
    if let Some(owner) = storage::get_owner(env, invoice_id) {
        if owner != *seller {
            return Err(Error::UnauthorizedSeller);
        }
    } else {
        storage::set_owner(env, invoice_id, seller);
    }

    let current = storage::get_state(env, invoice_id);
    ensure_can_void(current)?;
    storage::set_state(env, invoice_id, InvoiceState::Void);
    Ok(())
}
