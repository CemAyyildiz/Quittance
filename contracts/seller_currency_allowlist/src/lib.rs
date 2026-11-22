//! `seller-currency-allowlist` — standalone Soroban contract: per-seller
//! currency allowlist.
//!
//! A per-seller allowlist of accepted asset codes for new invoices: each
//! seller maintains their own list of currencies they accept, and anyone
//! can check whether a given asset code is on that list before creating or
//! paying an invoice.
//!
//! The crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, and is not wired into the
//! Quittance frontend or backend.
//!
//! # What it does
//!
//! [`SellerCurrencyAllowlist::allow_currency`] lets a seller add an asset
//! code to their own list. Only the seller themselves may change their list
//! (`seller.require_auth()`), the call validates the code, and allowing an
//! already allowed code is a safe no-op:
//!
//! | Call | Result | Effect |
//! |------|--------|--------|
//! | Valid, not yet allowed code | `Ok(())` | The code is added. |
//! | Code already on the list | `Ok(())` | No-op; safe for retries. |
//! | Invalid asset code | `Err(InvalidAssetCode)` | Rejected; list unchanged. |
//! | Caller is not the seller | auth error | Rejected; list unchanged. |
//!
//! [`SellerCurrencyAllowlist::is_allowed_currency`] is a read-only check
//! that anyone may call:
//!
//! | Seller state | Result |
//! |--------------|--------|
//! | `code` is on the seller's list | `true` |
//! | `code` is not on the list | `false` |
//! | Seller has never allowed anything | `false` |
//!
//! # Rules
//!
//! 1. **Per seller** — each seller's list is independent; one seller's
//!    allowlist can never satisfy a query about another seller.
//! 2. **Seller-authored** — only the seller address itself may change its
//!    own list.
//! 3. **Valid codes only** — an asset code must be 1–12 ASCII alphanumeric
//!    characters, matching Stellar's asset-code rules.
//! 4. **Idempotent** — allowing an already allowed code succeeds without
//!    duplicating the entry.
//! 5. **Read-only queries** — `is_allowed_currency` performs no
//!    authorization and no validation: unknown sellers and invalid codes
//!    simply return `false`.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `allow_currency(seller, code)` | `fn(Env, Address, Symbol) -> Result<(), AllowlistError>` | Add `code` to the seller's allowlist. |
//! | `is_allowed_currency(seller, code)` | `fn(Env, Address, Symbol) -> bool` | Is `code` on the seller's allowlist? |
//! | `validate_asset_code(code)` | `fn(&str) -> Result<(), AllowlistError>` | Free-function form of the code rules. |
//! | `AllowlistError` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |
//! | `DataKey` | `enum` | Storage key layout (`Allowed(seller)`). |
//!
//! # Usage
//!
//! ```rust
//! use seller_currency_allowlist::{
//!     AllowlistError, SellerCurrencyAllowlist, SellerCurrencyAllowlistClient,
//! };
//! use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env, Symbol};
//!
//! let env = Env::default();
//! env.mock_all_auths();
//! let contract_id = env.register(SellerCurrencyAllowlist, ());
//! let client = SellerCurrencyAllowlistClient::new(&env, &contract_id);
//!
//! let seller = Address::generate(&env);
//! let xlm = symbol_short!("XLM");
//! let usdc = symbol_short!("USDC");
//! let eur = symbol_short!("EUR");
//!
//! // Nothing is allowed until the seller opts in.
//! assert!(!client.is_allowed_currency(&seller, &xlm));
//!
//! // The seller allows the currencies they accept for new invoices.
//! client.allow_currency(&seller, &xlm);
//! client.allow_currency(&seller, &usdc);
//! assert!(client.is_allowed_currency(&seller, &xlm));
//! assert!(client.is_allowed_currency(&seller, &usdc));
//! assert!(!client.is_allowed_currency(&seller, &eur));
//!
//! // Invalid asset codes are rejected with a stable error.
//! assert_eq!(
//!     client.try_allow_currency(&seller, &Symbol::new(&env, "ABCDEFGHIJKLM")),
//!     Err(Ok(AllowlistError::InvalidAssetCode)),
//! );
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cargo test --manifest-path contracts/seller_currency_allowlist/Cargo.toml
//! cargo clippy --manifest-path contracts/seller_currency_allowlist/Cargo.toml --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

extern crate alloc;

mod storage;
mod types;
mod validate;

pub use crate::types::{AllowlistError, DataKey};
pub use crate::validate::{validate_asset_code, MAX_ASSET_CODE_LEN};

use alloc::string::ToString;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

/// Per-seller currency allowlist.
#[contract]
pub struct SellerCurrencyAllowlist;

#[contractimpl]
impl SellerCurrencyAllowlist {
    /// Add the asset code `code` to `seller`'s allowlist.
    ///
    /// Only the seller themselves may change their own list: this entry
    /// point requires `seller`'s authorization. The code is validated
    /// first, so an invalid asset code fails with
    /// [`AllowlistError::InvalidAssetCode`] and leaves the list untouched.
    ///
    /// Allowing an already allowed code returns `Ok(())` and changes
    /// nothing, so a retried transaction cannot duplicate entries.
    pub fn allow_currency(env: Env, seller: Address, code: Symbol) -> Result<(), AllowlistError> {
        seller.require_auth();
        validate_asset_code(&code.to_string())?;
        storage::allow(&env, &seller, &code);
        Ok(())
    }

    /// Return whether `code` is on `seller`'s allowlist.
    ///
    /// This is a read-only query: it performs no authorization and no
    /// validation. A seller who has never allowed anything, or a code that
    /// was never allowed, returns `false`.
    pub fn is_allowed_currency(env: Env, seller: Address, code: Symbol) -> bool {
        storage::is_allowed(&env, &seller, &code)
    }
}
