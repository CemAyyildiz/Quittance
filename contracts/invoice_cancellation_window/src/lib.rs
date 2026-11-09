//! `invoice-cancellation-window` — standalone Soroban contract: buyer-side
//! cancellation window.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{can_cancel_at, remaining_window};
pub use crate::types::{CancellationRecord, DataKey, Error};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

/// Buyer-side invoice cancellation window contract.
#[contract]
pub struct InvoiceCancellationWindow;

#[contractimpl]
impl InvoiceCancellationWindow {
    /// Cancel `invoice_id` on behalf of `payer` if `current_ledger` falls
    /// within `window` ledgers of `created_at` (`created_at <= current_ledger <= created_at + window`).
    pub fn cancel(
        env: Env,
        payer: Address,
        invoice_id: Symbol,
        created_at: u32,
        current_ledger: u32,
        window: u32,
    ) -> Result<(), Error> {
        payer.require_auth();
        if storage::get_cancellation(&env, &invoice_id).is_some() {
            return Err(Error::AlreadyCancelled);
        }
        if storage::is_paid(&env, &invoice_id) {
            return Err(Error::AlreadyPaid);
        }
        logic::can_cancel_at(created_at, current_ledger, window)?;

        storage::set_cancellation(
            &env,
            &invoice_id,
            &CancellationRecord {
                payer,
                created_at,
                cancelled_at: current_ledger,
            },
        );
        Ok(())
    }

    /// Return `true` if `invoice_id` has been cancelled.
    pub fn is_cancelled(env: Env, invoice_id: Symbol) -> bool {
        storage::get_cancellation(&env, &invoice_id).is_some()
    }

    /// Return the stored [`CancellationRecord`] for `invoice_id`, if any.
    pub fn record_of(env: Env, invoice_id: Symbol) -> Option<CancellationRecord> {
        storage::get_cancellation(&env, &invoice_id)
    }

    /// Mark an unpaid, uncancelled invoice as paid so future cancellation
    /// attempts are rejected with [`Error::AlreadyPaid`].
    pub fn mark_paid(env: Env, invoice_id: Symbol) -> Result<(), Error> {
        if storage::get_cancellation(&env, &invoice_id).is_some() {
            return Err(Error::AlreadyCancelled);
        }
        storage::set_paid(&env, &invoice_id);
        Ok(())
    }
}
