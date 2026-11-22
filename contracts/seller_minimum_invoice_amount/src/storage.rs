use crate::types::{DataKey, DEFAULT_MINIMUM};
use soroban_sdk::{Address, Env};

/// Read the minimum invoice amount configured for `seller`.
///
/// Sellers without a stored override fall back to [`DEFAULT_MINIMUM`]
/// (zero, i.e. no minimum).
pub(crate) fn minimum_of(env: &Env, seller: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::SellerMinimum(seller.clone()))
        .unwrap_or(DEFAULT_MINIMUM)
}

/// Persist the minimum invoice amount for `seller`.
pub(crate) fn set_minimum_of(env: &Env, seller: &Address, minimum: i128) {
    let key = DataKey::SellerMinimum(seller.clone());
    let storage = env.storage().persistent();
    storage.set(&key, &minimum);
}
