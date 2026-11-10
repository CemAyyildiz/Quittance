use soroban_sdk::{contracterror, contracttype, Address, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CancellationRecord {
    pub invoice_id: Symbol,
    pub payer: Address,
    pub cancelled_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Cancelled(Symbol),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum CancellationError {
    WindowExpired = 1,
    AlreadyCancelled = 2,
    InvalidLedgerOrder = 3,
}
