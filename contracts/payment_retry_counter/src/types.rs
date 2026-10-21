use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Attempts(Symbol),
}

/// Returned when an attempt would exceed the supplied retry cap.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    RetryLimitReached = 1,
}
