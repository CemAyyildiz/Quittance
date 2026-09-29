#![no_std]

//! network_passphrase - Soroban helper for validating Stellar network passphrases
//!
//! This crate provides utilities for working with Stellar network passphrases,
//! particularly for validating that only known, safe passphrases are used in
//! Quittance contracts to prevent network confusion attacks.
//!
//! Known passphrases:
//! - Stellar Testnet: "Test SDF Network ; September 2015"
//! - Stellar Publicnet: "Public Global Stellar Network ; September 2015"
//!
//! Unknown/rejected passphrases:
//! - Stellar Futurenet: "Test SDF Future Network ; October 2022"
//! - Any other custom or test passphrases

use soroban_sdk::{Env, String, Symbol};

/// Known Stellar network passphrases
pub const PASSPHRASE_TESTNET: &str = "Test SDF Network ; September 2015";
pub const PASSPHRASE_PUBLIC: &str = "Public Global Stellar Network ; September 2015";

/// Build a symbol from the testnet passphrase
pub fn passphrase_testnet(env: &Env) -> Symbol {
    Symbol::new(env, PASSPHRASE_TESTNET)
}

/// Build a symbol from the public network passphrase
pub fn passphrase_public(env: &Env) -> Symbol {
    Symbol::new(env, PASSPHRASE_PUBLIC)
}

/// Check if a given passphrase symbol corresponds to a known network
pub fn is_known_passphrase(env: &Env, passphrase: &Symbol) -> bool {
    let known_testnet = Symbol::new(env, PASSPHRASE_TESTNET);
    let known_public = Symbol::new(env, PASSPHRASE_PUBLIC);

    passphrase.eq(&known_testnet) || passphrase.eq(&known_public)
}

/// Get the testnet passphrase as a String
pub fn get_testnet_passphrase(env: &Env) -> String {
    String::from_env(env, PASSPHRASE_TESTNET)
}

/// Get the public network passphrase as a String
pub fn get_public_passphrase(env: &Env) -> String {
    String::from_env(env, PASSPHRASE_PUBLIC)
}

#[cfg(test)]
mod test;