#![no_std]

//! `network-passphrase` — Stellar network passphrase constants exposed
//! via read-only Soroban contract functions.
//!
//! # Motivation
//!
//! When verifying Stellar transaction signatures or deriving network
//! hashes, Soroban contracts need access to the canonical passphrase
//! string for the network they are deployed on. This crate exposes
//! both standard passphrases (testnet and public/mainnet) as read-only
//! contract functions so that any on-chain or off-chain caller can
//! retrieve them without hard-coding string literals.
//!
//! # Usage
//!
//! ```ignore
//! use soroban_sdk::{Env, String};
//! use network_passphrase::NetworkPassphraseClient;
//!
//! fn example(env: Env) {
//!     let client = NetworkPassphraseClient::new(&env, &contract_id);
//!
//!     let testnet: String = client.testnet_passphrase();
//!     let public: String = client.public_passphrase();
//! }
//! ```
//!
//! # References
//!
//! - <https://developers.stellar.org/docs/glossary/network-passphrase>
//! - <https://github.com/stellar/stellar-protocol/blob/master/core/cap-0046.md>

use soroban_sdk::{contract, contractimpl, contracttype, Env, String};

/// Canonical Stellar **testnet** network passphrase.
///
/// Used when deriving the network ID for Stellar testnet (a.k.a. SDF
/// Testnet or Futurenet-like test infrastructure) transactions.
///
/// ## Value
///
/// `"Test SDF Network ; September 2015"`
pub const TESTNET_PASSPHRASE: &str = "Test SDF Network ; September 2015";

/// Canonical Stellar **public** (mainnet) network passphrase.
///
/// Used when deriving the network ID for the production Stellar
/// public network transactions.
///
/// ## Value
///
/// `"Public Global Stellar Network ; September 2015"`
pub const PUBLIC_PASSPHRASE: &str = "Public Global Stellar Network ; September 2015";

/// Identifies which Stellar network passphrase to return.
///
/// Passed to the [`NetworkPassphrase::passphrase`] function to select
/// between the two supported passphrases.
#[contracttype]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
pub enum Network {
    /// The SDF testnet passphrase.
    Testnet,
    /// The public/mainnet passphrase.
    Public,
}


/// Returns `true` when `passphrase` is exactly the Stellar Testnet passphrase.
pub fn is_testnet_passphrase(passphrase: &str) -> bool {
    passphrase == TESTNET_PASSPHRASE
}

/// Returns `true` when `passphrase` is exactly the Stellar Public network passphrase.
pub fn is_public_passphrase(passphrase: &str) -> bool {
    passphrase == PUBLIC_PASSPHRASE
}

/// Returns `true` when `passphrase` is one of the supported canonical
/// Stellar network passphrases.
///
/// Futurenet and other custom passphrases are intentionally not recognized.
pub fn is_known_passphrase(passphrase: &str) -> bool {
    is_testnet_passphrase(passphrase) || is_public_passphrase(passphrase)
}

/// Soroban contract that exposes the standard Stellar network
/// passphrases as read-only contract functions.
///
/// This contract has no storage writes and no side effects — every
/// function returns a string that is a compile-time constant.
#[contract]
pub struct NetworkPassphrase;

#[contractimpl]
impl NetworkPassphrase {
    /// Return the canonical testnet passphrase.
    ///
    /// ## Example
    ///
    /// ```ignore
    /// let testnet: soroban_sdk::String = client.testnet_passphrase();
    /// assert_eq!(testnet.to_string(), "Test SDF Network ; September 2015");
    /// ```
    pub fn testnet_passphrase(env: &Env) -> String {
        String::from_str(env, TESTNET_PASSPHRASE)
    }

    /// Return the canonical public/mainnet passphrase.
    ///
    /// ## Example
    ///
    /// ```ignore
    /// let public: soroban_sdk::String = client.public_passphrase();
    /// assert_eq!(public.to_string(), "Public Global Stellar Network ; September 2015");
    /// ```
    pub fn public_passphrase(env: &Env) -> String {
        String::from_str(env, PUBLIC_PASSPHRASE)
    }

    /// Select and return a passphrase by network variant.
    ///
    /// This is a single-entry-point alternative to the two dedicated
    /// functions above. It accepts a [`Network`] enum value and
    /// returns the corresponding passphrase string.
    ///
    /// ## Example
    ///
    /// ```ignore
    /// use network_passphrase::Network;
    ///
    /// let testnet: soroban_sdk::String = client.passphrase(&Network::Testnet);
    /// let public: soroban_sdk::String = client.passphrase(&Network::Public);
    /// ```
    pub fn passphrase(env: &Env, network: &Network) -> String {
        match network {
            Network::Testnet => String::from_str(env, TESTNET_PASSPHRASE),
            Network::Public => String::from_str(env, PUBLIC_PASSPHRASE),
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::Env;

    // ----- testnet_passphrase --------------------------------------------

    #[test]
    fn testnet_passphrase_returns_correct_string() {
        let env = Env::default();
        let contract_id = env.register(NetworkPassphrase, ());
        let client = NetworkPassphraseClient::new(&env, &contract_id);

        let result: String = client.testnet_passphrase();
        let expected: String = String::from_str(&env, TESTNET_PASSPHRASE);
        assert_eq!(result, expected);
    }

    #[test]
    fn testnet_dedicated_and_selector_agree() {
        let env = Env::default();
        let contract_id = env.register(NetworkPassphrase, ());
        let client = NetworkPassphraseClient::new(&env, &contract_id);

        let dedicated: String = client.testnet_passphrase();
        let selected: String = client.passphrase(&Network::Testnet);
        assert_eq!(dedicated, selected);
    }

    // ----- public_passphrase ---------------------------------------------

    #[test]
    fn public_passphrase_returns_correct_string() {
        let env = Env::default();
        let contract_id = env.register(NetworkPassphrase, ());
        let client = NetworkPassphraseClient::new(&env, &contract_id);

        let result: String = client.public_passphrase();
        let expected: String = String::from_str(&env, PUBLIC_PASSPHRASE);
        assert_eq!(result, expected);
    }

    #[test]
    fn public_dedicated_and_selector_agree() {
        let env = Env::default();
        let contract_id = env.register(NetworkPassphrase, ());
        let client = NetworkPassphraseClient::new(&env, &contract_id);

        let dedicated: String = client.public_passphrase();
        let selected: String = client.passphrase(&Network::Public);
        assert_eq!(dedicated, selected);
    }

    // ----- passphrase(Network) selector ----------------------------------

    #[test]
    fn passphrase_selector_testnet() {
        let env = Env::default();
        let contract_id = env.register(NetworkPassphrase, ());
        let client = NetworkPassphraseClient::new(&env, &contract_id);

        let result: String = client.passphrase(&Network::Testnet);
        let expected: String = String::from_str(&env, TESTNET_PASSPHRASE);
        assert_eq!(
            result, expected,
            "passphrase(Testnet) must equal the testnet constant"
        );
    }

    #[test]
    fn passphrase_selector_public() {
        let env = Env::default();
        let contract_id = env.register(NetworkPassphrase, ());
        let client = NetworkPassphraseClient::new(&env, &contract_id);

        let result: String = client.passphrase(&Network::Public);
        let expected: String = String::from_str(&env, PUBLIC_PASSPHRASE);
        assert_eq!(
            result, expected,
            "passphrase(Public) must equal the public constant"
        );
    }

    // ----- the two passphrases must differ -------------------------------

    #[test]
    fn testnet_and_public_are_distinct() {
        let env = Env::default();
        let contract_id = env.register(NetworkPassphrase, ());
        let client = NetworkPassphraseClient::new(&env, &contract_id);

        let testnet: String = client.testnet_passphrase();
        let public: String = client.public_passphrase();
        assert_ne!(
            testnet, public,
            "testnet and public passphrases must not be equal"
        );
    }

    // ----- off-chain passphrase matchers ---------------------------------

    #[test]
    fn is_testnet_passphrase_matches_constant() {
        assert!(is_testnet_passphrase(TESTNET_PASSPHRASE));
        assert!(!is_testnet_passphrase(PUBLIC_PASSPHRASE));
        assert!(!is_testnet_passphrase(""));
    }

    #[test]
    fn is_public_passphrase_matches_constant() {
        assert!(is_public_passphrase(PUBLIC_PASSPHRASE));
        assert!(!is_public_passphrase(TESTNET_PASSPHRASE));
        assert!(!is_public_passphrase("not-a-passphrase"));
    }

    // ----- known passphrase matcher --------------------------------------

    #[test]
    fn is_known_passphrase_accepts_testnet() {
        assert!(is_known_passphrase(TESTNET_PASSPHRASE));
    }

    #[test]
    fn is_known_passphrase_accepts_public() {
        assert!(is_known_passphrase(PUBLIC_PASSPHRASE));
    }

    #[test]
    fn is_known_passphrase_rejects_empty() {
        assert!(!is_known_passphrase(""));
    }

    #[test]
    fn is_known_passphrase_rejects_typo() {
        assert!(!is_known_passphrase("Public Global Stellar Network ; September 2016"));
    }
}

