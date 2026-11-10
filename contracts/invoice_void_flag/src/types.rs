use soroban_sdk::{contracterror, contracttype, Address, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoidRecord {
    pub invoice_id: Symbol,
    pub seller: Address,
    pub voided_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    InvoiceSeller(Symbol),
    InvoicePaid(Symbol),
    InvoiceVoided(Symbol),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VoidFlagError {
    AlreadyVoid = 1,
    AlreadyPaid = 2,
    UnauthorizedSeller = 3,
}
