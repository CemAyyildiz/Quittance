//! `invoice-category-registry` — standalone Soroban contract: a bounded invoice
//! category registry.
//!
//! An admin defines a small fixed list of category symbols. Sellers tag their
//! invoices with a symbol from that list only; tagging with an unregistered
//! category is rejected and stores nothing.
//!
//! # What it does
//!
//! At deployment the constructor records the admin. Only that admin can add to
//! the category list, the list is capped at [`MAX_CATEGORIES`], and registering
//! a category that is already present is a no-op.
//!
//! `set_invoice_category(invoice_id, category)` tags an invoice. The category
//! must be registered, otherwise [`Error::UnknownCategory`] is returned and the
//! previous tag (if any) stays in place. Tagging is a setter: tagging the same
//! invoice again with another registered category replaces the old tag.
//!
//! `category_of(invoice_id)` reads the tag back, or `None` when the invoice is
//! untagged.
//!
//! # Rules
//!
//! 1. **Admin-curated list** — only the admin recorded at deployment can
//!    register categories, and the caller must authorize the call.
//! 2. **Bounded** — the registry holds at most [`MAX_CATEGORIES`] categories
//!    forever; a new category past the cap fails with [`Error::RegistryFull`].
//! 3. **Registered only** — an invoice can only be tagged with a category that
//!    is in the list.
//! 4. **Retries are safe** — registering an existing category succeeds without
//!    changing anything.
//! 5. **One tag per invoice** — each invoice carries exactly one category,
//!    readable with `category_of`.
//!
//! # Public API
//!
//! | Item | Type | Meaning |
//! |------|------|---------|
//! | `__constructor(admin)` | `fn(Env, Address)` | Record the admin allowed to register categories. |
//! | `register_category(admin, category)` | `fn(Env, Address, Symbol) -> Result<(), Error>` | Add a category to the bounded list. |
//! | `set_invoice_category(invoice_id, category)` | `fn(Env, Symbol, Symbol) -> Result<(), Error>` | Tag an invoice with a registered category. |
//! | `category_of(invoice_id)` | `fn(Env, Symbol) -> Option<Symbol>` | Read the tag stored for an invoice. |
//! | `is_registered(category)` | `fn(Env, Symbol) -> bool` | Whether a category is in the list. |
//! | `categories()` | `fn(Env) -> Vec<Symbol>` | The registered categories, in registration order. |
//! | `Error` | `enum` | Stable error codes with `#[repr(u32)]` discriminants. |
//! | `MAX_CATEGORIES` | `u32` | The registry size limit (`32`). |
//!
//! # Sequence
//!
//! ```text
//! register_category(admin, travel)          -> Ok(())
//! is_registered(travel)                     -> true
//! set_invoice_category(inv_1, travel)       -> Ok(())
//! category_of(inv_1)                        -> Some(travel)
//! set_invoice_category(inv_1, unregistered) -> Err(UnknownCategory)
//! category_of(inv_1)                        -> Some(travel)   // unchanged
//! register_category(admin, travel)          -> Ok(())         // no-op
//! ```
//!
//! # Usage
//!
//! ```rust
//! use invoice_category_registry::{
//!     InvoiceCategoryRegistry, InvoiceCategoryRegistryClient,
//! };
//! use soroban_sdk::{testutils::Address as _, symbol_short, Address, Env};
//!
//! let env = Env::default();
//! env.mock_all_auths();
//! let admin = Address::generate(&env);
//! let contract_id = env.register(InvoiceCategoryRegistry, (admin.clone(),));
//! let client = InvoiceCategoryRegistryClient::new(&env, &contract_id);
//!
//! let travel = symbol_short!("travel");
//! let invoice = symbol_short!("INV1");
//!
//! client.register_category(&admin, &travel);
//! client.set_invoice_category(&invoice, &travel);
//!
//! assert!(client.is_registered(&travel));
//! assert_eq!(client.category_of(&invoice), Some(travel));
//! assert!(client
//!     .try_set_invoice_category(&invoice, &symbol_short!("music"))
//!     .is_err());
//! ```
//!
//! # Scope
//!
//! This is a self-contained learning/utility contract in the same family as
//! `contracts/quittance_receipt_hash`, `contracts/destination_guard`, and
//! `contracts/auth_one_address`. It is not a workspace member, it makes no
//! cross-contract calls, and it is not wired into the Quittance frontend,
//! backend, or invoice flow.
//!
//! # Running the tests
//!
//! ```bash
//! cargo test --manifest-path contracts/invoice_category_registry/Cargo.toml
//! cargo clippy --manifest-path contracts/invoice_category_registry/Cargo.toml --all-targets -- -D warnings
//! ```
//!
//! # License
//!
//! MIT — see `LICENSE` at the repository root.

#![no_std]
#![deny(unsafe_code)]

mod registry;
mod storage;
mod types;

pub use crate::types::{Error, MAX_CATEGORIES};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

/// Bounded invoice category registry.
#[contract]
pub struct InvoiceCategoryRegistry;

#[contractimpl]
impl InvoiceCategoryRegistry {
    /// Record `admin` as the only address allowed to register categories.
    ///
    /// The registry starts empty: every category must be registered explicitly.
    pub fn __constructor(env: Env, admin: Address) {
        registry::set_admin(&env, &admin);
        env.storage()
            .instance()
            .extend_ttl(registry::INSTANCE_THRESHOLD, registry::INSTANCE_BUMP);
    }

    /// Register `category` in the bounded category list.
    ///
    /// `admin` must be the address recorded at deployment and must authorize
    /// the call. Registering a category that is already listed succeeds without
    /// changing anything, so a retried transaction cannot break the registry.
    ///
    /// Returns [`Error::NotAdmin`] when the caller is not the admin, and
    /// [`Error::RegistryFull`] when the list already holds [`MAX_CATEGORIES`]
    /// categories.
    pub fn register_category(env: Env, admin: Address, category: Symbol) -> Result<(), Error> {
        registry::register(&env, &admin, category)
    }

    /// Tag `invoice_id` with `category`.
    ///
    /// The category must already be registered; otherwise the call fails with
    /// [`Error::UnknownCategory`] and the invoice keeps its previous tag (or
    /// stays untagged). Tagging an already tagged invoice with another
    /// registered category replaces the old tag.
    pub fn set_invoice_category(
        env: Env,
        invoice_id: Symbol,
        category: Symbol,
    ) -> Result<(), Error> {
        if !registry::is_registered(&env, &category) {
            return Err(Error::UnknownCategory);
        }
        storage::set_tag(&env, &invoice_id, &category);
        Ok(())
    }

    /// Return the category tag recorded for `invoice_id`, or `None` when the
    /// invoice has no tag yet.
    pub fn category_of(env: Env, invoice_id: Symbol) -> Option<Symbol> {
        storage::tag_of(&env, &invoice_id)
    }

    /// Return whether `category` is in the registered list.
    pub fn is_registered(env: Env, category: Symbol) -> bool {
        registry::is_registered(&env, &category)
    }

    /// Return the registered categories, in registration order.
    pub fn categories(env: Env) -> Vec<Symbol> {
        registry::categories(&env)
    }
}
