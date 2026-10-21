//! Types shared by the expiry extender: the audit record and the error
//! returned when an extension is rejected.

/// A record of the one allowed expiry extension for an invoice.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ExtensionRecord {
    /// Identifier of the issuer who performed the extension (a Stellar
    /// public key `G...` in real usage).
    pub issuer: String,
    /// The invoice's expiry value before this extension.
    pub old_expiry: u64,
    /// The invoice's expiry value after this extension.
    pub new_expiry: u64,
}

/// Why an extension attempt was rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ExtendError {
    /// This invoice already has a recorded extension; only one is allowed.
    AlreadyExtended,
    /// `new_expiry` was not strictly greater than `old_expiry`.
    NewExpiryNotAfterOld,
}

impl core::fmt::Display for ExtendError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            ExtendError::AlreadyExtended => {
                write!(f, "invoice expiry has already been extended once")
            }
            ExtendError::NewExpiryNotAfterOld => {
                write!(f, "new_expiry must be strictly greater than old_expiry")
            }
        }
    }
}

impl std::error::Error for ExtendError {}
