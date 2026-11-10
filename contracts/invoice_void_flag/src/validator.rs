use crate::types::VoidFlagError;
use soroban_sdk::Address;

pub fn validate_can_void(
    is_already_void: bool,
    is_paid: bool,
    registered_seller: Option<&Address>,
    caller: &Address,
) -> Result<(), VoidFlagError> {
    if is_already_void {
        return Err(VoidFlagError::AlreadyVoid);
    }
    if is_paid {
        return Err(VoidFlagError::AlreadyPaid);
    }
    if let Some(owner) = registered_seller {
        if owner != caller {
            return Err(VoidFlagError::UnauthorizedSeller);
        }
    }
    Ok(())
}
