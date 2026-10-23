use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

/// Helper to generate a new address for testing.
pub fn address(env: &Env) -> Address {
    Address::generate(env)
}

/// Helper to create a Symbol for invoice IDs.
pub fn invoice_id(env: &Env, id: &str) -> Symbol {
    Symbol::new(env, id)
}

mod happy_path;
mod edge_boundary;
mod failure_cases;
mod invoice_isolation;
mod storage_tests;
