use soroban_sdk::{contracttype, Address};

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Admin,
    Verified(Address),
}
