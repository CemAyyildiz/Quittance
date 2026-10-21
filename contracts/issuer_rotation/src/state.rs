use soroban_sdk::{contracttype, Address, Env, Symbol};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Issuer(Symbol),
    Rotated(Symbol),
}

pub fn get_issuer(env: &Env, invoice_id: &Symbol) -> Option<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::Issuer(invoice_id.clone()))
}

pub fn set_issuer(env: &Env, invoice_id: &Symbol, issuer: &Address) {
    env.storage()
        .persistent()
        .set(&DataKey::Issuer(invoice_id.clone()), issuer);
}

pub fn is_rotated(env: &Env, invoice_id: &Symbol) -> bool {
    env.storage()
        .persistent()
        .get(&DataKey::Rotated(invoice_id.clone()))
        .unwrap_or(false)
}

pub fn mark_rotated(env: &Env, invoice_id: &Symbol) {
    env.storage()
        .persistent()
        .set(&DataKey::Rotated(invoice_id.clone()), &true);
}
