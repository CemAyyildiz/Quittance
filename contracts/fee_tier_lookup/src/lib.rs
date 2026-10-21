//! `fee-tier-lookup` — standalone Soroban contract: tiered fee lookup.
//!
//! Looks up a fee percentage (in basis points) for a payment amount based on a
//! set of configurable brackets ("tiers"). This is a self-contained
//! learning/utility contract in the same family as the other standalone
//! `contracts/*` crates. It is **not** wired into the frontend, backend, or any
//! other contract in this repo — it ships and is tested entirely on its own.
//!
//! # What it does
//!
//! An admin configures an ordered list of [`Tier`] brackets, each mapping an
//! inclusive amount ceiling to a fee in basis points. `fee_bps_for(amount)`
//! then resolves which bracket a payment amount falls into and returns its fee.
//!
//! # Rules
//!
//! 1. **Admin authority** — only the admin set at construction may mutate
//!    tiers. Admin-gated calls require that address's signature.
//! 2. **Bracket validity** — every tier bound must be positive and strictly
//!    greater than the previous bound, so brackets never overlap.
//! 3. **Basis-point range** — every fee must be within `0..=10_000`
//!    (`0%` through `100%`).
//! 4. **Top bracket is open-ended** — amounts above the highest configured
//!    bound resolve to the highest tier's fee.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `__constructor(admin)` | `fn(Env, Address)` | Stores the admin; runs at deploy. |
//! | `set_tier(admin, upto_amount, bps)` | `fn(Env, Address, i128, u32) -> Result<(), TierError>` | Append one bracket (admin-only). |
//! | `set_tiers(admin, tiers)` | `fn(Env, Address, Vec<Tier>) -> Result<(), TierError>` | Replace all brackets (admin-only). |
//! | `fee_bps_for(amount)` | `fn(Env, i128) -> Result<u32, TierError>` | Resolve the fee for an amount. |
//! | `tiers()` | `fn(Env) -> Vec<Tier>` | Read back the configured brackets. |
//! | `admin()` | `fn(Env) -> Address` | Read back the current admin. |
//! | `Tier` | `struct` | `{ upto_amount: i128, bps: u32 }`. |
//! | `TierError` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |
//!
//! # Usage
//!
//! ```rust
//! use fee_tier_lookup::{FeeTierLookup, FeeTierLookupClient};
//! use soroban_sdk::{testutils::Address as _, Address, Env};
//!
//! let env = Env::default();
//! env.mock_all_auths();
//! let admin = Address::generate(&env);
//! let contract_id = env.register(FeeTierLookup, (&admin,));
//! let client = FeeTierLookupClient::new(&env, &contract_id);
//!
//! client.set_tier(&admin, &1_000, &50);   // <= 1_000 units -> 0.50%
//! client.set_tier(&admin, &10_000, &100); // <= 10_000 units -> 1.00%
//! assert_eq!(client.fee_bps_for(&500), 50);
//! assert_eq!(client.fee_bps_for(&5_000), 100);
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cd contracts/fee_tier_lookup
//! cargo test
//! cargo clippy --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

mod storage;
mod tiers;
mod types;

pub use crate::tiers::{resolve_fee, validate_tier, validate_tiers};
pub use crate::types::{Tier, TierError, MAX_BPS};

use soroban_sdk::{contract, contractimpl, Address, Env, Vec};

/// Tiered fee lookup contract.
#[contract]
pub struct FeeTierLookup;

#[contractimpl]
impl FeeTierLookup {
    /// Store the fee `admin` at deploy time.
    ///
    /// Mirrors the `__constructor` pattern used by `currency_decimals_registry`:
    /// Soroban runs this once when the contract is registered, so the admin
    /// cannot be reset by a later call.
    pub fn __constructor(env: Env, admin: Address) {
        storage::set_admin(&env, &admin);
        storage::set_tiers(&env, &Vec::new(&env));
    }

    /// Return the current fee admin.
    pub fn admin(env: Env) -> Address {
        storage::admin(&env).expect("fee-tier-lookup admin must be initialized")
    }

    /// Append a single bracket to the tier list. Admin-only.
    ///
    /// `upto_amount` is the inclusive ceiling of the new bracket; `bps` is its
    /// fee. The new bound must be strictly greater than the current largest
    /// bound (or positive when the list is empty).
    pub fn set_tier(
        env: Env,
        admin: Address,
        upto_amount: i128,
        bps: u32,
    ) -> Result<(), TierError> {
        require_admin(&env, &admin)?;
        admin.require_auth();

        let candidate = Tier { upto_amount, bps };
        validate_tier(&candidate)?;

        let mut current = storage::tiers(&env);
        if let Some(last) = current.last() {
            if upto_amount <= last.upto_amount {
                return Err(TierError::InvalidBound);
            }
        }
        current.push_back(candidate);
        storage::set_tiers(&env, &current);
        Ok(())
    }

    /// Replace the whole tier list. Admin-only.
    ///
    /// Every bracket is validated as a set: bounds must be positive and
    /// strictly increasing.
    pub fn set_tiers(env: Env, admin: Address, tiers: Vec<Tier>) -> Result<(), TierError> {
        require_admin(&env, &admin)?;
        admin.require_auth();
        validate_tiers(&tiers)?;
        storage::set_tiers(&env, &tiers);
        Ok(())
    }

    /// Resolve the fee (basis points) that applies to `amount`.
    ///
    /// Returns the fee of the first bracket whose ceiling is `>= amount`, or
    /// the highest bracket's fee when `amount` exceeds every configured bound.
    pub fn fee_bps_for(env: Env, amount: i128) -> Result<u32, TierError> {
        let tiers = storage::tiers(&env);
        resolve_fee(&tiers, amount)
    }

    /// Return a copy of the configured brackets, in ascending bound order.
    pub fn tiers(env: Env) -> Vec<Tier> {
        storage::tiers(&env)
    }
}

/// Return `Err(NotAuthorised)` unless `candidate` matches the stored admin.
fn require_admin(env: &Env, candidate: &Address) -> Result<(), TierError> {
    match storage::admin(env) {
        Some(admin) if &admin == candidate => Ok(()),
        _ => Err(TierError::NotAuthorised),
    }
}
