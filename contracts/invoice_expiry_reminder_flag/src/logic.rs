//! Validation rules for `invoice-expiry-reminder-flag`.

use soroban_sdk::{symbol_short, Symbol};

use crate::types::Error;

pub fn check_can_remind(already_reminded: bool, invoice_id: &Symbol) -> Result<(), Error> {
    if *invoice_id == symbol_short!("EMPTY") {
        return Err(Error::InvalidInvoiceId);
    }
    if already_reminded {
        return Err(Error::AlreadyReminded);
    }
    Ok(())
}
