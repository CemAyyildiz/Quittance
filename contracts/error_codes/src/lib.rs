#![no_std]

use soroban_sdk::contracterror;

/// Stable error codes shared across Quittance Soroban contracts.
///
/// Every variant carries a `#[repr(u32)]` integer that is **fixed** for
/// the lifetime of the protocol. Off-chain indexers, dashboards, and
/// client libraries can match on the numeric code without depending on
/// the Rust identifier.
///
/// Code-space convention (non-binding, for human organisation):
///
/// | Range   | Category              |
/// |---------|-----------------------|
/// | 1-99    | General               |
/// | 100-199 | Invoice               |
/// | 200-299 | Payment verification  |
/// | 300-399 | Asset                 |
/// | 400-499 | Amount / scale        |
/// | 500-599 | Binding / permission  |
/// | 600-699 | Initialisation        |
///
/// # Stability
///
/// Assigned codes **must never be reused or renumbered**. If a variant
/// is deprecated, reserve the code by leaving a doc comment so the gap
/// is visible to reviewers.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ErrorCode {
    // ── General (1–99) ──────────────────────────────────────────

    /// An unexpected internal error occurred.
    InternalError = 1,
    /// The caller does not have permission for this operation.
    Unauthorized = 2,
    /// One or more arguments are invalid.
    InvalidArgument = 3,
    /// The requested resource was not found.
    NotFound = 4,
    /// A resource with the given identifier already exists.
    AlreadyExists = 5,

    // ── Invoice (100–199) ───────────────────────────────────────

    /// The invoice id does not match any known invoice.
    InvoiceNotFound = 100,
    /// The invoice has already been paid.
    InvoiceAlreadyPaid = 101,
    /// The invoice settlement window has expired.
    InvoiceExpired = 102,
    /// The invoice was cancelled before settlement.
    InvoiceCancelled = 103,

    // ── Payment verification (200–299) ──────────────────────────

    /// The transferred amount does not match the invoice amount.
    PaymentAmountMismatch = 200,
    /// The payment destination does not match the invoice seller.
    PaymentDestinationMismatch = 201,
    /// The transaction memo does not match the invoice id.
    PaymentMemoMismatch = 202,
    /// The payment asset does not match the invoice asset.
    PaymentAssetMismatch = 203,
    /// The payment has not been confirmed on the ledger yet.
    PaymentNotConfirmed = 204,

    // ── Asset (300–399) ─────────────────────────────────────────

    /// The asset is not in the allowlist and is not accepted.
    AssetNotSupported = 300,
    /// The seller has not established a trustline for this asset.
    AssetNotTrusted = 301,

    // ── Amount / scale (400–499) ────────────────────────────────

    /// The provided amount is zero or negative.
    InvalidAmount = 400,
    /// The amount exceeds the representable range.
    AmountOverflow = 401,
    /// The asset scale for the two operands does not match.
    ScaleMismatch = 402,

    // ── Binding / permission (500–599) ──────────────────────────

    /// The seller address does not match the stored binding.
    SellerMismatch = 500,
    /// The binding contract has not been initialised.
    BindingNotInitialized = 501,

    // ── Initialisation (600–699) ────────────────────────────────

    /// The contract has not been initialised yet.
    NotInitialized = 600,
    /// The contract has already been initialised.
    AlreadyInitialized = 601,
}

impl ErrorCode {
    /// Return a static English message describing the error.
    ///
    /// These messages are intended for developer tooling, logs, and
    /// on-chain metadata consumers. They are **not** user-facing UI
    /// strings and do not undergo i18n.
    pub fn message(&self) -> &'static str {
        match self {
            ErrorCode::InternalError => "An unexpected internal error occurred.",
            ErrorCode::Unauthorized => "The caller does not have permission for this operation.",
            ErrorCode::InvalidArgument => "One or more arguments are invalid.",
            ErrorCode::NotFound => "The requested resource was not found.",
            ErrorCode::AlreadyExists => "A resource with the given identifier already exists.",

            ErrorCode::InvoiceNotFound => "The invoice id does not match any known invoice.",
            ErrorCode::InvoiceAlreadyPaid => "The invoice has already been paid.",
            ErrorCode::InvoiceExpired => "The invoice settlement window has expired.",
            ErrorCode::InvoiceCancelled => "The invoice was cancelled before settlement.",

            ErrorCode::PaymentAmountMismatch => {
                "The transferred amount does not match the invoice amount."
            }
            ErrorCode::PaymentDestinationMismatch => {
                "The payment destination does not match the invoice seller."
            }
            ErrorCode::PaymentMemoMismatch => {
                "The transaction memo does not match the invoice id."
            }
            ErrorCode::PaymentAssetMismatch => {
                "The payment asset does not match the invoice asset."
            }
            ErrorCode::PaymentNotConfirmed => {
                "The payment has not been confirmed on the ledger yet."
            }

            ErrorCode::AssetNotSupported => {
                "The asset is not in the allowlist and is not accepted."
            }
            ErrorCode::AssetNotTrusted => {
                "The seller has not established a trustline for this asset."
            }

            ErrorCode::InvalidAmount => "The provided amount is zero or negative.",
            ErrorCode::AmountOverflow => "The amount exceeds the representable range.",
            ErrorCode::ScaleMismatch => "The asset scale for the two operands does not match.",

            ErrorCode::SellerMismatch => {
                "The seller address does not match the stored binding."
            }
            ErrorCode::BindingNotInitialized => {
                "The binding contract has not been initialised."
            }

            ErrorCode::NotInitialized => "The contract has not been initialised yet.",
            ErrorCode::AlreadyInitialized => "The contract has already been initialised.",
        }
    }
}

#[cfg(test)]
mod tests;
