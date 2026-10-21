use soroban_sdk::{testutils::Address as _, Address, Env};

pub fn address(env: &Env) -> Address {
    Address::generate(env)
}

mod edge;
mod failure;
mod happy;
mod roles;
