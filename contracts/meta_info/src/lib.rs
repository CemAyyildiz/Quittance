#![no_std]

//! `meta-info` — Quittance Soroban contract exposing identity and version
//! strings for off-chain tooling and on-chain introspection.
//!
//! This contract has no storage writes, no constructor, and no
//! side-effects. It exists solely so that any front-end, indexer, or
//! governance tool can query a deployed Quittance contract and learn
//! which project it belongs to and which version of the contract logic
//! is running.
//!
//! # Stability
//!
//! - [`name`] will always return `"Quittance"`.
//! - [`version`] returns a semver string that changes only when the
//!   contract logic in this crate is updated in a material way.
//!
//! # Usage (Soroban CLI)
//!
//! ```ignore
//! # After deploying:
//! soroban contract invoke \
//!   --id <CONTRACT_ID> \
//!   -- \
//!   name
//!
//! soroban contract invoke \
//!   --id <CONTRACT_ID> \
//!   -- \
//!   version
//! ```

use soroban_sdk::{contract, contractimpl, Env, String};

/// The canonical project name returned by [`MetaInfo::name`].
pub const PROJECT_NAME: &str = "Quittance";

/// The current semver string returned by [`MetaInfo::version`].
///
/// Bump this when the contract logic in this crate changes in a
/// material way. Follow semver: increment the major version for
/// breaking changes (e.g. altering the signature or behaviour of any
/// public function), the minor version for backwards-compatible
/// additions, and the patch version for backwards-compatible bug
/// fixes.
pub const CONTRACT_VERSION: &str = "0.1.0";

/// Soroban contract exposing read-only project identity and version.
///
/// No constructor is needed because the contract operates entirely on
/// compile-time constants. All functions are idempotent and return the
/// same value for the lifetime of a deployed instance built from a
/// given binary.
#[contract]
pub struct MetaInfo;

#[contractimpl]
impl MetaInfo {
    /// Return the canonical project name (`"Quittance"`).
    ///
    /// Consumers can use this string to confirm they are interacting
    /// with a Quittance contract rather than an unrelated Soroban
    /// contract.
    pub fn name(env: Env) -> String {
        String::from_str(&env, PROJECT_NAME)
    }

    /// Return the semver string of this contract crate.
    ///
    /// The returned string follows semver and is bumped on every
    /// material change to the contract logic. Consumers should parse
    /// it as a semver version and compare with their expected range.
    pub fn version(env: Env) -> String {
        String::from_str(&env, CONTRACT_VERSION)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    #[test]
    fn name_returns_quittance() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MetaInfo);
        let client = MetaInfoClient::new(&env, &contract_id);

        assert_eq!(client.name(), String::from_str(&env, PROJECT_NAME));
    }

    #[test]
    fn version_returns_current_constant() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MetaInfo);
        let client = MetaInfoClient::new(&env, &contract_id);

        assert_eq!(client.version(), String::from_str(&env, CONTRACT_VERSION));
    }

    #[test]
    fn name_and_version_are_distinct_strings() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MetaInfo);
        let client = MetaInfoClient::new(&env, &contract_id);

        let n = client.name();
        let v = client.version();

        assert_ne!(n, v, "name and version must be different strings");
        assert!(
            !n.is_empty(),
            "name must not be empty"
        );
        assert!(
            !v.is_empty(),
            "version must not be empty"
        );
    }
}
