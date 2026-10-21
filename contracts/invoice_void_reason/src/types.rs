use soroban_sdk::{contracttype, Address, Symbol};

/// Fixed reasons an issuer can attach when voiding an invoice.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum VoidReason {
    /// The invoice was issued twice.
    Duplicate,
    /// The issuer cancelled the invoice.
    Cancelled,
    /// The invoice was flagged as fraud.
    Fraud,
    /// A reason outside the named cases.
    Other,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoidRecord {
    /// Address that authorized the void.
    pub issuer: Address,
    /// Reason stored with the void.
    pub reason: VoidReason,
}

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Void(Symbol),
}
