use soroban_sdk::{panic_with_error, Address, Env};

use crate::types::{DataKey, DenyError};

pub(crate) fn require_admin(env: &Env, admin: &Address) {
    admin.require_auth();
    let stored: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
    if stored != admin.clone() {
        panic_with_error!(env, DenyError::NotAdmin);
    }
}

pub(crate) fn deny(env: &Env, admin: &Address, who: &Address) {
    require_admin(env, admin);
    if admin == who {
        panic_with_error!(env, DenyError::SelfDeny);
    }
    env.storage()
        .persistent()
        .set(&DataKey::Denied(who.clone()), &true);
}

pub(crate) fn allow(env: &Env, admin: &Address, who: &Address) {
    require_admin(env, admin);
    env.storage()
        .persistent()
        .remove(&DataKey::Denied(who.clone()));
}

pub(crate) fn is_denied(env: &Env, who: &Address) -> bool {
    env.storage().persistent().has(&DataKey::Denied(who.clone()))
}
