#![no_std]

mod types;
mod window;

pub use types::Error;

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol};
use types::{DataKey, Payment};

/// A standalone dispute flag for payments recorded by a trusted resolver.
#[contract]
pub struct DisputeFlag;

#[contractimpl]
impl DisputeFlag {
    /// Set the address allowed to record payments and resolve disputes.
    pub fn __constructor(env: Env, resolver: Address) {
        env.storage().instance().set(&DataKey::Resolver, &resolver);
    }

    /// Record a confirmed payment. The resolver must verify it externally first.
    pub fn record_payment(
        env: Env,
        invoice_id: Symbol,
        payer: Address,
        paid_at: u64,
        window_secs: u64,
    ) -> Result<(), Error> {
        let resolver: Address = env.storage().instance().get(&DataKey::Resolver).unwrap();
        resolver.require_auth();

        let key = DataKey::Payment(invoice_id);
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyRecorded);
        }
        if paid_at > env.ledger().timestamp() {
            return Err(Error::FuturePayment);
        }
        window::deadline(paid_at, window_secs)?;

        env.storage().persistent().set(
            &key,
            &Payment {
                payer,
                paid_at,
                window_secs,
                disputed: false,
                resolved: false,
            },
        );
        Ok(())
    }

    /// Flag a recorded payment through the inclusive dispute deadline.
    pub fn flag_dispute(env: Env, invoice_id: Symbol, payer: Address) -> Result<bool, Error> {
        payer.require_auth();
        let key = DataKey::Payment(invoice_id);
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::PaymentNotFound)?;

        if payer != payment.payer {
            return Err(Error::WrongPayer);
        }
        if payment.resolved {
            return Err(Error::AlreadyResolved);
        }
        if payment.disputed {
            return Err(Error::AlreadyDisputed);
        }
        if !window::is_open(
            payment.paid_at,
            payment.window_secs,
            env.ledger().timestamp(),
        )? {
            return Err(Error::WindowClosed);
        }

        payment.disputed = true;
        env.storage().persistent().set(&key, &payment);
        Ok(true)
    }

    /// Resolve a flagged dispute. Only the resolver can clear the hold.
    pub fn resolve_dispute(env: Env, invoice_id: Symbol) -> Result<bool, Error> {
        let resolver: Address = env.storage().instance().get(&DataKey::Resolver).unwrap();
        resolver.require_auth();
        let key = DataKey::Payment(invoice_id);
        let mut payment: Payment = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::PaymentNotFound)?;

        if payment.resolved {
            return Err(Error::AlreadyResolved);
        }
        if !payment.disputed {
            return Err(Error::NotDisputed);
        }

        payment.resolved = true;
        env.storage().persistent().set(&key, &payment);
        Ok(true)
    }

    /// Return true only for a recorded payment without an unresolved dispute.
    pub fn is_finalizable(env: Env, invoice_id: Symbol) -> bool {
        let key = DataKey::Payment(invoice_id);
        let payment: Option<Payment> = env.storage().persistent().get(&key);
        match payment {
            Some(payment) => !payment.disputed || payment.resolved,
            None => false,
        }
    }
}
