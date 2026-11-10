#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};
pub use types::{CancellationError, CancellationRecord, DataKey};
pub use validator::validate_within_window;

#[contract]
pub struct InvoiceCancellationWindowContract;

#[contractimpl]
impl InvoiceCancellationWindowContract {
    /// Cancels `invoice_id` on behalf of `payer` if `current_ledger` is within
    /// `created_at + window` and the invoice has not already been cancelled.
    pub fn cancel(
        env: Env,
        payer: Address,
        invoice_id: Symbol,
        created_at: u32,
        current_ledger: u32,
        window: u32,
    ) -> Result<CancellationRecord, CancellationError> {
        payer.require_auth();
        let key = DataKey::Cancelled(invoice_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(CancellationError::AlreadyCancelled);
        }
        validate_within_window(created_at, current_ledger, window)?;

        let record = CancellationRecord {
            invoice_id,
            payer,
            cancelled_at_ledger: current_ledger,
        };
        env.storage().persistent().set(&key, &record);
        Ok(record)
    }

    /// Returns `true` if `invoice_id` has been cancelled.
    pub fn is_cancelled(env: Env, invoice_id: Symbol) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Cancelled(invoice_id))
    }

    /// Returns `true` if `invoice_id` can still be cancelled at `current_ledger`.
    pub fn can_cancel_at(
        env: Env,
        invoice_id: Symbol,
        created_at: u32,
        current_ledger: u32,
        window: u32,
    ) -> bool {
        if Self::is_cancelled(env, invoice_id) {
            return false;
        }
        validate_within_window(created_at, current_ledger, window).is_ok()
    }

    /// Returns the stored `CancellationRecord` for `invoice_id`, if cancelled.
    pub fn cancellation_record(env: Env, invoice_id: Symbol) -> Option<CancellationRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Cancelled(invoice_id))
    }
}
