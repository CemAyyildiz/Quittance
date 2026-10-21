//! One-shot expiry-reminder-sent flag.
//!
//! Standalone Soroban contract. A one-way flag recording that an "invoice nearing expiry"
//! reminder has already been handled for a given invoice id, so a calling system knows
//! not to repeat it.

#![no_std]

mod flag;
mod types;

pub use types::ReminderError;

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[cfg(test)]
mod tests;

#[contract]
pub struct InvoiceExpiryReminderFlag;

#[contractimpl]
impl InvoiceExpiryReminderFlag {
    /// Marks an invoice as having had its expiry reminder sent.
    /// Returns true if this call marked the reminder, or false if it was already reminded.
    pub fn mark_reminded(env: Env, invoice_id: Symbol) -> bool {
        flag::mark_reminded(&env, &invoice_id)
    }

    /// Returns true if the expiry reminder has already been marked for `invoice_id`.
    pub fn was_reminded(env: Env, invoice_id: Symbol) -> bool {
        flag::was_reminded(&env, &invoice_id)
    }
}
