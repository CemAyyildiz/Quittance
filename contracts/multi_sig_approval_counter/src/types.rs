use soroban_sdk::{contracterror, contracttype, Address, Symbol};

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Approved(Symbol),
    Count(Symbol),
    HasApproved(Symbol, Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ApprovalError {
    /// Required approvals must be greater than zero.
    ZeroThreshold = 1,
}
