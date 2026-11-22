//! `multi-currency-invoice-tag` — standalone Soroban contract: invoice
//! settlement-currency tag.
//!
//! Tags an invoice with the single asset code it may be settled in, at
//! creation time, and exposes a check so a proposed payment asset can be
//! validated against that tag **before** the transfer happens.
//!
//! The crate is intentionally standalone: it is not a member of the root
//! workspace, performs no cross-contract calls, and is not wired into the
//! Quittance frontend or backend.
//!
//! # What it does
//!
//! [`MultiCurrencyInvoiceTag::tag_invoice`] binds an invoice to one asset
//! code. The tag is single-valued and permanent:
//!
//! | Call | Result | Effect |
//! |------|--------|--------|
//! | First tag for an invoice | `true` | The tag is written. |
//! | Re-tag with the *same* code | `true` | No-op; safe for retries. |
//! | Tag a *different* code | `false` | Rejected; original tag preserved. |
//!
//! [`MultiCurrencyInvoiceTag::matches_tag`] reports whether a proposed
//! payment asset equals the invoice's tag:
//!
//! | Invoice state | Result |
//! |---------------|--------|
//! | Tagged with `asset_code` | `true` |
//! | Tagged with a different code | `false` |
//! | Never tagged | `false` |
//!
//! # Rules
//!
//! 1. **One code per invoice** — an invoice settles in exactly one asset.
//! 2. **The tag is permanent** — a conflicting re-tag returns `false` and
//!    leaves the original tag untouched.
//! 3. **Retries are safe** — re-tagging with the same code returns `true`
//!    and changes nothing.
//! 4. **Untagged invoices match nothing** — `matches_tag` returns `false`
//!    until the invoice has been tagged, so an untagged invoice can never
//!    be settled "by default".
//! 5. **Matching is exact** — symbols are compared by value, so `XLM` and
//!    `xlm` are different asset codes.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `tag_invoice(invoice_id, asset_code)` | `fn(Env, Symbol, Symbol) -> bool` | Tag the invoice; `false` on conflict. |
//! | `matches_tag(invoice_id, asset_code)` | `fn(Env, Symbol, Symbol) -> bool` | Does the proposed asset match the tag? |
//! | `DataKey` | `enum` | Storage key layout (`Tag(invoice_id)`). |
//!
//! # Usage
//!
//! ```rust
//! use multi_currency_invoice_tag::{
//!     MultiCurrencyInvoiceTag, MultiCurrencyInvoiceTagClient,
//! };
//! use soroban_sdk::{symbol_short, Env};
//!
//! let env = Env::default();
//! let contract_id = env.register(MultiCurrencyInvoiceTag, ());
//! let client = MultiCurrencyInvoiceTagClient::new(&env, &contract_id);
//!
//! let invoice = symbol_short!("INV1");
//! let xlm = symbol_short!("XLM");
//! let usdc = symbol_short!("USDC");
//!
//! // Tag at creation time.
//! assert!(client.tag_invoice(&invoice, &xlm));
//!
//! // Validate a proposed payment asset before the transfer.
//! assert!(client.matches_tag(&invoice, &xlm));   // XLM settles it
//! assert!(!client.matches_tag(&invoice, &usdc)); // USDC is rejected
//!
//! // The tag cannot be changed after the fact.
//! assert!(!client.tag_invoice(&invoice, &usdc));
//! assert!(client.matches_tag(&invoice, &xlm));   // original tag intact
//! ```
//!
//! # Running the tests
//!
//! This crate requires the Soroban SDK. Install Rust from
//! <https://rustup.rs> if missing, then:
//!
//! ```bash
//! cargo test --manifest-path contracts/multi_currency_invoice_tag/Cargo.toml
//! cargo clippy --manifest-path contracts/multi_currency_invoice_tag/Cargo.toml --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

mod storage;
mod types;

pub use crate::types::DataKey;

use soroban_sdk::{contract, contractimpl, Env, Symbol};

/// Invoice settlement-currency tag.
#[contract]
pub struct MultiCurrencyInvoiceTag;

#[contractimpl]
impl MultiCurrencyInvoiceTag {
    /// Tag `invoice_id` with the single asset code it may be settled in.
    ///
    /// The first call for an invoice writes the tag and returns `true`.
    /// Re-tagging with the *same* code is a no-op and also returns `true`,
    /// so a retried transaction cannot break the invoice. Tagging an
    /// already tagged invoice with a *different* code returns `false` and
    /// leaves the original tag untouched.
    pub fn tag_invoice(env: Env, invoice_id: Symbol, asset_code: Symbol) -> bool {
        match storage::tag_of(&env, &invoice_id) {
            Some(existing) => existing == asset_code,
            None => {
                storage::set_tag(&env, &invoice_id, &asset_code);
                true
            }
        }
    }

    /// Return whether the proposed `asset_code` matches the asset code
    /// `invoice_id` is tagged with.
    ///
    /// An invoice that has never been tagged returns `false`: without a tag
    /// there is nothing to validate the proposed asset against, so an
    /// untagged invoice can never be settled "by default".
    pub fn matches_tag(env: Env, invoice_id: Symbol, asset_code: Symbol) -> bool {
        matches!(
            storage::tag_of(&env, &invoice_id),
            Some(tagged) if tagged == asset_code
        )
    }
}
