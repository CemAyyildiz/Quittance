use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayoutBinding {
    pub seller: Address,
    pub payout_address: Address,
    pub bound_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    CooldownLedgers,
    Binding(Address),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum PayoutBindingError {
    RebindCooldownActive = 1,
    LedgerRegression = 2,
}
