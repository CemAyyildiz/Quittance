//! `invoice-expiry-reminder-flag` — standalone Soroban one-shot expiry reminder flag.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::check_can_remind;
pub use crate::types::{DataKey, Error};

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct InvoiceExpiryReminderFlag;

#[contractimpl]
impl InvoiceExpiryReminderFlag {
    /// Mark `invoice_id` as reminded. Returns `true` on the first transition,
    /// and `false` if already reminded or invalid.
    pub fn mark_reminded(env: Env, invoice_id: Symbol) -> bool {
        Self::record_reminder(env, invoice_id).is_ok()
    }

    /// Return `true` if `invoice_id` has been marked reminded.
    pub fn was_reminded(env: Env, invoice_id: Symbol) -> bool {
        storage::is_reminded(&env, &invoice_id)
    }

    /// Fallible one-shot reminder marker returning [`Error::AlreadyReminded`] on repeat calls.
    pub fn record_reminder(env: Env, invoice_id: Symbol) -> Result<(), Error> {
        let already = storage::is_reminded(&env, &invoice_id);
        logic::check_can_remind(already, &invoice_id)?;
        storage::set_reminded(&env, &invoice_id);
        Ok(())
    }
}
