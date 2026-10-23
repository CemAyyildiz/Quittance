use soroban_sdk::{Env, Symbol};

use crate::DataKey;

pub(crate) fn last_attempt(env: &Env, reference: &Symbol) -> Option<u32> {
    env.storage()
        .persistent()
        .get(&DataKey::Reference(reference.clone()))
}

pub(crate) fn set_last_attempt(env: &Env, reference: &Symbol, ledger: u32) {
    env.storage()
        .persistent()
        .set(&DataKey::Reference(reference.clone()), &ledger);
}
