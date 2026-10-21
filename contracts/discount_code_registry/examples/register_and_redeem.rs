//! Register one discount code and redeem it once.
//!
//! Run from the repository root:
//! `cargo run --manifest-path contracts/discount_code_registry/Cargo.toml --example register_and_redeem`

use discount_code_registry::DiscountRegistry;

fn main() {
    let mut registry = DiscountRegistry::new("GADMIN").expect("admin address");
    registry
        .register_code("GADMIN", "SAVE10", 1_700_000_000, 2)
        .expect("register SAVE10");
    let redeemed = registry
        .redeem("SAVE10", 1_700_000_000)
        .expect("redeem SAVE10");
    let uses = registry.get("SAVE10").expect("ledger row").uses;
    println!("redeemed={redeemed} uses={uses}");
}
