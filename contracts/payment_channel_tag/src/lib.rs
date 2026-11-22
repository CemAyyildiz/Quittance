//! Write-once payment origination channel tags.
//!
//! Standalone Soroban contract. It is not a workspace member and it is not
//! called by the Quittance invoice flow.

#![no_std]

mod storage;
mod types;

pub use types::{Channel, Error};

use soroban_sdk::{contract, contractimpl, Env, Symbol};
use types::DataKey;

#[cfg(test)]
mod tests;

/// Records the channel each payment came through.
#[contract]
pub struct PaymentChannelTag;

#[contractimpl]
impl PaymentChannelTag {
    /// Tag `payment_id` with its origination `channel`.
    ///
    /// The tag is write-once: the first call stores the channel and later
    /// calls return `Error::AlreadyTagged` without changing the stored value.
    /// `tag_channel` does not check that the payment exists; this contract is
    /// a standalone tag store, not the payment ledger.
    pub fn tag_channel(env: Env, payment_id: Symbol, channel: Channel) -> Result<(), Error> {
        let key = DataKey::Channel(payment_id.clone());
        if env.storage().persistent().has(&key) {
            return Err(Error::AlreadyTagged);
        }

        storage::store(&env, &payment_id, channel);
        Ok(())
    }

    /// Return the stored channel for `payment_id`, or `None` when untagged.
    pub fn channel_of(env: Env, payment_id: Symbol) -> Option<Channel> {
        storage::load(&env, &payment_id)
    }
}
