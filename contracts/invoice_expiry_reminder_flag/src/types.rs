use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Reminded(Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ReminderError {
    /// Reminder was already recorded for this invoice.
    AlreadyReminded = 1,
}
