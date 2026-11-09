//! `invoice-template-registry` — standalone Soroban contract: reusable
//! invoice template registry.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{build_template, validate_amount};
pub use crate::types::{DataKey, Error, Template};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

/// Reusable per-seller invoice template registry contract.
#[contract]
pub struct InvoiceTemplateRegistry;

#[contractimpl]
impl InvoiceTemplateRegistry {
    /// Register a new reusable template `(amount, memo)` under `(seller, template_id)`.
    ///
    /// Requires `seller` authorization. Fails with [`Error::InvalidAmount`] if
    /// `amount <= 0` or [`Error::TemplateAlreadyExists`] if `template_id` is
    /// already registered for `seller`.
    pub fn register_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
        amount: i128,
        memo: Symbol,
    ) -> Result<(), Error> {
        seller.require_auth();
        let tpl = logic::build_template(seller.clone(), template_id.clone(), amount, memo)?;
        if storage::get_template(&env, &seller, &template_id).is_some() {
            return Err(Error::TemplateAlreadyExists);
        }
        storage::set_template(&env, &seller, &template_id, &tpl);
        Ok(())
    }

    /// Return the stored [`Template`] for `(seller, template_id)`, or `None` if
    /// no template has been registered under that key.
    pub fn template_for(env: Env, seller: Address, template_id: Symbol) -> Option<Template> {
        storage::get_template(&env, &seller, &template_id)
    }

    /// Update an existing template owned by `seller`.
    pub fn update_template(
        env: Env,
        seller: Address,
        template_id: Symbol,
        amount: i128,
        memo: Symbol,
    ) -> Result<(), Error> {
        seller.require_auth();
        let tpl = logic::build_template(seller.clone(), template_id.clone(), amount, memo)?;
        if storage::get_template(&env, &seller, &template_id).is_none() {
            return Err(Error::TemplateNotFound);
        }
        storage::set_template(&env, &seller, &template_id, &tpl);
        Ok(())
    }

    /// Remove an existing template owned by `seller`.
    pub fn remove_template(env: Env, seller: Address, template_id: Symbol) -> Result<(), Error> {
        seller.require_auth();
        if storage::get_template(&env, &seller, &template_id).is_none() {
            return Err(Error::TemplateNotFound);
        }
        storage::remove_template(&env, &seller, &template_id);
        Ok(())
    }
}
