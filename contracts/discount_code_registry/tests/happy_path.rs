//! Happy path: an admin registers a code and a caller redeems it.

use discount_code_registry::{CodeSnapshot, DiscountRegistry};

const ADMIN: &str = "GADMINACCOUNT";

fn registry() -> DiscountRegistry {
    DiscountRegistry::new(ADMIN).expect("admin")
}

#[test]
fn admin_registers_and_redeems() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "SAVE10", 500, 3)
        .expect("register");

    assert_eq!(registry.admin(), ADMIN);
    assert_eq!(
        registry.get("SAVE10").expect("stored"),
        CodeSnapshot {
            expires_at: 500,
            max_uses: 3,
            uses: 0,
        }
    );
    assert!(registry.redeem("SAVE10", 400).expect("redeem"));
    assert_eq!(registry.get("SAVE10").expect("stored").uses, 1);
}

#[test]
fn redeem_at_exact_expiry_succeeds() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "WELCOME", 80, 1)
        .expect("register");
    assert!(registry.redeem("WELCOME", 80).expect("on deadline"));
    assert_eq!(registry.get("WELCOME").expect("stored").uses, 1);
}

#[test]
fn two_codes_redeem_independently() {
    let mut registry = registry();
    registry
        .register_code(ADMIN, "SAVE10", 1_000, 2)
        .expect("first");
    registry
        .register_code(ADMIN, "SAVE20", 1_000, 2)
        .expect("second");

    assert!(registry.redeem("SAVE10", 10).expect("redeem first"));
    assert_eq!(registry.get("SAVE10").expect("first row").uses, 1);
    assert_eq!(registry.get("SAVE20").expect("second row").uses, 0);
}
