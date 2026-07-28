#![no_std]

//! `quittance-min-amount` — Soroban contract that rejects payments
//! below a configurable minimum floor.
//!
//! Purpose
//! -------
//! Quittance invoices are denominated in **stroops**, Stellar's
//! smallest on-chain unit (`1 XLM == 10_000_000` stroops; amounts above
//! or equal to this floor are well within the `i128` range Stellar
//! uses). Merchants who issue very small invoices (test amounts, dust,
//! accidental micro-payments) still want those amounts to count toward
//! the invoice balance, but infrastructure that aggregates, indexes,
//! or automates payouts often needs to ignore them.
//!
//! This contract stores a single floor value once, at deploy time, and
//! exposes a tiny, easy-to-call surface that downstream Quittance
//! contracts (and off-chain workers building on top of them) can use
//! to decide whether a given payment amount passes the floor.
//!
//! Semantics
//! ---------
//! - **No public setter, deploy-time-only.** The contract deliberately
//!   does not expose an in-place floor update. A new floor value means
//!   deploying a new contract instance (a new contract address); the
//!   floor is fixed for the lifetime of any given deploy and there is
//!   no method to mutate it on a live contract.
//! - All amounts are in **stroops** (`i128`). Negative inputs are
//!   rejected on every code path so that no caller can trick the
//!   comparison by wrapping around.
//! - "At or above the floor" passes; "strictly below the floor" fails.
//!   `0` is a valid floor and accepts every non-negative amount.
//!
//! Composition
//! -----------
//! Other contracts can call [`MinAmount::check`] to gate an inflow and
//! [`MinAmount::require`] to fail fast with a clear panic message.
//! Both are pure read functions against the same instance storage key
//! and have no authorization requirements of their own.
//!
//! Scope guard
//! -----------
//! This crate owns only the files inside `contracts/min_amount/`. It
//! does not import into the Next.js or Express MVP demos in this PR
//! and does not duplicate admin / init-once logic from
//! `contracts/init_once`.

use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol};

/// Storage key for the persisted floor value.
///
/// `FLOOR` is 5 bytes long, well under the 32-byte small-symbol limit,
/// so a `symbol_short!` constant is the cheapest and most
/// serialisation-stable encoding available in Soroban.
const FLOOR: Symbol = symbol_short!("FLOOR");

/// Soroban contract entry point for the min-amount floor check.
#[contract]
pub struct MinAmount;

#[contractimpl]
impl MinAmount {
    /// Deploy the contract with the configured floor.
    ///
    /// * `floor` — the minimum acceptable payment amount, in stroops
    ///   (`i128`). Must be non-negative; negative values panic so that
    ///   a misconfigured deploy cannot silently disable the floor.
    pub fn __constructor(env: Env, floor: i128) {
        if floor < 0 {
            panic!("floor must be non-negative");
        }
        env.storage().instance().set(&FLOOR, &floor);
    }

    /// Return the floor stored at deploy time, in stroops.
    ///
    /// Defaults to `0` only in the (currently impossible) case that the
    /// constructor never ran; the constructor is invoked exactly once
    /// per deployment and always writes a value, so callers should
    /// treat any `0` reply as "floor accidentally unset".
    pub fn floor(env: Env) -> i128 {
        floor_of(&env)
    }

    /// Check whether `payment_amount` is at or above the floor.
    ///
    /// Returns `true` when the amount meets the floor and `false`
    /// otherwise. Negative `payment_amount` values always return
    /// `false` so callers do not need a separate sign guard.
    pub fn check(env: Env, payment_amount: i128) -> bool {
        payment_amount >= floor_of(&env)
    }

    /// Reject any `payment_amount` that is below the configured floor.
    ///
    /// Panics with `"payment below configured minimum floor"` whenever
    /// [`MinAmount::check`] would return `false`. Use this in contract
    /// methods that should fail fast on underpayment so the host
    /// surfaces a clear error rather than letting an underpayment
    /// flow further into business logic.
    pub fn require(env: Env, payment_amount: i128) {
        if payment_amount < floor_of(&env) {
            panic!("payment below configured minimum floor");
        }
    }
}

/// Read the configured floor from instance storage, defaulting to `0`
/// if the slot is somehow empty.
///
/// Centralising the read keeps [`MinAmount::check`] and
/// [`MinAmount::require`] on the same storage path, so a future change
/// to the encoding only needs to be made here.
fn floor_of(env: &Env) -> i128 {
    env.storage().instance().get(&FLOOR).unwrap_or(0)
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::Env;

    // 10 XLM, written in stroops so the unit boundary is visible to
    // every test that references it.
    const TEN_XLM_STROOPS: i128 = 1_000_000_000;

    #[test]
    fn test_payment_below_floor_returns_false() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(!client.check(&(TEN_XLM_STROOPS - 1)));
    }

    #[test]
    fn test_payment_equal_to_floor_returns_true() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(client.check(&TEN_XLM_STROOPS));
    }

    #[test]
    fn test_payment_above_floor_returns_true() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(client.check(&(TEN_XLM_STROOPS + 1)));
        assert!(client.check(&(TEN_XLM_STROOPS * 2)));
    }

    #[test]
    fn test_zero_floor_accepts_any_non_negative() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&0);
        assert!(client.check(&0));
        assert!(client.check(&1));
    }

    #[test]
    fn test_negative_payment_rejected_by_check() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        assert!(!client.check(&-1));
        assert!(!client.check(&i128::MIN));
    }

    #[test]
    #[should_panic(expected = "floor must be non-negative")]
    fn test_negative_floor_panics_on_construction() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&-1);
    }

    #[test]
    fn test_floor_returns_stored_value() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        let floor: i128 = 500_000_000;
        client.__constructor(&floor);
        assert_eq!(client.floor(), floor);
    }

    // ----- `require` (panic-on-below-floor) tests ------------------

    #[test]
    fn require_succeeds_at_floor() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        // Does not panic — the floor itself is acceptable.
        client.require(&TEN_XLM_STROOPS);
    }

    #[test]
    fn require_succeeds_above_floor() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        client.require(&(TEN_XLM_STROOPS + 1));
        client.require(&(TEN_XLM_STROOPS * 100));
    }

    #[test]
    #[should_panic(expected = "payment below configured minimum floor")]
    fn require_panics_below_floor() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        client.require(&(TEN_XLM_STROOPS - 1));
    }

    #[test]
    #[should_panic(expected = "payment below configured minimum floor")]
    fn require_panics_on_negative_payment() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&TEN_XLM_STROOPS);
        client.require(&-1);
    }

    #[test]
    fn require_succeeds_with_zero_floor() {
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        client.__constructor(&0);
        // Zero floor accepts every non-negative amount, including
        // zero itself, so a lax deployment cannot accidentally reject
        // every payment.
        client.require(&0);
        client.require(&1);
    }

    // ----- boundary regression tests ---------------------------------

    #[test]
    fn off_by_one_boundary_with_irrational_floor() {
        // Use a floor that is not a round multiple of any natural
        // unit so an accidental `>` (strict-greater) instead of `>=`
        // refactor would flip at least one of these cases.
        let env = Env::default();
        let contract_id = env.register_contract(None, MinAmount);
        let client = MinAmountClient::new(&env, &contract_id);

        let floor: i128 = 7;
        client.__constructor(&floor);

        assert!(!client.check(&6));
        assert!(client.check(&7));
        assert!(client.check(&8));
    }
}
