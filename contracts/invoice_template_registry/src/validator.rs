use crate::types::{Template, TemplateError};
use soroban_sdk::{Address, Symbol};

pub fn build_template(
    seller: Address,
    template_id: Symbol,
    amount: i128,
    memo: Symbol,
) -> Result<Template, TemplateError> {
    if amount <= 0 {
        return Err(TemplateError::InvalidAmount);
    }
    Ok(Template {
        seller,
        template_id,
        amount,
        memo,
    })
}
