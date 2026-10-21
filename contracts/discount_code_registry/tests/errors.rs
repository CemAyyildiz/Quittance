//! Authorization, duplicates, missing codes, and expiry failures.

use discount_code_registry::{CodeSnapshot, DiscountError, DiscountRegistry};

const ADMIN: &str = "GADMINACCOUNT";

fn registry() -> DiscountRegistry {
    DiscountRegistry::new(ADMIN).expect("admin")
}

#[test]
fn non_admin_cannot_register() {
    let err = registry()
        .register_code("GOTHER", "SAVE10", 50, 1)
        .expect_err("non-admin");
    assert_eq!(err, DiscountError::Unauthorized);
}

#[test]
fn non_admin_is_rejected_before_validation_or_lookup() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "SAVE10", 50, 1)
        .expect("seed");

    let invalid = registry
        .register_code("GOTHER", "", 50, 0)
        .expect_err("empty from stranger");
    assert_eq!(invalid, DiscountError::Unauthorized);

    let duplicate = registry
        .register_code("GOTHER", "SAVE10", 1, 9)
        .expect_err("duplicate from stranger");
    assert_eq!(duplicate, DiscountError::Unauthorized);
    assert_eq!(
        registry.get("SAVE10").expect("unchanged"),
        CodeSnapshot {
            expires_at: 50,
            max_uses: 1,
            uses: 0,
        }
    );
}

#[test]
fn admin_case_must_match() {
    let err = registry()
        .register_code("gadminaccount", "SAVE10", 50, 1)
        .expect_err("case");
    assert_eq!(err, DiscountError::Unauthorized);
}

#[test]
fn second_registration_of_same_code_already_exists() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "SAVE10", 50, 1)
        .expect("first");
    let err = registry
        .register_code(ADMIN, "SAVE10", 99, 4)
        .expect_err("second");
    assert_eq!(err, DiscountError::AlreadyExists);
    assert_eq!(registry.get("SAVE10").expect("row").expires_at, 50);
    assert_eq!(registry.get("SAVE10").expect("row").max_uses, 1);
}

#[test]
fn redeem_unknown_code_is_not_found() {
    let mut registry = registry();
    for code in ["SAVE10", "", "save10", "THISCODEISWAYTOOLONGFORTHEREGISTRY"] {
        let err = registry.redeem(code, 1).expect_err("missing");
        assert_eq!(err, DiscountError::NotFound, "{code}");
    }
}

#[test]
fn expired_code_does_not_consume_a_use() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "SAVE10", 10, 3)
        .expect("register");
    let err = registry.redeem("SAVE10", 11).expect_err("past expiry");
    assert_eq!(err, DiscountError::Expired);
    assert_eq!(registry.get("SAVE10").expect("row").uses, 0);
    assert!(registry.redeem("SAVE10", 10).expect("still open"));
}

#[test]
fn missing_get_is_not_found() {
    let err = registry().get("NOPE").expect_err("missing");
    assert_eq!(err, DiscountError::NotFound);
}
