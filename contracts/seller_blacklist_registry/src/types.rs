use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    Blacklisted(Address),
    BlacklistedCount,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum BlacklistError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    SellerBlacklisted = 3,
}
