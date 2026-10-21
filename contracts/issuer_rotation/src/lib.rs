#![no_std]
#![deny(unsafe_code)]

mod errors;
mod state;

pub use errors::Error;
use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

/// One-time invoice issuer transfer contract.
#[contract]
pub struct IssuerRotation;

#[contractimpl]
impl IssuerRotation {
    /// Set the initial issuer for an invoice exactly once.
    pub fn initialize(env: Env, invoice_id: Symbol, issuer: Address) -> Result<(), Error> {
        issuer.require_auth();
        if state::get_issuer(&env, &invoice_id).is_some() {
            return Err(Error::AlreadyInitialized);
        }
        state::set_issuer(&env, &invoice_id, &issuer);
        Ok(())
    }

    /// Transfer issuer rights to a new address one time only.
    pub fn rotate_issuer(
        env: Env,
        invoice_id: Symbol,
        current: Address,
        new_issuer: Address,
    ) -> Result<(), Error> {
        current.require_auth();
        if state::is_rotated(&env, &invoice_id) {
            return Err(Error::AlreadyRotated);
        }
        let Some(stored_issuer) = state::get_issuer(&env, &invoice_id) else {
            return Err(Error::NotInitialized);
        };
        if stored_issuer != current {
            return Err(Error::NotCurrentIssuer);
        }
        if current == new_issuer {
            return Err(Error::SameIssuer);
        }

        state::set_issuer(&env, &invoice_id, &new_issuer);
        state::mark_rotated(&env, &invoice_id);
        Ok(())
    }

    /// Return the current issuer, or `None` if the invoice is not initialized.
    pub fn issuer(env: Env, invoice_id: Symbol) -> Option<Address> {
        state::get_issuer(&env, &invoice_id)
    }
}
