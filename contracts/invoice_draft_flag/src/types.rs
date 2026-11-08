//! Storage keys and error codes for `invoice-draft-flag`.

use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    PublishedSeller(Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DraftFlagError {
    AlreadyPublished = 1,
}
