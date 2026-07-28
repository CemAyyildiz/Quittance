#![cfg(test)]

extern crate alloc;
extern crate std;

use crate::ErrorCode;

/// Collect every variant of `ErrorCode` for exhaustive iteration.
fn all_variants() -> std::vec::Vec<ErrorCode> {
    use ErrorCode::*;
    std::vec![
        // General
        InternalError,
        Unauthorized,
        InvalidArgument,
        NotFound,
        AlreadyExists,
        // Invoice
        InvoiceNotFound,
        InvoiceAlreadyPaid,
        InvoiceExpired,
        InvoiceCancelled,
        // Payment
        PaymentAmountMismatch,
        PaymentDestinationMismatch,
        PaymentMemoMismatch,
        PaymentAssetMismatch,
        PaymentNotConfirmed,
        // Asset
        AssetNotSupported,
        AssetNotTrusted,
        // Amount / scale
        InvalidAmount,
        AmountOverflow,
        ScaleMismatch,
        // Binding / permission
        SellerMismatch,
        BindingNotInitialized,
        // Initialisation
        NotInitialized,
        AlreadyInitialized,
    ]
}

#[test]
fn every_variant_has_a_non_empty_message() {
    for code in all_variants() {
        let msg = code.message();
        assert!(
            !msg.is_empty(),
            "ErrorCode::{:?} returned an empty message",
            code
        );
    }
}

#[test]
fn every_variant_message_ends_with_period() {
    for code in all_variants() {
        let msg = code.message();
        assert!(
            msg.ends_with('.'),
            "ErrorCode::{:?} message does not end with a period: {:?}",
            code,
            msg
        );
    }
}

#[test]
fn every_variant_message_starts_with_uppercase() {
    for code in all_variants() {
        let msg = code.message();
        let first = msg.chars().next().unwrap();
        assert!(
            first.is_uppercase(),
            "ErrorCode::{:?} message does not start with uppercase: {:?}",
            code,
            msg
        );
    }
}

#[test]
fn numeric_codes_are_unique() {
    let mut seen = std::collections::BTreeSet::new();
    for code in all_variants() {
        let n = code.clone() as u32;
        assert!(
            seen.insert(n),
            "duplicate numeric code {} for ErrorCode::{:?}",
            n,
            code
        );
    }
}

#[test]
fn numeric_code_matches_expected_value() {
    use ErrorCode::*;

    // General
    assert_eq!(InternalError as u32, 1);
    assert_eq!(Unauthorized as u32, 2);
    assert_eq!(InvalidArgument as u32, 3);
    assert_eq!(NotFound as u32, 4);
    assert_eq!(AlreadyExists as u32, 5);

    // Invoice
    assert_eq!(InvoiceNotFound as u32, 100);
    assert_eq!(InvoiceAlreadyPaid as u32, 101);
    assert_eq!(InvoiceExpired as u32, 102);
    assert_eq!(InvoiceCancelled as u32, 103);

    // Payment
    assert_eq!(PaymentAmountMismatch as u32, 200);
    assert_eq!(PaymentDestinationMismatch as u32, 201);
    assert_eq!(PaymentMemoMismatch as u32, 202);
    assert_eq!(PaymentAssetMismatch as u32, 203);
    assert_eq!(PaymentNotConfirmed as u32, 204);

    // Asset
    assert_eq!(AssetNotSupported as u32, 300);
    assert_eq!(AssetNotTrusted as u32, 301);

    // Amount / scale
    assert_eq!(InvalidAmount as u32, 400);
    assert_eq!(AmountOverflow as u32, 401);
    assert_eq!(ScaleMismatch as u32, 402);

    // Binding / permission
    assert_eq!(SellerMismatch as u32, 500);
    assert_eq!(BindingNotInitialized as u32, 501);

    // Initialisation
    assert_eq!(NotInitialized as u32, 600);
    assert_eq!(AlreadyInitialized as u32, 601);
}

#[test]
fn message_matches_expected_value() {
    use ErrorCode::*;

    // General
    assert_eq!(InternalError.message(), "An unexpected internal error occurred.");
    assert_eq!(
        Unauthorized.message(),
        "The caller does not have permission for this operation."
    );
    assert_eq!(InvalidArgument.message(), "One or more arguments are invalid.");
    assert_eq!(NotFound.message(), "The requested resource was not found.");
    assert_eq!(
        AlreadyExists.message(),
        "A resource with the given identifier already exists."
    );

    // Invoice
    assert_eq!(
        InvoiceNotFound.message(),
        "The invoice id does not match any known invoice."
    );
    assert_eq!(InvoiceAlreadyPaid.message(), "The invoice has already been paid.");
    assert_eq!(InvoiceExpired.message(), "The invoice settlement window has expired.");
    assert_eq!(InvoiceCancelled.message(), "The invoice was cancelled before settlement.");

    // Payment
    assert_eq!(
        PaymentAmountMismatch.message(),
        "The transferred amount does not match the invoice amount."
    );
    assert_eq!(
        PaymentDestinationMismatch.message(),
        "The payment destination does not match the invoice seller."
    );
    assert_eq!(
        PaymentMemoMismatch.message(),
        "The transaction memo does not match the invoice id."
    );
    assert_eq!(
        PaymentAssetMismatch.message(),
        "The payment asset does not match the invoice asset."
    );
    assert_eq!(
        PaymentNotConfirmed.message(),
        "The payment has not been confirmed on the ledger yet."
    );

    // Asset
    assert_eq!(
        AssetNotSupported.message(),
        "The asset is not in the allowlist and is not accepted."
    );
    assert_eq!(
        AssetNotTrusted.message(),
        "The seller has not established a trustline for this asset."
    );

    // Amount / scale
    assert_eq!(InvalidAmount.message(), "The provided amount is zero or negative.");
    assert_eq!(AmountOverflow.message(), "The amount exceeds the representable range.");
    assert_eq!(ScaleMismatch.message(), "The asset scale for the two operands does not match.");

    // Binding / permission
    assert_eq!(
        SellerMismatch.message(),
        "The seller address does not match the stored binding."
    );
    assert_eq!(
        BindingNotInitialized.message(),
        "The binding contract has not been initialised."
    );

    // Initialisation
    assert_eq!(NotInitialized.message(), "The contract has not been initialised yet.");
    assert_eq!(AlreadyInitialized.message(), "The contract has already been initialised.");
}

#[test]
fn error_code_derives_copy_clone_debug_eq_partial_ord_ord() {
    let a = ErrorCode::NotFound;
    let b = a;
    let _c = b.clone();
    assert_eq!(
        alloc::format!("{:?}", a),
        "NotFound"
    );
    assert_eq!(a, a);
    assert!(a > ErrorCode::InternalError);
}

#[test]
fn from_u32_roundtrip() {
    for code in all_variants() {
        let n = code.clone() as u32;
        let reconstructed: ErrorCode = unsafe { core::mem::transmute(n) };
        assert_eq!(
            code, reconstructed,
            "roundtrip failed for code {}",
            n
        );
    }
}
