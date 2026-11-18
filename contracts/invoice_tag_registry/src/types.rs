use soroban_sdk::{contracterror, contracttype, Symbol};

pub const MAX_TAGS_PER_INVOICE: u32 = 8;

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TagError {
    TagLimitExceeded = 1,
    DuplicateTag = 2,
    TagNotFound = 3,
    NoTagsFound = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    InvoiceTags(Symbol),
}
