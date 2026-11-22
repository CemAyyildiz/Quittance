//! Admin and category-list access for the `invoice-category-registry` crate.
//!
//! The admin address and the category list live in instance storage: there is
//! exactly one registry per contract instance, and the list is bounded by
//! [`MAX_CATEGORIES`], so it can never grow past the instance-entry budget.

use soroban_sdk::{Address, Env, Symbol, Vec};

use crate::types::{DataKey, Error, MAX_CATEGORIES};

/// Instance entries are bumped back out to 90 days once they get within
/// 30 days of expiry, so the registry stays available between admin calls.
pub(crate) const INSTANCE_THRESHOLD: u32 = 30 * 17_280;
pub(crate) const INSTANCE_BUMP: u32 = 90 * 17_280;

/// Store the admin allowed to register categories.
pub(crate) fn set_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

/// Read the admin allowed to register categories.
pub(crate) fn admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

/// Return the registered categories in registration order.
///
/// An empty registry is the starting state, so a missing list reads as an
/// empty one.
pub(crate) fn categories(env: &Env) -> Vec<Symbol> {
    env.storage()
        .instance()
        .get(&DataKey::Categories)
        .unwrap_or_else(|| Vec::new(env))
}

/// Return whether `category` is in the registered list.
pub(crate) fn is_registered(env: &Env, category: &Symbol) -> bool {
    categories(env).contains(category)
}

/// Register `category` on behalf of `caller`.
///
/// `caller` must be the admin and must authorize the call. Registering a
/// category that is already in the list succeeds without changing anything, so
/// a retried transaction cannot break the registry. A new category is rejected
/// with [`Error::RegistryFull`] once the list holds [`MAX_CATEGORIES`] entries.
pub(crate) fn register(env: &Env, caller: &Address, category: Symbol) -> Result<(), Error> {
    if caller != &admin(env) {
        return Err(Error::NotAdmin);
    }
    caller.require_auth();

    let mut list = categories(env);
    if list.contains(&category) {
        return Ok(());
    }
    if list.len() >= MAX_CATEGORIES {
        return Err(Error::RegistryFull);
    }

    list.push_back(category);
    env.storage().instance().set(&DataKey::Categories, &list);
    Ok(())
}
