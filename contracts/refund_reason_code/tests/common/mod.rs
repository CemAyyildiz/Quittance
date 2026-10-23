//! Shared test setup for `refund-reason-code`.

use refund_reason_code::{ReasonCode, RefundReasonCode, RefundReasonCodeClient};
use soroban_sdk::{Env, Symbol};

/// The full fixed reason set, in declaration order.
///
/// Not every suite needs the whole set, so an unused copy in one test binary
/// is not a warning.
#[allow(dead_code)]
pub const ALL_REASONS: [ReasonCode; 5] = [
    ReasonCode::CustomerRequest,
    ReasonCode::DuplicateCharge,
    ReasonCode::ServiceNotDelivered,
    ReasonCode::Fraudulent,
    ReasonCode::Other,
];

/// Register the contract and return the environment plus a typed client.
///
/// The contract has no constructor and needs no authorization, so there is
/// nothing else to prepare.
pub fn setup() -> (Env, RefundReasonCodeClient<'static>) {
    let env = Env::default();
    let contract_id = env.register(RefundReasonCode, ());
    let client = RefundReasonCodeClient::new(&env, &contract_id);
    (env, client)
}

/// Build a refund id symbol from a name.
pub fn refund_id(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}
