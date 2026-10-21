use soroban_sdk::{contracterror, contracttype, Symbol};

/// Invoice statuses recorded by this log.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Status {
    Pending,
    Paid,
    Expired,
    Cancelled,
}

/// One immutable entry in an invoice's status history.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Transition {
    pub from: Status,
    pub to: Status,
    /// Ledger close time, in Unix seconds, recorded by the contract.
    pub at: u64,
}

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Admin,
    History(Symbol),
}

/// Errors returned when a transition cannot be appended.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// A status must change to produce a history entry.
    UnchangedStatus = 1,
    /// The next entry must start at the previous entry's destination.
    DisconnectedTransition = 2,
}
