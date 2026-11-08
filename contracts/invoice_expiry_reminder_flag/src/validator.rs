use crate::types::{ReminderFlagError, ReminderRecord};
use soroban_sdk::Symbol;

pub fn build_reminder_record(invoice_id: Symbol, ledger_sequence: u32) -> ReminderRecord {
    ReminderRecord {
        invoice_id,
        reminded_at_ledger: ledger_sequence,
    }
}

pub fn ensure_not_already_reminded(already_reminded: bool) -> Result<(), ReminderFlagError> {
    if already_reminded {
        Err(ReminderFlagError::AlreadyReminded)
    } else {
        Ok(())
    }
}
