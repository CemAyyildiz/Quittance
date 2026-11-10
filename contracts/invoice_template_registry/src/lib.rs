#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};
pub use types::{DataKey, Template, TemplateError};
pub use validator::build_template;

#[contract]
pub struct InvoiceTemplateRegistryContract;

#[contractimpl]
impl InvoiceTemplateRegistryContract {
    /// Registers a reusable invoice template (`amount` + `memo`) for `(seller, template_id)`.
    pub fn register_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
        amount: i128,
        memo: Symbol,
    ) -> Result<Template, TemplateError> {
        seller.require_auth();
        let key = DataKey::Template(seller.clone(), template_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(TemplateError::TemplateAlreadyExists);
        }
        let tpl = build_template(seller, template_id, amount, memo)?;
        env.storage().persistent().set(&key, &tpl);
        Ok(tpl)
    }

    /// Updates an existing invoice template or creates it if absent.
    pub fn upsert_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
        amount: i128,
        memo: Symbol,
    ) -> Result<Template, TemplateError> {
        seller.require_auth();
        let key = DataKey::Template(seller.clone(), template_id.clone());
        let tpl = build_template(seller, template_id, amount, memo)?;
        env.storage().persistent().set(&key, &tpl);
        Ok(tpl)
    }

    /// Returns the stored `Template` for `(seller, template_id)`, if registered.
    pub fn template_for(env: Env, seller: Address, template_id: Symbol) -> Option<Template> {
        env.storage()
            .persistent()
            .get(&DataKey::Template(seller, template_id))
    }

    /// Removes the stored template for `(seller, template_id)`.
    pub fn remove_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
    ) -> Result<(), TemplateError> {
        seller.require_auth();
        let key = DataKey::Template(seller, template_id);
        if !env.storage().persistent().has(&key) {
            return Err(TemplateError::TemplateNotFound);
        }
        env.storage().persistent().remove(&key);
        Ok(())
    }
}
