//! `refund-cap-per-invoice` — standalone Soroban contract enforcing a
//! cumulative refund cap per invoice.

#![no_std]
#![deny(unsafe_code)]

pub mod logic;
pub mod types;

pub use crate::logic::checked_next_refund_total;
pub use crate::types::{DataKey, RefundCapError};

use soroban_sdk::{contract, contractimpl, Env, Symbol};

#[contract]
pub struct RefundCapPerInvoice;

#[contractimpl]
impl RefundCapPerInvoice {
    /// Record `refund_amount` against `invoice_id` capped at `original_amount`.
    /// Returns the new cumulative refunded amount.
    pub fn record_refund(
        env: Env,
        invoice_id: Symbol,
        original_amount: i128,
        refund_amount: i128,
    ) -> Result<i128, RefundCapError> {
        if original_amount <= 0 {
            return Err(RefundCapError::InvalidOriginalAmount);
        }
        let orig_key = DataKey::OriginalAmount(invoice_id.clone());
        if let Some(stored_orig) = env.storage().persistent().get::<DataKey, i128>(&orig_key) {
            if stored_orig != original_amount {
                return Err(RefundCapError::OriginalAmountMismatch);
            }
        }
        let total_key = DataKey::RefundedTotal(invoice_id);
        let current: i128 = env.storage().persistent().get(&total_key).unwrap_or(0);
        let next = checked_next_refund_total(current, original_amount, refund_amount)?;
        env.storage().persistent().set(&orig_key, &original_amount);
        env.storage().persistent().set(&total_key, &next);
        Ok(next)
    }

    /// Return the cumulative amount refunded so far for `invoice_id` (`0` if none).
    pub fn refunded_so_far(env: Env, invoice_id: Symbol) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::RefundedTotal(invoice_id))
            .unwrap_or(0)
    }

    /// Return the remaining refundable balance for `invoice_id`.
    pub fn remaining_refundable(
        env: Env,
        invoice_id: Symbol,
        original_amount: i128,
    ) -> Result<i128, RefundCapError> {
        if original_amount <= 0 {
            return Err(RefundCapError::InvalidOriginalAmount);
        }
        let orig_key = DataKey::OriginalAmount(invoice_id.clone());
        if let Some(stored_orig) = env.storage().persistent().get::<DataKey, i128>(&orig_key) {
            if stored_orig != original_amount {
                return Err(RefundCapError::OriginalAmountMismatch);
            }
        }
        let refunded = Self::refunded_so_far(env, invoice_id);
        Ok(original_amount.saturating_sub(refunded))
    }
}
