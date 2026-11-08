use soroban_sdk::{contracterror, contracttype, Address};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PayerStats {
    pub payer: Address,
    pub successful_payments: u32,
    pub last_payment_ledger: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    PayerCount(Address),
    PayerLastLedger(Address),
    GlobalPaymentCount,
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ReceiptCounterError {
    InvalidBatchSize = 1,
    CounterOverflow = 2,
}
