use soroban_sdk::{contracterror, contracttype, Address, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Resolver,
    Payment(Symbol),
}

#[contracttype]
#[derive(Clone)]
pub struct Payment {
    pub payer: Address,
    pub paid_at: u64,
    pub window_secs: u64,
    pub disputed: bool,
    pub resolved: bool,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyRecorded = 1,
    PaymentNotFound = 2,
    WrongPayer = 3,
    FuturePayment = 4,
    InvalidWindow = 5,
    WindowClosed = 6,
    AlreadyDisputed = 7,
    NotDisputed = 8,
    AlreadyResolved = 9,
}
