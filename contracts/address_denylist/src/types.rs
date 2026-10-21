use soroban_sdk::{contracterror, contracttype, Address};

/// Role checked against the denylist. Both roles use the same list.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Role {
    /// Address acting as an invoice issuer.
    Issuer,
    /// Address acting as a payer.
    Payer,
}

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Admin,
    Denied(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum DenyError {
    /// The caller is not the stored admin.
    NotAdmin = 1,
    /// The admin cannot deny their own address.
    SelfDeny = 2,
}
