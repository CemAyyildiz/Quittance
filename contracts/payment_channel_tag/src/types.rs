use soroban_sdk::{contracterror, contracttype, Symbol};

/// The channel a recorded payment came through.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Channel {
    Web,
    App,
    Api,
}

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Channel(Symbol),
}

/// Errors returned when a payment cannot be tagged.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// A payment can be tagged exactly once.
    AlreadyTagged = 1,
}
