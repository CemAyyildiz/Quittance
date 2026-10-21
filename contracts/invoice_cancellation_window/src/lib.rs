//! Buyer-side cancellation window.
//!
//! Standalone Soroban contract. Allows a payer-initiated cancellation of an unpaid
//! invoice only within a fixed number of ledgers after its creation; attempts after
//! the window closes are rejected.

#![no_std]

mod types;
mod window;

pub use types::CancelError;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[cfg(test)]
mod tests;

#[contract]
pub struct InvoiceCancellationWindow;

#[contractimpl]
impl InvoiceCancellationWindow {
    /// Cancels an invoice if called by the payer within the valid cancellation window.
    pub fn cancel(
        env: Env,
        payer: Address,
        invoice_id: Symbol,
        created_at: u32,
        current_ledger: u32,
        window: u32,
    ) {
        window::cancel(&env, &payer, &invoice_id, created_at, current_ledger, window);
    }

    /// Pure helper to check whether a given ledger is within the cancellation window.
    pub fn can_cancel(_env: Env, created_at: u32, current_ledger: u32, window: u32) -> bool {
        window::is_within_window(created_at, current_ledger, window).unwrap_or_default()
    }

    /// Returns true if the invoice has been recorded as cancelled.
    pub fn is_cancelled(env: Env, invoice_id: Symbol) -> bool {
        window::is_cancelled(&env, &invoice_id)
    }
}
