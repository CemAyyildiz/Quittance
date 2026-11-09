//! Validation and construction helpers for `invoice-template-registry`.

use soroban_sdk::{Address, Symbol};

use crate::types::{Error, Template};

/// Validate that `amount` is strictly positive (`> 0`).
pub fn validate_amount(amount: i128) -> Result<(), Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }
    Ok(())
}

/// Construct a validated [`Template`].
pub fn build_template(
    seller: Address,
    template_id: Symbol,
    amount: i128,
    memo: Symbol,
) -> Result<Template, Error> {
    validate_amount(amount)?;
    Ok(Template {
        seller,
        template_id,
        amount,
        memo,
    })
}
