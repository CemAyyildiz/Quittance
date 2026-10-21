//! Usage cap: successful redeems increment the counter until it is exhausted.

use discount_code_registry::{DiscountError, DiscountRegistry};

const ADMIN: &str = "GADMINACCOUNT";

fn registry() -> DiscountRegistry {
    DiscountRegistry::new(ADMIN).expect("admin")
}

fn register(registry: &mut DiscountRegistry, code: &str, expires_at: u32, max_uses: u32) {
    registry
        .register_code(ADMIN, code, expires_at, max_uses)
        .unwrap_or_else(|_| panic!("register {code}"));
}

#[test]
fn cap_of_three_allows_exactly_three_redemptions() {
    let mut registry = registry();
    register(&mut registry, "SAVE10", 1_000, 3);

    for n in 1..=3 {
        assert!(registry.redeem("SAVE10", 10).expect("use"));
        assert_eq!(registry.get("SAVE10").expect("row").uses, n);
    }

    let err = registry.redeem("SAVE10", 10).expect_err("fourth");
    assert_eq!(err, DiscountError::Exhausted);
    assert_eq!(registry.get("SAVE10").expect("row").uses, 3);
}

#[test]
fn cap_of_one_is_exhausted_on_the_second_call() {
    let mut registry = registry();
    register(&mut registry, "ONCE", 50, 1);
    assert!(registry.redeem("ONCE", 1).expect("first"));
    let err = registry.redeem("ONCE", 1).expect_err("second");
    assert_eq!(err, DiscountError::Exhausted);
    assert_eq!(registry.get("ONCE").expect("row").uses, 1);
}

#[test]
fn caps_are_tracked_per_code() {
    let mut registry = registry();
    register(&mut registry, "AAAA", 100, 1);
    register(&mut registry, "BBBB", 100, 2);

    assert!(registry.redeem("AAAA", 1).expect("a"));
    assert_eq!(
        registry.redeem("AAAA", 1).expect_err("a exhausted"),
        DiscountError::Exhausted
    );
    assert!(registry.redeem("BBBB", 1).expect("b1"));
    assert!(registry.redeem("BBBB", 1).expect("b2"));
    assert_eq!(registry.get("AAAA").expect("a").uses, 1);
    assert_eq!(registry.get("BBBB").expect("b").uses, 2);
}

#[test]
fn expired_and_exhausted_code_reports_expired() {
    let mut registry = registry();
    register(&mut registry, "SAVE10", 10, 1);
    assert!(registry.redeem("SAVE10", 10).expect("last use"));

    let err = registry.redeem("SAVE10", 11).expect_err("both");
    assert_eq!(err, DiscountError::Expired);
    assert_eq!(registry.get("SAVE10").expect("row").uses, 1);
}

#[test]
fn repeated_exhausted_redeems_do_not_move_the_counter() {
    let mut registry = registry();
    register(&mut registry, "SAVE10", 80, 2);
    assert!(registry.redeem("SAVE10", 1).expect("1"));
    assert!(registry.redeem("SAVE10", 1).expect("2"));
    assert_eq!(
        registry.redeem("SAVE10", 1).expect_err("3"),
        DiscountError::Exhausted
    );
    assert_eq!(
        registry.redeem("SAVE10", 1).expect_err("4"),
        DiscountError::Exhausted
    );
    assert_eq!(registry.get("SAVE10").expect("row").uses, 2);
}
