//! `refund-cap-per-invoice` — standalone Soroban cumulative refund cap contract.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::apply_refund;
pub use crate::types::{DataKey, Error, RefundRecord};

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct RefundCapPerInvoice;

#[contractimpl]
impl RefundCapPerInvoice {
    /// Record a partial or full refund against `invoice_id`, returning the new cumulative total.
    pub fn record_refund(
        env: Env,
        invoice_id: Symbol,
        original_amount: i128,
        refund_amount: i128,
    ) -> Result<i128, Error> {
        let existing = storage::get_record(&env, &invoice_id);
        let updated = logic::apply_refund(existing.as_ref(), original_amount, refund_amount)?;
        storage::set_record(&env, &invoice_id, &updated);
        Ok(updated.refunded_total)
    }

    /// Return the cumulative amount refunded so far for `invoice_id` (`0` if none).
    pub fn refunded_so_far(env: Env, invoice_id: Symbol) -> i128 {
        storage::get_record(&env, &invoice_id)
            .map(|r| r.refunded_total)
            .unwrap_or(0)
    }

    /// Return the remaining refundable balance for `invoice_id`.
    pub fn remaining_refundable(
        env: Env,
        invoice_id: Symbol,
        original_amount: i128,
    ) -> Result<i128, Error> {
        if original_amount <= 0 {
            return Err(Error::InvalidOriginalAmount);
        }
        if let Some(rec) = storage::get_record(&env, &invoice_id) {
            if rec.original_amount != original_amount {
                return Err(Error::OriginalAmountMismatch);
            }
            Ok(original_amount - rec.refunded_total)
        } else {
            Ok(original_amount)
        }
    }
}
