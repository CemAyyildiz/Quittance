#![no_std]

pub mod types;
pub mod validator;

use soroban_sdk::{contract, contractimpl, Address, Env};
pub use types::{DataKey, PayoutBinding, PayoutBindingError};
pub use validator::{validate_rebind_allowed, DEFAULT_REBIND_COOLDOWN_LEDGERS};

#[contract]
pub struct SellerPayoutAddressBindingContract;

#[contractimpl]
impl SellerPayoutAddressBindingContract {
    /// Binds `seller` to `payout_address` at `ledger`. Rebinding is allowed only after
    /// the configured cooldown period has elapsed since the previous bind.
    pub fn bind(
        env: Env,
        seller: Address,
        payout_address: Address,
        ledger: u32,
    ) -> Result<PayoutBinding, PayoutBindingError> {
        seller.require_auth();
        let cooldown = Self::cooldown_ledgers(env.clone());
        let key = DataKey::Binding(seller.clone());
        let existing: Option<PayoutBinding> = env.storage().persistent().get(&key);

        validate_rebind_allowed(existing.as_ref(), ledger, cooldown)?;

        let binding = PayoutBinding {
            seller,
            payout_address,
            bound_at_ledger: ledger,
        };
        env.storage().persistent().set(&key, &binding);
        Ok(binding)
    }

    /// Returns the currently bound payout address for `seller`, if any.
    pub fn payout_address_of(env: Env, seller: Address) -> Option<Address> {
        env.storage()
            .persistent()
            .get::<DataKey, PayoutBinding>(&DataKey::Binding(seller))
            .map(|b| b.payout_address)
    }

    /// Returns the full `PayoutBinding` record for `seller`, if bound.
    pub fn binding_of(env: Env, seller: Address) -> Option<PayoutBinding> {
        env.storage().persistent().get(&DataKey::Binding(seller))
    }

    /// Configures the rebind cooldown in ledgers (defaults to 100 ledgers).
    pub fn set_cooldown_ledgers(env: Env, cooldown: u32) {
        env.storage()
            .instance()
            .set(&DataKey::CooldownLedgers, &cooldown);
    }

    /// Returns the active rebind cooldown in ledgers.
    pub fn cooldown_ledgers(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::CooldownLedgers)
            .unwrap_or(DEFAULT_REBIND_COOLDOWN_LEDGERS)
    }
}
