//! Type definitions for `invoice-draft-flag`.

use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    PublishedBy(Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyPublished = 1,
    InvalidInvoiceId = 2,
}
