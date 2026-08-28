#![no_std]

//! `quittance-max-amount` — Soroban contract that rejects payments
//! above a configurable maximum ceiling.
//!
//! Purpose
//! -------
//! Quittance invoices are denominated in **stroops**, Stellar's
//! smallest on-chain unit (`1 XLM == 10_000_000` stroops; real-world
//! invoice amounts are well within the `i128` range Stellar uses).
//! Some deployments need an upper bound on a single payment — examples
//! include per-invoice caps for fraud limits, regulatory reporting
//! thresholds, or a merchant's policy on unusually large wires that
//! should be split into multiple invoices instead of one.
//!
//! This contract stores a single ceiling value once, at deploy time,
//! and exposes a tiny, easy-to-call surface that downstream Quittance
//! contracts (and off-chain workers building on top of them) can use
//! to decide whether a given payment amount passes the ceiling.
//!
//! Pair with `quittance-min-amount`
//! --------------------------------
//! This crate is the upper-bound companion to `quittance-min-amount`,
//! which enforces a floor. The two are designed to be composed:
//! downstream contracts compose `check(...)` on both crates to gate
//! a payment inside a `[floor, ceiling]` band. The crates are
//! deliberately separate so each policy decision is independently
//! auditable, versioned, and re-deployable to a new contract address.
//!
//! Semantics
//! ---------
//! - **No public setter, deploy-time-only.** The contract deliberately
//!   does not expose an in-place ceiling update. A new ceiling value
//!   means deploying a new contract instance (a new contract
//!   address); the ceiling is fixed for the lifetime of any given
//!   deploy and there is no method to mutate it on a live contract.
//! - All amounts are in **stroops** (`i128`). Negative `payment_amount`
//!   values are rejected on every code path so that callers do not
//!   need a separate sign guard and behaviour matches the companion
//!   `quittance-min-amount` crate.
//! - "At or below the ceiling" passes; "strictly above the ceiling"
//!   fails. `0` is a valid ceiling that rejects every positive
//!   payment (useful as a "kill switch" deployment).
//!
//! Composition
//! -----------
//! Other contracts can call [`MaxAmount::check`] to gate an inflow
//! and [`MaxAmount::require`] to fail fast with a clear panic
//! message. Both are pure read functions against the same instance
//! storage key and have no authorization requirements of their own.
//!
//! Scope guard
//! -----------
//! This crate owns only the files inside `contracts/max_amount/`. It
//! does not import into the Next.js or Express MVP demos in this PR
//! and does not duplicate admin / init-once logic from
//! `contracts/init_once`.

use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

/// Storage key for the persisted ceiling value.
///
/// `CEILING` is 7 bytes long, well under the 32-byte small-symbol
/// limit, so a `symbol_short!` constant is the cheapest and most
/// serialisation-stable encoding available in Soroban.
const CEILING: Symbol = symbol_short!("CEILING");

/// Soroban contract entry point for the max-amount ceiling check.
#[contract]
pub struct MaxAmount;

#[contractimpl]
impl MaxAmount {
    /// Deploy the contract with the configured ceiling.
    ///
    /// * `ceiling` — the maximum acceptable payment amount, in
    ///   stroops (`i128`). Must be non-negative; negative values
    ///   panic so that a misconfigured deploy cannot silently reject
    ///   every legitimate payment (a negative ceiling would otherwise
    ///   reject anything larger than itself, including all
    ///   realistic positive payments).
    pub fn __constructor(env: Env, ceiling: i128) {
        if ceiling < 0 {
            panic!("ceiling must be non-negative");
        }
        env.storage().instance().set(&CEILING, &ceiling);
    }

    /// Return the ceiling stored at deploy time, in stroops.
    ///
    /// Defaults to `0` only in the (currently impossible) case that
    /// the constructor never ran; the constructor is invoked exactly
    /// once per deployment and always writes a value, so callers
    /// should treat any `0` reply as "ceiling accidentally unset".
    pub fn ceiling(env: Env) -> i128 {
        ceiling_of(&env)
    }

    /// Check whether `payment_amount` is at or below the ceiling.
    ///
    /// Returns `true` when the amount fits under the ceiling and
    /// `false` otherwise. Negative `payment_amount` values always
    /// return `false` so callers do not need a separate sign guard
    /// and behaviour matches the companion [`quittance-min-amount`]
    /// crate.
    ///
    /// [`quittance-min-amount`]: ../min_amount/index.html
    pub fn check(env: Env, payment_amount: i128) -> bool {
        if payment_amount < 0 {
            return false;
        }
        payment_amount <= ceiling_of(&env)
    }

    /// Reject any `payment_amount` that is above the configured
    /// ceiling, or that is negative.
    ///
    /// Panics with `"payment above configured maximum ceiling"`
    /// whenever [`MaxAmount::check`] would return `false`. Use this
    /// in contract methods that should fail fast on overpayment so
    /// the host surfaces a clear error rather than letting an
    /// overpayment flow further into business logic.
    pub fn require(env: Env, payment_amount: i128) {
        if payment_amount < 0 {
            panic!("payment above configured maximum ceiling");
        }
        if payment_amount > ceiling_of(&env) {
            panic!("payment above configured maximum ceiling");
        }
    }
}

/// Read the configured ceiling from instance storage, defaulting to
/// `0` if the slot is somehow empty.
///
/// Centralising the read keeps [`MaxAmount::check`] and
/// [`MaxAmount::require`] on the same storage path, so a future
/// change to the encoding only needs to be made here.
fn ceiling_of(env: &Env) -> i128 {
    env.storage().instance().get(&CEILING).unwrap_or(0)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    // 10 XLM, written in stroops so the unit boundary is visible to
    // every test that references it.
    const TEN_XLM_STROOPS: i128 = 1_000_000_000;

    #[test]
    fn test_payment_below_ceiling_returns_true() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(client.check(&(TEN_XLM_STROOPS - 1)));
        assert!(client.check(&0));
    }

    #[test]
    fn test_payment_equal_to_ceiling_returns_true() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(client.check(&TEN_XLM_STROOPS));
    }

    #[test]
    fn test_payment_above_ceiling_returns_false() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(!client.check(&(TEN_XLM_STROOPS + 1)));
        assert!(!client.check(&(TEN_XLM_STROOPS * 2)));
    }

    #[test]
    fn test_zero_ceiling_rejects_any_positive() {
        // Inverse of the floor crate's "zero floor accepts every
        // non-negative" edge: a zero ceiling rejects every positive
        // payment and accepts only zero. This is useful as a "kill
        // switch" deployment.
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&0);
        assert!(client.check(&0));
        assert!(!client.check(&1));
        assert!(!client.check(&TEN_XLM_STROOPS));
    }

    #[test]
    fn test_negative_payment_rejected_by_check() {
        // Mirrors the floor crate's behaviour: even though
        // `negative <= non-negative-ceiling` is arithmetically true,
        // we reject negatives so callers do not need a separate sign
        // guard and behaviour matches the companion crate.
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(!client.check(&-1));
        assert!(!client.check(&i128::MIN));
    }

    #[test]
    #[should_panic(expected = "ceiling must be non-negative")]
    fn test_negative_ceiling_panics_on_construction() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&-1);
    }

    #[test]
    fn test_ceiling_returns_stored_value() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        let ceiling: i128 = 500_000_000;
        client.__constructor(&ceiling);
        assert_eq!(client.ceiling(), ceiling);
    }

    // ----- `require` (panic-on-above-ceiling) tests ----------------

    #[test]
    fn require_succeeds_at_ceiling() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        // Does not panic — the ceiling itself is acceptable.
        client.require(&TEN_XLM_STROOPS);
    }

    #[test]
    fn require_succeeds_below_ceiling() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        client.require(&(TEN_XLM_STROOPS - 1));
        client.require(&0);
    }

    #[test]
    #[should_panic(expected = "payment above configured maximum ceiling")]
    fn require_panics_above_ceiling() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        client.require(&(TEN_XLM_STROOPS + 1));
    }

    #[test]
    #[should_panic(expected = "payment above configured maximum ceiling")]
    fn require_panics_on_negative_payment() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        client.require(&-1);
    }

    #[test]
    #[should_panic(expected = "payment above configured maximum ceiling")]
    fn require_panics_with_zero_ceiling_and_positive_payment() {
        // Inverse of the floor crate's "zero floor accepts any
        // non-negative" smoke test: a zero ceiling is a kill switch
        // and must panic on any positive payment.
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&0);
        client.require(&1);
    }

    // ----- boundary regression tests ---------------------------------

    #[test]
    fn off_by_one_boundary_with_irrational_ceiling() {
        // Use a ceiling that is not a round multiple of any natural
        // unit so an accidental `<` (strict-less) instead of `<=`
        // refactor would flip at least one of these cases.
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        let ceiling: i128 = 7;
        client.__constructor(&ceiling);

        assert!(client.check(&6));
        assert!(client.check(&7));
        assert!(!client.check(&8));
    }

    #[test]
    fn max_ceiling_at_i128_max_accepts_any_realistic_amount() {
        // Lock the contract against overflow reinterpretation: a
        // ceiling of `i128::MAX` accepts every realistic payment
        // because `payment <= i128::MAX` always holds at the
        // comparison.
        let env = Env::default();
        let contract_id = env.register_contract(None, MaxAmount);
        let client = MaxAmountClient::new(&env, &contract_id);

        client.__constructor(&i128::MAX);
        assert!(client.check(&0));
        assert!(client.check(&TEN_XLM_STROOPS));
        assert!(client.check(&i128::MAX));
    }
}
