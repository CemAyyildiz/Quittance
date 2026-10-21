use soroban_sdk::{
    testutils::Address as _,
    Address, Env, Symbol,
};

use crate::{InvoiceVoidReason, InvoiceVoidReasonClient};

pub fn client(env: &Env) -> InvoiceVoidReasonClient<'_> {
    let contract_id = env.register(InvoiceVoidReason, ());
    InvoiceVoidReasonClient::new(env, &contract_id)
}

pub fn issuer(env: &Env) -> Address {
    Address::generate(env)
}

pub fn invoice(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}

mod edge;
mod failure;
mod happy;
mod payment_lock;
