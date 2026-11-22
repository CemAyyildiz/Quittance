//! Persistent storage for per-seller currency allowlists.
//!
//! Each seller's allowlist is stored under its own `DataKey::Allowed(seller)`
//! key as the ordered list of codes that seller has allowed, so sellers can
//! never read or overwrite each other's lists.

use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::types::DataKey;

/// Return the codes `seller` has allowed, in insertion order, or an empty
/// list when the seller has never allowed anything.
pub(crate) fn allowed_codes(env: &Env, seller: &Address) -> Vec<Symbol> {
    env.storage()
        .persistent()
        .get(&DataKey::Allowed(seller.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

/// Return whether `code` is on `seller`'s allowlist.
pub(crate) fn is_allowed(env: &Env, seller: &Address, code: &Symbol) -> bool {
    allowed_codes(env, seller).iter().any(|c| c == *code)
}

/// Append `code` to `seller`'s allowlist and persist it.
///
/// Returns `true` when the code was newly added and `false` when it was
/// already present (the stored list is left untouched, so re-allowing a
/// code is idempotent).
pub(crate) fn allow(env: &Env, seller: &Address, code: &Symbol) -> bool {
    let mut codes = allowed_codes(env, seller);
    if codes.iter().any(|c| c == *code) {
        return false;
    }
    codes.push_back(code.clone());
    env.storage()
        .persistent()
        .set(&DataKey::Allowed(seller.clone()), &codes);
    true
}
