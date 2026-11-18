use soroban_sdk::{Address, Env, Symbol};
use crate::types::{DataKey, Template, TemplateError};

pub fn save_template(
    env: &Env,
    seller: &Address,
    template_id: &Symbol,
    amount: i128,
    memo: &Symbol,
) -> Result<(), TemplateError> {
    if amount <= 0 {
        return Err(TemplateError::InvalidAmount);
    }

    let key = DataKey::Template(seller.clone(), template_id.clone());
    let template = Template {
        amount,
        memo: memo.clone(),
    };

    env.storage().persistent().set(&key, &template);
    Ok(())
}

pub fn read_template(
    env: &Env,
    seller: &Address,
    template_id: &Symbol,
) -> Option<Template> {
    let key = DataKey::Template(seller.clone(), template_id.clone());
    env.storage().persistent().get(&key)
}

pub fn delete_template(
    env: &Env,
    seller: &Address,
    template_id: &Symbol,
) -> Result<(), TemplateError> {
    let key = DataKey::Template(seller.clone(), template_id.clone());
    if !env.storage().persistent().has(&key) {
        return Err(TemplateError::TemplateNotFound);
    }
    env.storage().persistent().remove(&key);
    Ok(())
}

pub fn contains_template(
    env: &Env,
    seller: &Address,
    template_id: &Symbol,
) -> bool {
    let key = DataKey::Template(seller.clone(), template_id.clone());
    env.storage().persistent().has(&key)
}
