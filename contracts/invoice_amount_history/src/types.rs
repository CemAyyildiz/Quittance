use soroban_sdk::{contracterror, contracttype, Symbol};

/// One immutable entry in an invoice's amount adjustment log.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AmountChange {
    /// Invoice amount before the adjustment, in stroops.
    pub old_amount: i128,
    /// Invoice amount after the adjustment, in stroops.
    pub new_amount: i128,
    /// Ledger sequence that closed the adjustment.
    pub ledger: u32,
}

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    History(Symbol),
}

/// Errors returned when an adjustment cannot be recorded.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    /// An adjustment must change the invoice amount.
    UnchangedAmount = 1,
    /// Invoice amounts cannot be negative.
    NegativeAmount = 2,
    /// Ledger sequence zero does not exist.
    InvalidLedger = 3,
}
