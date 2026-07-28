#![no_std]

//! `seller-bind`
//!
//! Soroban helper contract that exposes a single, narrow responsibility:
//! assert that a provided Stellar seller `Address` matches an expected
//! binding stored on the contract instance.
//!
//! The crate is intentionally additive and self-contained. It does not
//! modify or wire into the Quittance Next.js frontend or Express MVP
//! backend in this PR.
//!
//! # Usage
//!
//! 1. Deploy this contract and call [`SellerBind::init`] with the seller
//!    address that should be considered authoritative.
//! 2. Call [`SellerBind::check_seller`] from any other contract or
//!    client that wants to verify a provided seller address against the
//!    stored binding.
//!
//! Mismatches are surfaced as [`Error::SellerMismatch`] so they are easy
//! to recognize on-chain and in transaction metadata.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env};

/// Storage keys kept on the contract instance.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    /// The bound seller address.
    Seller,
}

/// Errors returned by `seller-bind`.
///
/// Every variant is given a stable `u32` code so that off-chain tools
/// can pattern-match on the SC-encoded result without having to
/// re-derive the Rust identifier from the variant name.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// The binding was read before [`SellerBind::init`] was called.
    NotInitialized = 1,
    /// The provided seller address does not match the stored binding.
    SellerMismatch = 2,
}

/// Soroban contract that asserts seller address bindings.
///
/// This is a `no_std` Soroban contract. All public methods are exposed
/// as entry points; storage is kept on the contract `instance` so the
/// binding follows the contract address.
#[contract]
pub struct SellerBind;

#[contractimpl]
impl SellerBind {
    /// Initialize the contract with the seller address that subsequent
    /// [`check_seller`] calls will be compared against.
    ///
    /// This overwrites any previously stored binding.
    pub fn init(env: &Env, seller: &Address) {
        env.storage().instance().set(&DataKey::Seller, seller);
    }

    /// Replace the stored binding. Returns [`Error::NotInitialized`] if
    /// the contract was never initialized.
    pub fn set_seller(env: &Env, seller: &Address) -> Result<(), Error> {
        if !env.storage().instance().has(&DataKey::Seller) {
            return Err(Error::NotInitialized);
        }
        env.storage().instance().set(&DataKey::Seller, seller);
        Ok(())
    }

    /// Return the currently bound seller address, or
    /// [`Error::NotInitialized`] if no binding has been set yet.
    pub fn get_seller(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Seller)
            .ok_or(Error::NotInitialized)
    }

    /// Assert that `provided` matches the stored seller binding.
    ///
    /// Returns `Ok(())` on a match. Returns [`Error::SellerMismatch`]
    /// when the addresses differ and [`Error::NotInitialized`] if no
    /// binding has been set yet — both make the cause unambiguous in
    /// transaction metadata.
    pub fn check_seller(env: &Env, provided: &Address) -> Result<(), Error> {
        let expected: Address = env
            .storage()
            .instance()
            .get(&DataKey::Seller)
            .ok_or(Error::NotInitialized)?;
        if provided != &expected {
            return Err(Error::SellerMismatch);
        }
        Ok(())
    }
}

#[cfg(test)]
mod test;
