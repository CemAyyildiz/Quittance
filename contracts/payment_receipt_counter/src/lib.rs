#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env};
pub use types::{DataKey, PayerStats, ReceiptCounterError};
pub use validator::{checked_increment, MAX_BATCH_INCREMENT};

#[contract]
pub struct PaymentReceiptCounterContract;

#[contractimpl]
impl PaymentReceiptCounterContract {
    /// Increments the successful-payment counter for `payer` by 1 and returns the updated count.
    pub fn record_payment(env: Env, payer: Address) -> u32 {
        let current = Self::count_for(env.clone(), payer.clone());
        let next = current.saturating_add(1);
        env.storage()
            .persistent()
            .set(&DataKey::PayerCount(payer.clone()), &next);
        env.storage()
            .persistent()
            .set(&DataKey::PayerLastLedger(payer), &env.ledger().sequence());

        let global: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GlobalPaymentCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::GlobalPaymentCount, &global.saturating_add(1));
        next
    }

    /// Returns the number of successful payments recorded for `payer` (defaults to 0).
    pub fn count_for(env: Env, payer: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::PayerCount(payer))
            .unwrap_or(0)
    }

    /// Increments the successful-payment counter for `payer` by `batch_count` with overflow and bounds checks.
    pub fn record_batch(
        env: Env,
        payer: Address,
        batch_count: u32,
    ) -> Result<u32, ReceiptCounterError> {
        let current = Self::count_for(env.clone(), payer.clone());
        let next = checked_increment(current, batch_count)?;
        env.storage()
            .persistent()
            .set(&DataKey::PayerCount(payer.clone()), &next);
        env.storage()
            .persistent()
            .set(&DataKey::PayerLastLedger(payer), &env.ledger().sequence());

        let global: u32 = env
            .storage()
            .instance()
            .get(&DataKey::GlobalPaymentCount)
            .unwrap_or(0);
        env.storage().instance().set(
            &DataKey::GlobalPaymentCount,
            &global.saturating_add(batch_count),
        );
        Ok(next)
    }

    /// Returns a `PayerStats` snapshot for `payer`.
    pub fn stats_for(env: Env, payer: Address) -> PayerStats {
        let successful_payments = Self::count_for(env.clone(), payer.clone());
        let last_payment_ledger = env
            .storage()
            .persistent()
            .get(&DataKey::PayerLastLedger(payer.clone()))
            .unwrap_or(0);
        PayerStats {
            payer,
            successful_payments,
            last_payment_ledger,
        }
    }

    /// Returns the total count of payments recorded across all payers.
    pub fn global_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::GlobalPaymentCount)
            .unwrap_or(0)
    }
}
