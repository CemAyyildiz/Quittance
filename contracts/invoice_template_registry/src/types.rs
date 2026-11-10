use soroban_sdk::{contracterror, contracttype, Address, Symbol};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Template {
    pub seller: Address,
    pub template_id: Symbol,
    pub amount: i128,
    pub memo: Symbol,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Template(Address, Symbol),
}

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum TemplateError {
    InvalidAmount = 1,
    TemplateAlreadyExists = 2,
    TemplateNotFound = 3,
}
