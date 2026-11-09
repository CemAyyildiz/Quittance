//! Type definitions for `refund-cap-per-invoice`.

use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    RefundState(Symbol),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RefundRecord {
    pub original_amount: i128,
    pub refunded_total: i128,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    InvalidOriginalAmount = 1,
    InvalidRefundAmount = 2,
    OriginalAmountMismatch = 3,
    RefundCapExceeded = 4,
    ArithmeticOverflow = 5,
}
