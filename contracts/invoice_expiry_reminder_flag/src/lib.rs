#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Env, Symbol};
pub use types::{DataKey, ReminderFlagError, ReminderRecord};
pub use validator::{build_reminder_record, ensure_not_already_reminded};

#[contract]
pub struct InvoiceExpiryReminderFlagContract;

#[contractimpl]
impl InvoiceExpiryReminderFlagContract {
    /// One-way flag recording that an expiry reminder has been handled for `invoice_id`.
    /// Returns `true` when transitioning from unreminded to reminded, or `false` if
    /// `invoice_id` was already marked as reminded.
    pub fn mark_reminded(env: Env, invoice_id: Symbol) -> bool {
        let key = DataKey::Reminded(invoice_id.clone());
        if env.storage().persistent().has(&key) {
            return false;
        }
        let record = build_reminder_record(invoice_id, env.ledger().sequence());
        env.storage().persistent().set(&key, &record);

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRemindedCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalRemindedCount, &count.saturating_add(1));
        true
    }

    /// Returns `true` if `invoice_id` has already been marked as reminded.
    pub fn was_reminded(env: Env, invoice_id: Symbol) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Reminded(invoice_id))
    }

    /// Strict variant of `mark_reminded` that returns `Err(AlreadyReminded)` on duplicate calls.
    pub fn try_mark_once(env: Env, invoice_id: Symbol) -> Result<ReminderRecord, ReminderFlagError> {
        let key = DataKey::Reminded(invoice_id.clone());
        ensure_not_already_reminded(env.storage().persistent().has(&key))?;
        let record = build_reminder_record(invoice_id, env.ledger().sequence());
        env.storage().persistent().set(&key, &record);

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::TotalRemindedCount)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalRemindedCount, &count.saturating_add(1));
        Ok(record)
    }

    /// Returns the stored `ReminderRecord` for `invoice_id` if reminded.
    pub fn reminder_record(env: Env, invoice_id: Symbol) -> Result<ReminderRecord, ReminderFlagError> {
        env.storage()
            .persistent()
            .get(&DataKey::Reminded(invoice_id))
            .ok_or(ReminderFlagError::NotReminded)
    }

    /// Returns the total number of distinct invoices marked as reminded.
    pub fn total_reminded_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::TotalRemindedCount)
            .unwrap_or(0)
    }
}
