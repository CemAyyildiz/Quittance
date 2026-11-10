#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};
pub use types::{DataKey, VoidFlagError, VoidRecord};
pub use validator::validate_can_void;

#[contract]
pub struct InvoiceVoidFlagContract;

#[contractimpl]
impl InvoiceVoidFlagContract {
    /// Optional registration binding `invoice_id` to `seller` before voiding or payment.
    pub fn register_invoice(env: Env, seller: Address, invoice_id: Symbol) {
        seller.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::InvoiceSeller(invoice_id), &seller);
    }

    /// Marks `invoice_id` as paid so any subsequent void attempt is rejected.
    pub fn mark_paid(
        env: Env,
        invoice_id: Symbol,
    ) -> Result<(), VoidFlagError> {
        if Self::is_void(env.clone(), invoice_id.clone()) {
            return Err(VoidFlagError::AlreadyVoid);
        }
        env.storage()
            .persistent()
            .set(&DataKey::InvoicePaid(invoice_id), &true);
        Ok(())
    }

    /// Voids `invoice_id` on behalf of `seller` exactly once. Rejects if already voided,
    /// already paid, or if registered to a different seller.
    pub fn void_invoice(
        env: Env,
        seller: Address,
        invoice_id: Symbol,
    ) -> Result<VoidRecord, VoidFlagError> {
        seller.require_auth();
        let void_key = DataKey::InvoiceVoided(invoice_id.clone());
        let is_void = env.storage().persistent().has(&void_key);
        let is_paid = env
            .storage()
            .persistent()
            .has(&DataKey::InvoicePaid(invoice_id.clone()));
        let owner: Option<Address> = env
            .storage()
            .persistent()
            .get(&DataKey::InvoiceSeller(invoice_id.clone()));

        validate_can_void(is_void, is_paid, owner.as_ref(), &seller)?;

        let rec = VoidRecord {
            invoice_id,
            seller,
            voided_at_ledger: env.ledger().sequence(),
        };
        env.storage().persistent().set(&void_key, &rec);
        Ok(rec)
    }

    /// Returns `true` if `invoice_id` has been voided.
    pub fn is_void(env: Env, invoice_id: Symbol) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::InvoiceVoided(invoice_id))
    }

    /// Returns the stored `VoidRecord` for `invoice_id`, if voided.
    pub fn void_record(env: Env, invoice_id: Symbol) -> Option<VoidRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::InvoiceVoided(invoice_id))
    }
}
