//! `payer-bind` — Optional payer binding helper for Quittance.
//!
//! A pure validation function that enforces an **optional** payer
//! binding: if no payer address is provided, the operation proceeds
//! unconditionally; if a payer address *is* provided, it must match the
//! expected/bound payer or the call is rejected.
//!
//! # Motivation
//!
//! Some Quittance invoice flows bind a specific Stellar account as the
//! expected payer of the invoice. Other flows are "open" — anyone can
//! pay. Rather than sprinkling `if let Some(p) = payer { … }` branches
//! through every contract that touches invoice settlement, this crate
//! centralises the decision in one tested function.
//!
//! # Usage
//!
//! ```
//! use payer_bind::{check_payer, PayerError};
//! # use soroban_sdk::{testutils::Address as _, Address, Env};
//! # let env = Env::default();
//! # let bound = Address::generate(&env);
//! # let other = Address::generate(&env);
//!
//! // None → always allowed:
//! assert_eq!(check_payer(None, &bound), Ok(()));
//!
//! // Some(payer) that matches → allowed:
//! assert_eq!(check_payer(Some(&bound), &bound), Ok(()));
//!
//! // Some(payer) that does NOT match → rejected:
//! assert_eq!(check_payer(Some(&other), &bound), Err(PayerError::PayerMismatch));
//! ```
//!
//! # Non-goals
//!
//! - This crate does **not** manage storage or contract state. The
//!   caller is responsible for fetching the bound payer address from
//!   whatever persistent location (contract storage, environment
//!   variable, etc.) is appropriate for their use case.
//! - It does **not** need a Soroban `#[contract]` or instance storage,
//!   and intentionally avoids those to stay a pure, stateless helper.
//! - It does **not** handle the case where *no* bound payer exists
//!   (i.e. an invoice that was never assigned a binding). That scenario
//!   should be surfaced by whatever upstream code reads the binding.

#![no_std]

use soroban_sdk::Address;

/// Errors that may be returned by [`check_payer`].
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PayerError {
    /// The provided payer address does not match the bound payer.
    PayerMismatch = 1,
}

/// Validate an optional payer address against the bound payer.
///
/// # Parameters
///
/// * `provided` — The payer address (`Address`) supplied by the caller,
///   wrapped in `Option`. Pass `None` for an open (unbound) payment.
/// * `bound` — The expected payer address that has been recorded as the
///   binding for the current invoice.
///
/// # Returns
///
/// | Input                        | Result                       |
/// |------------------------------|------------------------------|
/// | `None`                       | `Ok(())` — always allowed.   |
/// | `Some(payer) if payer == bound` | `Ok(())` — match passes.  |
/// | `Some(payer) if payer != bound` | `Err(PayerMismatch)` — rejected. |
///
/// # Example
///
/// ```ignore
/// use payer_bind::check_payer;
///
/// // An open (unbound) invoice — no payer restriction:
/// check_payer(None, &bound)?;
///
/// // A bound invoice — payer must match:
/// check_payer(Some(&caller), &bound)?;
/// ```
pub fn check_payer(provided: Option<&Address>, bound: &Address) -> Result<(), PayerError> {
    match provided {
        None => Ok(()),
        Some(payer) if payer == bound => Ok(()),
        Some(_) => Err(PayerError::PayerMismatch),
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Address, Env};

    /// When no payer is provided (`None`), the operation should always
    /// be allowed — regardless of what the bound address is.
    #[test]
    fn none_provided_is_allowed() {
        let env = Env::default();
        let bound = Address::generate(&env);

        assert_eq!(check_payer(None, &bound), Ok(()));
    }

    /// When a payer is provided and it matches the bound address, the
    /// operation should succeed.
    #[test]
    fn matching_payer_is_allowed() {
        let env = Env::default();
        let bound = Address::generate(&env);

        assert_eq!(check_payer(Some(&bound), &bound), Ok(()));
    }

    /// When a payer is provided but it does **not** match the bound
    /// address, the operation must return `Err(PayerError::PayerMismatch)`.
    #[test]
    fn mismatched_payer_is_rejected() {
        let env = Env::default();
        let bound = Address::generate(&env);
        let other = Address::generate(&env);

        assert_eq!(
            check_payer(Some(&other), &bound),
            Err(PayerError::PayerMismatch)
        );
    }

    /// Additional sanity check: verifying that a bound address that
    /// equals itself always passes.
    #[test]
    fn same_address_passes() {
        let env = Env::default();
        let addr = Address::generate(&env);

        assert_eq!(check_payer(Some(&addr), &addr), Ok(()));
        assert_eq!(check_payer(None, &addr), Ok(()));
    }

    /// Two different generated addresses are never equal, so `other`
    /// should always mismatch against `bound`.
    #[test]
    fn different_addresses_always_mismatch() {
        let env = Env::default();
        let bound = Address::generate(&env);
        let other = Address::generate(&env);

        // These are random addresses, so they should be different.
        assert_ne!(bound, other);
        assert_eq!(
            check_payer(Some(&other), &bound),
            Err(PayerError::PayerMismatch)
        );
        // And the reverse is also a mismatch:
        assert_eq!(
            check_payer(Some(&bound), &other),
            Err(PayerError::PayerMismatch)
        );
    }
}
