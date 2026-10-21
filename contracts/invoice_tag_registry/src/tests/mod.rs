use soroban_sdk::{Env, Symbol};

use crate::{InvoiceTagRegistry, InvoiceTagRegistryClient};

pub fn client(env: &Env) -> InvoiceTagRegistryClient<'_> {
    let contract_id = env.register(InvoiceTagRegistry, ());
    InvoiceTagRegistryClient::new(env, &contract_id)
}

pub fn sym(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}

mod edge;
mod failure;
mod happy;
mod isolated;
