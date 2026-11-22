use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    EvidenceHash(Symbol),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyCommitted = 1,
}