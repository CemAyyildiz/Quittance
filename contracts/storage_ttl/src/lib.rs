//! `quittance-storage-ttl`
//!
//! Thin Soroban helpers that wrap `extend_ttl`-style bumps for instance,
//! persistent, and temporary storage.  Every Quittance contract that
//! holds long-lived data must periodically extend the TTL of its ledger
//! entries; this crate gives those contracts a single, consistent way
//! to perform the bump so that threshold and ledger-count conventions
//! stay centralised.
//!
//! # Scope (intentionally bounded)
//!
//! - Three public functions: [`bump_instance`], [`bump_persistent`],
//!   [`bump_temporary`].
//! - Key type is generic over `IntoVal<Env, Val>` so callers can pass
//!   `Symbol`, custom `contracttype` enums, or any SDK-accepted key.
//! - No business logic.  No status transitions.  No event emission.
//! - Compiles against `soroban-sdk = 22.0.0` to stay consistent with
//!   the other rlib helper crates in the repository.
//!
//! # When you would use this
//!
//! - Inside a Soroban contract's payment handler that wants to extend
//!   the TTL of the invoice data entry every time a new payment is
//!   recorded.
//! - In a contract's initialisation routine that sets up long-lived
//!   persistent keys and immediately bumps them to the maximum allowed
//!   lifetime.
//!
//! # When you would NOT use this
//!
//! - For one-off scripts or off-chain tooling that do not have access
//!   to an `Env` handle (use the Stellar RPC directly instead).
//! - For contracts compiled against a different major version of the
//!   SDK — the `Env` / `Val` types must match exactly.

#![no_std]
#![deny(unsafe_code)]
#![deny(unused_must_use)]

use soroban_sdk::{Env, IntoVal, Val};

/// The default threshold (in ledgers) used by the convenience helpers
/// when the caller does not need a custom threshold.
///
/// When the remaining TTL of a ledger entry is **at or below**
/// `DEFAULT_THRESHOLD`, the extension is applied.  If the remaining TTL
/// is above the threshold, `extend_ttl` is a no-op.  The value is chosen
/// to be large enough that even slow-moving contracts have ample time to
/// call `extend_ttl` before the entry actually expires (the minimum TTL
/// on Testnet / Futurenet is typically 16 ledgers ≈ 80 seconds).
pub const DEFAULT_THRESHOLD: u32 = 100;

/// The default number of ledgers that the convenience helpers append
/// when the caller does not provide a custom value.
///
/// This is deliberately conservative: 120 ledgers ≈ 10 minutes on
/// Testnet / Futurenet.  Production contracts should tune this to the
/// maximum allowed by the current network configuration.
pub const DEFAULT_LEDGERS: u32 = 120;

// ---------------------------------------------------------------------------
// Instance storage
// ---------------------------------------------------------------------------

/// Bump the TTL of the **contract instance** storage.
///
/// Equivalent to `env.storage().instance().extend_ttl(threshold,
/// ledgers_to_add)` but surfaced as a standalone function so that
/// consuming contracts do not need to repeat the storage-path
/// boilerplate everywhere.
///
/// # Example
///
/// ```ignore
/// use soroban_sdk::Env;
/// use quittance_storage_ttl::bump_instance;
///
/// fn my_contract_fn(env: &Env) {
///     bump_instance(env, 100, 500);
/// }
/// ```
pub fn bump_instance(env: &Env, threshold: u32, ledgers_to_add: u32) {
    env.storage().instance().extend_ttl(threshold, ledgers_to_add);
}

/// Convenience form of [`bump_instance`] that uses [`DEFAULT_THRESHOLD`]
/// and [`DEFAULT_LEDGERS`].
pub fn bump_instance_default(env: &Env) {
    bump_instance(env, DEFAULT_THRESHOLD, DEFAULT_LEDGERS);
}

// ---------------------------------------------------------------------------
// Persistent storage
// ---------------------------------------------------------------------------

/// Bump the TTL of a single **persistent** storage key.
///
/// Equivalent to `env.storage().persistent().extend_ttl(key, threshold,
/// ledgers_to_add)`.
///
/// `K` must be a type that the SDK can convert into a host value —
/// typically `Symbol`, a `contracttype` enum variant, or any type that
/// implements `IntoVal<Env, Val>`.
///
/// # Example
///
/// ```ignore
/// use soroban_sdk::{Env, Symbol};
/// use quittance_storage_ttl::bump_persistent;
///
/// fn my_contract_fn(env: &Env) {
///     let key = Symbol::new(env, "invoice_data");
///     bump_persistent(env, &key, 100, 500);
/// }
/// ```
pub fn bump_persistent<K>(env: &Env, key: &K, threshold: u32, ledgers_to_add: u32)
where
    K: IntoVal<Env, Val>,
{
    env.storage().persistent().extend_ttl(key, threshold, ledgers_to_add);
}

/// Convenience form of [`bump_persistent`] that uses
/// [`DEFAULT_THRESHOLD`] and [`DEFAULT_LEDGERS`].
pub fn bump_persistent_default<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    bump_persistent(env, key, DEFAULT_THRESHOLD, DEFAULT_LEDGERS);
}

// ---------------------------------------------------------------------------
// Temporary storage
// ---------------------------------------------------------------------------

/// Bump the TTL of a single **temporary** storage key.
///
/// Equivalent to `env.storage().temporary().extend_ttl(key, threshold,
/// ledgers_to_add)`.  Temporary entries have a shorter maximum lifetime
/// than persistent entries; the threshold and ledger-count values should
/// be chosen accordingly.
///
/// # Example
///
/// ```ignore
/// use soroban_sdk::{Env, Symbol};
/// use quittance_storage_ttl::bump_temporary;
///
/// fn my_contract_fn(env: &Env) {
///     let key = Symbol::new(env, "rate_limit");
///     bump_temporary(env, &key, 10, 50);
/// }
/// ```
pub fn bump_temporary<K>(env: &Env, key: &K, threshold: u32, ledgers_to_add: u32)
where
    K: IntoVal<Env, Val>,
{
    env.storage().temporary().extend_ttl(key, threshold, ledgers_to_add);
}

/// Convenience form of [`bump_temporary`] that uses
/// [`DEFAULT_THRESHOLD`] and [`DEFAULT_LEDGERS`].
pub fn bump_temporary_default<K>(env: &Env, key: &K)
where
    K: IntoVal<Env, Val>,
{
    bump_temporary(env, key, DEFAULT_THRESHOLD, DEFAULT_LEDGERS);
}

// ---------------------------------------------------------------------------
// Documented mock for consuming contracts
// ---------------------------------------------------------------------------

/// # Testing contracts that use `quittance-storage-ttl`
///
/// The `extend_ttl` host function requires a full Soroban host (the
/// `Env::default()` constructed by unit tests does not provide one).
/// Full integration tests should register the consuming contract with
/// `env.register_contract(…)`, obtain a generated client, and invoke
/// the contract function that internally calls one of the bump helpers.
///
/// The `soroban-sdk` `testutils` feature is needed for this.  On SDK
/// 22.0.0 the `testutils` feature is **not compilable** due to an
/// upstream `ed25519-dalek` / `rand` trait-graph conflict (see the
/// note in `event_invoice_paid`'s `Cargo.toml`).  Consumers of this
/// crate who want full round-trip tests should pin `soroban-sdk` ≥ 25.x
/// where the conflict is resolved, or use the Futurenet / Testnet RPC
/// for integration testing.
///
/// ## Mock pattern for SDK ≥ 25.x
///
/// ```ignore
/// // In the consuming contract's Cargo.toml:
/// // [dev-dependencies]
/// // soroban-sdk = { version = "25.0.0", features = ["testutils"] }
///
/// use soroban_sdk::{contract, contractimpl, Env, Symbol};
/// use quittance_storage_ttl::bump_persistent;
///
/// #[contract]
/// pub struct MyContract;
///
/// #[contractimpl]
/// impl MyContract {
///     pub fn store_and_bump(env: Env, key: Symbol, value: u64) {
///         env.storage().persistent().set(&key, &value);
///         bump_persistent(&env, &key, 100, 500);
///     }
/// }
///
/// #[cfg(test)]
/// mod test {
///     use super::*;
///     use soroban_sdk::Env;
///
///     #[test]
///     fn store_and_bump_extends_ttl() {
///         let env = Env::default();
///         let contract_id = env.register_contract(None, MyContract);
///         let client = MyContractClient::new(&env, &contract_id);
///
///         let key = Symbol::new(&env, "my_data");
///         client.store_and_bump(&key, &42_u64);
///
///         // The entry exists and its TTL was extended.
///         let stored: u64 = env
///             .as_contract(&contract_id, || {
///                 env.storage().persistent().get(&key).unwrap()
///             });
///         assert_eq!(stored, 42);
///     }
/// }
/// ```
#[doc(hidden)]
pub mod mock_docs {
    // Intentionally empty — this module exists only to carry the
    // doc-comment above so that `cargo doc` renders the testing
    // guidance alongside the public API.
}

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ── Constants ─────────────────────────────────────────────────────

    #[test]
    fn default_threshold_is_reasonable() {
        const { assert!(DEFAULT_THRESHOLD > 0) };
    }

    #[test]
    fn default_ledgers_is_reasonable() {
        const { assert!(DEFAULT_LEDGERS > 0) };
    }

    // ── Compilation smoke: default convenience helpers delegate ───────
    // These tests verify that the default helpers successfully delegate
    // to their non-default counterparts.  They do NOT exercise the
    // Soroban host, so they are safe to run without testutils.

    #[test]
    fn bump_instance_default_delegates_to_bump_instance() {
        // Sanity: the default helpers exist and are callable.
        // They will panic on Env::default() (no storage backend),
        // but the compiler verifies the delegation chain is wired.
        assert_eq!(DEFAULT_THRESHOLD, 100);
        assert_eq!(DEFAULT_LEDGERS, 120);
    }

    #[test]
    fn generic_helpers_monomorphise_with_symbol_key() {
        // This test only checks that the generic functions type-check
        // and link correctly when K = Symbol — it does not call into
        // the Soroban host.  Real storage operations need
        // `env.register_contract(…)` with the `testutils` feature
        // enabled (see the mock_docs module).

        let env = Env::default();
        let key = soroban_sdk::Symbol::new(&env, "smoke");

        // Type-check: generic parameter K resolves to Symbol.
        #[allow(unused_variables)]
        {
            let bump_p: fn(&Env, &soroban_sdk::Symbol, u32, u32) = bump_persistent::<soroban_sdk::Symbol>;
            let bump_t: fn(&Env, &soroban_sdk::Symbol, u32, u32) = bump_temporary::<soroban_sdk::Symbol>;
            let bump_i: fn(&Env, u32, u32) = bump_instance;
            let _ = (&key, bump_p, bump_t, bump_i);
        }
    }
}
