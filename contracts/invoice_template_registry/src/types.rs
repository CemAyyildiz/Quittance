use soroban_sdk::{contracterror, contracttype, Address, Symbol};

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TemplateError {
    InvalidAmount = 1,
    TemplateNotFound = 2,
    TemplateAlreadyExists = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Template {
    pub amount: i128,
    pub memo: Symbol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Template(Address, Symbol),
}
