use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Cancelled(Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum CancelError {
    /// Window closed because current_ledger exceeds created_at + window.
    WindowClosed = 1,
    /// Invalid ledger progression (current_ledger < created_at).
    InvalidLedger = 2,
    /// Invoice was already cancelled.
    AlreadyCancelled = 3,
}
