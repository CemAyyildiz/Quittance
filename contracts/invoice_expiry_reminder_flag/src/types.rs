use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReminderRecord {
    pub invoice_id: Symbol,
    pub reminded_at_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Reminded(Symbol),
    TotalRemindedCount,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ReminderFlagError {
    AlreadyReminded = 1,
    NotReminded = 2,
}
