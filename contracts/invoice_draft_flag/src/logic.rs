//! State-transition validation for `invoice-draft-flag`.

use soroban_sdk::{symbol_short, Symbol};

use crate::types::Error;

pub fn check_publishable(already_published: bool, invoice_id: &Symbol) -> Result<(), Error> {
    if *invoice_id == symbol_short!("EMPTY") {
        return Err(Error::InvalidInvoiceId);
    }
    if already_published {
        return Err(Error::AlreadyPublished);
    }
    Ok(())
}
