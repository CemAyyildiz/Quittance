//! Type definitions for `invoice-expiry-reminder-flag`.

use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Reminded(Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyReminded = 1,
    InvalidInvoiceId = 2,
}
