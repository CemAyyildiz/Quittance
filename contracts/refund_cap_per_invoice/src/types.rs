//! Storage keys and error codes for `refund-cap-per-invoice`.

use soroban_sdk::{contracterror, contracttype, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    RefundedTotal(Symbol),
    OriginalAmount(Symbol),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RefundCapError {
    InvalidOriginalAmount = 1,
    InvalidRefundAmount = 2,
    RefundExceedsOriginalAmount = 3,
    OriginalAmountMismatch = 4,
    ArithmeticOverflow = 5,
}
