//! Authorization and state transition helpers for `seller-blacklist-registry`.

use soroban_sdk::{Address, Env};

use crate::storage;
use crate::types::BlacklistError;

/// If an administrator has been configured via `init_admin`, require that
/// administrator's authorization before mutating the blacklist.
pub(crate) fn require_admin_if_configured(env: &Env) {
    if let Some(admin) = storage::get_admin(env) {
        admin.require_auth();
    }
}

/// Initialize the contract administrator once.
pub(crate) fn init_admin_once(env: &Env, admin: &Address) -> Result<(), BlacklistError> {
    if storage::get_admin(env).is_some() {
        return Err(BlacklistError::AdminAlreadyInitialized);
    }
    admin.require_auth();
    storage::set_admin(env, admin);
    Ok(())
}
