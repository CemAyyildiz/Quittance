#![no_std]

//! Admin-managed decimal places for currency codes on Soroban.

mod storage;
mod types;

pub use types::RegistryError;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

/// Returned for a code with no registry entry.
pub const DEFAULT_DECIMALS: u32 = 7;
/// Largest accepted number of decimal places.
pub const MAX_DECIMALS: u32 = 18;

/// Registry with one immutable administrator and independent entries by code.
#[contract]
pub struct CurrencyDecimalsRegistry;

#[contractimpl]
impl CurrencyDecimalsRegistry {
    /// Set the administrator when the contract is deployed.
    pub fn __constructor(env: Env, admin: Address) {
        storage::set_admin(&env, &admin);
    }

    /// Set decimal places for a code. The original administrator must authorize the call.
    pub fn set_decimals(
        env: Env,
        admin: Address,
        code: Symbol,
        decimals: u32,
    ) -> Result<(), RegistryError> {
        if admin != storage::admin(&env) {
            return Err(RegistryError::NotAdmin);
        }
        admin.require_auth();
        if decimals > MAX_DECIMALS {
            return Err(RegistryError::InvalidDecimals);
        }
        storage::set_decimals(&env, &code, decimals);
        Ok(())
    }

    /// Return a registered value, or seven decimal places for an unknown code.
    pub fn decimals_of(env: Env, code: Symbol) -> u32 {
        storage::decimals_of(&env, &code).unwrap_or(DEFAULT_DECIMALS)
    }
}
