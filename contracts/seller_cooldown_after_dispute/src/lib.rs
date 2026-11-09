//! `seller-cooldown-after-dispute` — standalone Soroban contract: seller
//! invoice-creation cooldown after a dispute.
//!
//! Once a dispute is flagged against a seller, blocks that seller from
//! creating new invoices for a fixed number of ledgers, then automatically
//! allows creation again without any manual reset.

#![no_std]
#![deny(unsafe_code)]

mod logic;
mod storage;
mod types;

#[cfg(test)]
mod tests;

pub use crate::logic::{can_create_at, evaluate_status, remaining_ledgers, unlock_ledger};
pub use crate::types::{CooldownError, CooldownStatus, DataKey};

use soroban_sdk::{contract, contractimpl, Address, Env};

/// Enforces a per-seller ledger cooldown after a dispute is flagged.
#[contract]
pub struct SellerCooldownAfterDispute;

#[contractimpl]
impl SellerCooldownAfterDispute {
    /// Flag a dispute against `seller` at `ledger`.
    ///
    /// If `seller` already has a recorded dispute at a later ledger, the later
    /// ledger is retained so an out-of-order call cannot shorten an active
    /// cooldown.
    pub fn flag_dispute(env: Env, seller: Address, ledger: u32) {
        storage::record_dispute_monotonic(&env, &seller, ledger);
    }

    /// Flag a dispute against `seller` at `ledger`, rejecting ledger regressions.
    ///
    /// Returns [`CooldownError::LedgerRegression`] if `seller` already has a
    /// dispute recorded at a strictly later ledger than `ledger`.
    pub fn flag_dispute_checked(
        env: Env,
        seller: Address,
        ledger: u32,
    ) -> Result<u32, CooldownError> {
        if let Some(existing) = storage::get_dispute_ledger(&env, &seller) {
            if ledger < existing {
                return Err(CooldownError::LedgerRegression);
            }
        }
        storage::set_dispute_ledger(&env, &seller, ledger);
        Ok(ledger)
    }

    /// Return whether `seller` is allowed to create a new invoice at
    /// `current_ledger` under a `cooldown` duration (in ledgers).
    ///
    /// Returns `true` when `seller` has never had a dispute flagged, when
    /// `cooldown == 0`, or when `current_ledger >= dispute_ledger + cooldown`.
    pub fn can_create_invoice(
        env: Env,
        seller: Address,
        current_ledger: u32,
        cooldown: u32,
    ) -> bool {
        let dispute_ledger = storage::get_dispute_ledger(&env, &seller);
        logic::can_create_at(dispute_ledger, current_ledger, cooldown)
    }

    /// Return the most recent dispute ledger recorded for `seller`, or `None`
    /// if no dispute has been flagged.
    pub fn last_dispute_ledger(env: Env, seller: Address) -> Option<u32> {
        storage::get_dispute_ledger(&env, &seller)
    }

    /// Return the number of ledgers remaining before `seller` can create
    /// invoices again (`0` when already allowed).
    pub fn remaining_cooldown(
        env: Env,
        seller: Address,
        current_ledger: u32,
        cooldown: u32,
    ) -> u32 {
        let dispute_ledger = storage::get_dispute_ledger(&env, &seller);
        logic::remaining_ledgers(dispute_ledger, current_ledger, cooldown)
    }

    /// Return a combined [`CooldownStatus`] snapshot for `seller`.
    pub fn status(
        env: Env,
        seller: Address,
        current_ledger: u32,
        cooldown: u32,
    ) -> CooldownStatus {
        let dispute_ledger = storage::get_dispute_ledger(&env, &seller);
        logic::evaluate_status(dispute_ledger, current_ledger, cooldown)
    }
}
