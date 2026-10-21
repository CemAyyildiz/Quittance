//! Boundaries of code length, charset, expiry, and `max_uses`.

use discount_code_registry::{DiscountError, DiscountRegistry, MAX_CODE_LEN};

const ADMIN: &str = "GADMINACCOUNT";

fn registry() -> DiscountRegistry {
    DiscountRegistry::new(ADMIN).expect("admin")
}

#[test]
fn single_character_code_is_accepted() {
    let mut registry = registry();
    registry.register_code(ADMIN, "A", 1, 1).expect("one char");
    assert!(registry.redeem("A", 1).expect("redeem"));
}

#[test]
fn code_at_max_length_is_accepted() {
    let code = "A".repeat(MAX_CODE_LEN);
    let mut registry = registry();
    registry
        .register_code(ADMIN, &code, 10, 1)
        .expect("32 chars");
    assert!(registry.redeem(&code, 10).expect("redeem"));
}

#[test]
fn code_one_past_max_length_is_rejected() {
    let code = "B".repeat(MAX_CODE_LEN + 1);
    let err = registry()
        .register_code(ADMIN, &code, 10, 1)
        .expect_err("33 chars");
    assert_eq!(err, DiscountError::CodeTooLong);
}

#[test]
fn charset_edges_are_accepted() {
    let mut registry = registry();
    for code in ["A", "Z", "0", "9", "A0Z9"] {
        registry
            .register_code(ADMIN, code, 5, 1)
            .unwrap_or_else(|_| panic!("charset edge {code}"));
    }
}

#[test]
fn lowercase_and_symbols_are_rejected() {
    let mut registry = registry();
    for code in [
        "save10", "SAVE-10", "SAVE 10", "SAVE_10", "SÄVE10", "@", "a",
    ] {
        let err = registry
            .register_code(ADMIN, code, 5, 1)
            .expect_err("rejected code");
        assert_eq!(err, DiscountError::InvalidCharset);
    }
}

#[test]
fn empty_code_is_rejected_before_max_uses() {
    let err = registry()
        .register_code(ADMIN, "", 5, 0)
        .expect_err("empty");
    assert_eq!(err, DiscountError::EmptyCode);
}

#[test]
fn zero_max_uses_is_rejected() {
    let err = registry()
        .register_code(ADMIN, "SAVE10", 5, 0)
        .expect_err("zero cap");
    assert_eq!(err, DiscountError::InvalidMaxUses);
}

#[test]
fn expiry_zero_is_valid_only_at_now_zero() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "FREE", 0, 2)
        .expect("register");
    assert!(registry.redeem("FREE", 0).expect("now 0"));
    let err = registry.redeem("FREE", 1).expect_err("now 1");
    assert_eq!(err, DiscountError::Expired);
    assert_eq!(registry.get("FREE").expect("row").uses, 1);
}

#[test]
fn max_timestamp_is_still_unexpired() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "FOREVER", u32::MAX, 1)
        .expect("register");
    assert!(registry.redeem("FOREVER", u32::MAX).expect("max"));
}

#[test]
fn overlong_code_with_bad_charset_reports_length() {
    let mut code = "a".repeat(MAX_CODE_LEN + 5);
    code.replace_range(0..1, "A");
    let err = registry()
        .register_code(ADMIN, &code, 1, 1)
        .expect_err("long and lowercase");
    assert_eq!(err, DiscountError::CodeTooLong);
}

#[test]
fn empty_admin_is_rejected() {
    let err = DiscountRegistry::new("").expect_err("empty admin");
    assert_eq!(err, DiscountError::EmptyAdmin);
}
