//! The one-time expiry extender and its audit trail.

use std::collections::HashMap;

use crate::types::{ExtendError, ExtensionRecord};

/// Tracks, per invoice, whether its expiry has been extended, and keeps
/// an audit record of the old and new value when it has.
#[derive(Debug, Default)]
pub struct ExpiryExtender {
    history: HashMap<String, ExtensionRecord>,
}

impl ExpiryExtender {
    /// Creates an extender with no recorded extensions.
    pub fn new() -> Self {
        Self::default()
    }

    /// Extends `invoice_id`'s expiry from `old_expiry` to `new_expiry` on
    /// behalf of `issuer`, recording the change in the audit trail.
    ///
    /// Fails with [`ExtendError::AlreadyExtended`] if this invoice already
    /// has a recorded extension, and with
    /// [`ExtendError::NewExpiryNotAfterOld`] if `new_expiry` is not
    /// strictly greater than `old_expiry`. Neither failure mutates the
    /// audit trail.
    pub fn extend_expiry(
        &mut self,
        invoice_id: &str,
        issuer: &str,
        old_expiry: u64,
        new_expiry: u64,
    ) -> Result<(), ExtendError> {
        if self.history.contains_key(invoice_id) {
            return Err(ExtendError::AlreadyExtended);
        }
        if new_expiry <= old_expiry {
            return Err(ExtendError::NewExpiryNotAfterOld);
        }

        self.history.insert(
            invoice_id.to_string(),
            ExtensionRecord {
                issuer: issuer.to_string(),
                old_expiry,
                new_expiry,
            },
        );
        Ok(())
    }

    /// Returns the recorded extension for `invoice_id`, if any.
    pub fn history(&self, invoice_id: &str) -> Option<&ExtensionRecord> {
        self.history.get(invoice_id)
    }

    /// Returns `true` when `invoice_id` already has a recorded extension.
    pub fn has_been_extended(&self, invoice_id: &str) -> bool {
        self.history.contains_key(invoice_id)
    }
}
