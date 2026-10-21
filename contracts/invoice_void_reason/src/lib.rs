//! Invoice void with a reason code.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod types;
mod voiding;

pub use types::{VoidReason, VoidRecord};

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};

#[cfg(test)]
mod tests;

/// Voids an invoice and keeps it from being paid.
#[contract]
pub struct InvoiceVoidReason;

#[contractimpl]
impl InvoiceVoidReason {
    /// Voids `invoice_id` with `reason`.
    ///
    /// `issuer` must authorize the call. The first void returns true and locks
    /// the invoice. A later void returns false and keeps the original reason.
    pub fn void(env: Env, issuer: Address, invoice_id: Symbol, reason: VoidReason) -> bool {
        issuer.require_auth();
        voiding::void(
            &env,
            &invoice_id,
            VoidRecord {
                issuer,
                reason,
            },
        )
    }

    /// Returns true after a successful void.
    pub fn is_voided(env: Env, invoice_id: Symbol) -> bool {
        voiding::record_of(&env, &invoice_id).is_some()
    }

    /// Returns the stored void, if any.
    pub fn reason_of(env: Env, invoice_id: Symbol) -> Option<VoidRecord> {
        voiding::record_of(&env, &invoice_id)
    }

    /// Returns false once the invoice has been voided.
    pub fn can_pay(env: Env, invoice_id: Symbol) -> bool {
        !Self::is_voided(env, invoice_id)
    }
}
