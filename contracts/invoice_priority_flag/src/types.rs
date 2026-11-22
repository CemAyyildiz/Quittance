use soroban_sdk::{contracterror, contracttype, Symbol};

/// Priority a seller assigns to an invoice when it is created.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Priority {
    Urgent,
    Normal,
    Low,
}

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Priority(Symbol),
}

/// Errors returned when a priority cannot be set.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// An invoice's priority can only be set once.
    AlreadySet = 1,
}
