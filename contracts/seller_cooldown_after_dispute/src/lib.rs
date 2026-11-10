#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env};
pub use types::{CooldownError, DataKey};
pub use validator::{check_cooldown_elapsed, remaining_ledgers};

#[contract]
pub struct SellerCooldownAfterDisputeContract;

#[contractimpl]
impl SellerCooldownAfterDisputeContract {
    /// Flags a dispute against `seller` at `ledger`. If a later dispute ledger is already
    /// recorded, keeps the monotonic maximum.
    pub fn flag_dispute(env: Env, seller: Address, ledger: u32) {
        let key = DataKey::LastDisputeLedger(seller);
        let updated = match env.storage().persistent().get::<DataKey, u32>(&key) {
            Some(prev) if prev > ledger => prev,
            _ => ledger,
        };
        env.storage().persistent().set(&key, &updated);
    }

    /// Returns `true` if `seller` has no active dispute cooldown at `current_ledger`.
    pub fn can_create_invoice(
        env: Env,
        seller: Address,
        current_ledger: u32,
        cooldown: u32,
    ) -> bool {
        let last = Self::last_dispute_ledger(env, seller);
        matches!(
            check_cooldown_elapsed(last, current_ledger, cooldown),
            Ok(true)
        )
    }

    /// Enforces that `seller` is allowed to create an invoice at `current_ledger`.
    pub fn require_can_create(
        env: Env,
        seller: Address,
        current_ledger: u32,
        cooldown: u32,
    ) -> Result<(), CooldownError> {
        let last = Self::last_dispute_ledger(env, seller);
        if check_cooldown_elapsed(last, current_ledger, cooldown)? {
            Ok(())
        } else {
            Err(CooldownError::CooldownActive)
        }
    }

    /// Returns the most recent dispute ledger recorded for `seller`, if any.
    pub fn last_dispute_ledger(env: Env, seller: Address) -> Option<u32> {
        env.storage()
            .persistent()
            .get(&DataKey::LastDisputeLedger(seller))
    }

    /// Returns the number of ledgers remaining before `seller` can create invoices again.
    pub fn remaining_cooldown(
        env: Env,
        seller: Address,
        current_ledger: u32,
        cooldown: u32,
    ) -> u32 {
        let last = Self::last_dispute_ledger(env, seller);
        remaining_ledgers(last, current_ledger, cooldown)
    }
}
