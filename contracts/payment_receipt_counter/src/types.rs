use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    PayerCount(Address),
    TotalPayments,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum CounterError {
    /// Counter reached overflow boundary.
    Overflow = 1,
}
