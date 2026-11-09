//! Persistent storage helpers for `invoice-template-registry`.

use soroban_sdk::{Address, Env, Symbol};

use crate::types::{DataKey, Template};

pub(crate) fn get_template(env: &Env, seller: &Address, template_id: &Symbol) -> Option<Template> {
    env.storage()
        .persistent()
        .get(&DataKey::Template(seller.clone(), template_id.clone()))
}

pub(crate) fn set_template(env: &Env, seller: &Address, template_id: &Symbol, template: &Template) {
    env.storage().persistent().set(
        &DataKey::Template(seller.clone(), template_id.clone()),
        template,
    );
}

pub(crate) fn remove_template(env: &Env, seller: &Address, template_id: &Symbol) {
    env.storage()
        .persistent()
        .remove(&DataKey::Template(seller.clone(), template_id.clone()));
}
