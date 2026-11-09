use super::setup;
use soroban_sdk::symbol_short;

#[test]
fn unknown_invoices_always_report_is_draft_true() {
    let (_env, client, _seller) = setup();
    assert!(client.is_draft(&symbol_short!("UNSEEN")));
    assert_eq!(client.published_by(&symbol_short!("UNSEEN")), None);
}
