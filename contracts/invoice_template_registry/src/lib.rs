#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

pub mod registry;
pub mod types;

#[cfg(test)]
mod tests;

use types::{Template, TemplateError};

#[contract]
pub struct InvoiceTemplateRegistry;

#[contractimpl]
impl InvoiceTemplateRegistry {
    pub fn register_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
        amount: i128,
        memo: Symbol,
    ) -> Result<(), TemplateError> {
        seller.require_auth();
        registry::save_template(&env, &seller, &template_id, amount, &memo)
    }

    pub fn template_for(
        env: Env,
        seller: Address,
        template_id: Symbol,
    ) -> Option<Template> {
        registry::read_template(&env, &seller, &template_id)
    }

    pub fn remove_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
    ) -> Result<(), TemplateError> {
        seller.require_auth();
        registry::delete_template(&env, &seller, &template_id)
    }

    pub fn has_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
    ) -> bool {
        registry::contains_template(&env, &seller, &template_id)
    }
}
