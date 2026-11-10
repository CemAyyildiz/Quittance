use crate::types::BlacklistError;

pub fn check_seller_allowed(is_blacklisted: bool) -> Result<(), BlacklistError> {
    if is_blacklisted {
        Err(BlacklistError::SellerBlacklisted)
    } else {
        Ok(())
    }
}
