#![no_std]

//! `event_invoice_created` — Soroban helper crate for the Quittance
//! `invoice_created` event.
//!
//! Background
//! ----------
//! When an invoice is created on-chain, Quittance contracts emit an
//! `invoice_created` signal so that off-chain indexers, dashboards,
//! and notification services can discover new invoices in a uniform
//! way. This crate centralises the topic layout and data shape for
//! that event.
//!
//! Consuming contracts call [`publish`] (or [`topics`] + [`data`])
//! from inside their contract functions; every emitted event then has
//! the same shape across the Quittance Soroban surface.
//!
//! Event shape
//! -----------
//!
//! | Position | Type      | Meaning                                          |
//! |----------|-----------|--------------------------------------------------|
//! | topic[0] | `Symbol`  | Always the small symbol `"invoice_created"`      |
//! | topic[1] | `String`  | The Quittance invoice id (e.g. `"inv-001"`)      |
//! | topic[2] | `Address` | The seller (invoice creator) account             |
//! | topic[3] | `Address` | The payer account                                |
//! | data     | tuple     | `(amount: i128, asset: Address, created_at: u64)`|
//!
//! The topic count (exactly four) and the data tuple field order are
//! **part of the public ABI of this crate**. Changing either is a
//! breaking change and requires a major version bump of this crate.
//!
//! Stability contract
//! ------------------
//! - The event-name symbol is the small ASCII string
//!   `invoice_created` (15 bytes, well within the 32-byte
//!   small-symbol limit).
//! - Topics are emitted in the order `name, invoice_id, seller,
//!   payer`.
//! - Data is emitted as the tuple `(amount, asset, created_at)` —
//!   indexers can decode it back into that exact 3-tuple.
//!
//! Example
//! -------
//!
//! ```ignore
//! use soroban_sdk::{Address, Env, String};
//! use event_invoice_created::publish;
//!
//! fn on_invoice_created(
//!     env: &Env,
//!     invoice_id: String,
//!     seller: Address,
//!     payer: Address,
//!     amount: i128,
//!     asset: Address,
//!     created_at: u64,
//! ) {
//!     publish(env, &invoice_id, &seller, &payer, amount, &asset, created_at);
//! }
//! ```

use soroban_sdk::{Address, Env, IntoVal, String, Symbol, Val, Vec};

/// Canonical event name as an ASCII string.
///
/// Surface as a string for documentation and external-comparison use;
/// inside a contract prefer [`topic`] which returns the typed `Symbol`.
pub const EVENT_NAME: &str = "invoice_created";

/// Build the single-event-name topic (`Symbol("invoice_created")`).
///
/// Returned as the first element of [`topics`] and as topic[0] of every
/// `invoice_created` event emitted through this crate.
pub fn topic(env: &Env) -> Symbol {
    Symbol::new(env, EVENT_NAME)
}

/// Build the canonical four-element topic vector for an
/// `invoice_created` event.
///
/// Element order is fixed:
///
/// 0. `Symbol("invoice_created")`
/// 1. `invoice_id` (as a Soroban `String`)
/// 2. `seller` (invoice creator)
/// 3. `payer` (invoice target)
///
/// Off-chain consumers can subscribe to a specific invoice id, seller,
/// or payer by matching the corresponding topic position.
pub fn topics(
    env: &Env,
    invoice_id: &String,
    seller: &Address,
    payer: &Address,
) -> Vec<Val> {
    Vec::from_array(
        env,
        [
            topic(env).into_val(env),
            invoice_id.clone().into_val(env),
            seller.clone().into_val(env),
            payer.clone().into_val(env),
        ],
    )
}

/// Build the canonical data payload for an `invoice_created` event as
/// a single `Val`.
///
/// The `Val` encodes the tuple `(amount, asset, created_at)`.
/// Consumers can call `try_into_val::<(i128, Address, u64)>()` on the
/// captured `data` field to recover the original tuple.
///
/// `created_at` is the **host-ledger timestamp in seconds**, the
/// standard Soroban convention. Callers should pass
/// `env.ledger().timestamp()` rather than computing a wall-clock unix
/// time themselves, so the value is consistent with the rest of the
/// on-chain timeline.
pub fn data(env: &Env, amount: i128, asset: &Address, created_at: u64) -> Val {
    (amount, asset.clone(), created_at).into_val(env)
}

/// Build the topics and publish the `invoice_created` event in one
/// call.
///
/// This is the convenience entry point; it is equivalent to calling
/// [`topics`] and [`data`] and then `env.events().publish(...)`.
///
/// # Argument order
///
/// The topic layout is **public ABI**: `name, invoice_id, seller,
/// payer`. Reordering the `seller` and `payer` arguments here
/// silently misroutes off-chain indexers. Callers should pass the
/// **invoice creator** as `seller` and the **invoice funder** as
/// `payer`, matching the dashboard's wallet roles.
pub fn publish(
    env: &Env,
    invoice_id: &String,
    seller: &Address,
    payer: &Address,
    amount: i128,
    asset: &Address,
    created_at: u64,
) {
    let topics = topics(env, invoice_id, seller, payer);
    let payload = data(env, amount, asset, created_at);
    env.events().publish(topics, payload);
}

#[cfg(test)]
mod test;
