//! Additional scenario specific to this concept: the audit trail records
//! exactly what changed and by whom, independently per invoice.

use invoice_expiry_extend::ExpiryExtender;

#[test]
fn the_audit_record_captures_issuer_and_both_expiry_values() {
    let mut extender = ExpiryExtender::new();
    extender.extend_expiry("INV-1", "GISSUER", 1_000, 2_500).unwrap();

    let record = extender.history("INV-1").unwrap();
    assert_eq!(record.issuer, "GISSUER");
    assert_eq!(record.old_expiry, 1_000);
    assert_eq!(record.new_expiry, 2_500);
}

#[test]
fn a_fresh_extender_has_no_history_for_an_unknown_invoice() {
    let extender = ExpiryExtender::new();
    assert!(extender.history("INV-404").is_none());
    assert!(!extender.has_been_extended("INV-404"));
}

#[test]
fn multiple_invoices_keep_independent_audit_records() {
    let mut extender = ExpiryExtender::new();
    extender.extend_expiry("INV-1", "GISSUER_A", 1_000, 2_000).unwrap();
    extender.extend_expiry("INV-2", "GISSUER_B", 5_000, 6_000).unwrap();

    let first = extender.history("INV-1").unwrap();
    let second = extender.history("INV-2").unwrap();

    assert_eq!((first.issuer.as_str(), first.old_expiry, first.new_expiry), ("GISSUER_A", 1_000, 2_000));
    assert_eq!((second.issuer.as_str(), second.old_expiry, second.new_expiry), ("GISSUER_B", 5_000, 6_000));
}
