#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, Vec};

pub mod tags;
pub mod types;

#[cfg(test)]
mod tests;

use types::TagError;

#[contract]
pub struct InvoiceTagRegistry;

#[contractimpl]
impl InvoiceTagRegistry {
    pub fn add_tag(
        env: Env,
        invoice_id: Symbol,
        tag: Symbol,
    ) -> Result<(), TagError> {
        tags::append_tag(&env, &invoice_id, &tag)
    }

    pub fn tags_for(
        env: Env,
        invoice_id: Symbol,
    ) -> Vec<Symbol> {
        tags::get_tags(&env, &invoice_id)
    }

    pub fn remove_tag(
        env: Env,
        invoice_id: Symbol,
        tag: Symbol,
    ) -> Result<(), TagError> {
        tags::delete_tag(&env, &invoice_id, &tag)
    }

    pub fn clear_tags(
        env: Env,
        invoice_id: Symbol,
    ) -> Result<(), TagError> {
        tags::delete_all_tags(&env, &invoice_id)
    }
}
