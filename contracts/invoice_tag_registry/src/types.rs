use soroban_sdk::{contracttype, Symbol};

/// At most four tags can be attached to one invoice.
pub const MAX_TAGS: u32 = 4;

#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    Tags(Symbol),
}
