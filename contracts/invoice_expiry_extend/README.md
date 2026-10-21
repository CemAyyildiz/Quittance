# invoice-expiry-extend

Lets an issuer extend an invoice's expiry exactly once, keeping an audit
trail of the old and new value.

This is a self-contained learning/utility crate in the same family as
`contracts/quittance_receipt_hash` and `contracts/destination_guard`. It
ships and is tested entirely on its own — it is **not** wired into the
frontend, backend, or any other contract in this repo, and it is **not**
a member of the root `contracts/` Cargo workspace.

## What it does

`ExpiryExtender` tracks, per invoice id, whether its expiry has already
been extended. The first `extend_expiry` call for an invoice records an
audit entry (issuer, old expiry, new expiry) and succeeds; any later
call for the same invoice is rejected, as is a call whose `new_expiry`
is not strictly greater than `old_expiry`. A rejected call never
mutates the existing audit record.

`payer`/`issuer` are taken as `&str` rather than the suggested `Address`
type, since this crate has no soroban-sdk dependency (matching the
existing `destination_guard`/`quittance_receipt_hash` convention of
plain, standalone Rust crates under `contracts/`); an `invoice_id`
parameter was added to the suggested signature since "extend this
invoice's expiry" requires identifying which invoice.

## Public API

```rust
pub struct ExpiryExtender { /* .. */ }

pub struct ExtensionRecord {
    pub issuer: String,
    pub old_expiry: u64,
    pub new_expiry: u64,
}

pub enum ExtendError {
    AlreadyExtended,
    NewExpiryNotAfterOld,
}

impl ExpiryExtender {
    pub fn new() -> Self;

    pub fn extend_expiry(
        &mut self,
        invoice_id: &str,
        issuer: &str,
        old_expiry: u64,
        new_expiry: u64,
    ) -> Result<(), ExtendError>;

    pub fn history(&self, invoice_id: &str) -> Option<&ExtensionRecord>;
    pub fn has_been_extended(&self, invoice_id: &str) -> bool;
}
```

```rust
use invoice_expiry_extend::ExpiryExtender;

let mut extender = ExpiryExtender::new();
extender.extend_expiry("INV-1", "GISSUER", 1_000, 2_000).unwrap();

assert!(extender.extend_expiry("INV-1", "GISSUER", 2_000, 3_000).is_err());
```

## Build & test

```sh
cargo test --manifest-path contracts/invoice_expiry_extend/Cargo.toml
cargo clippy --manifest-path contracts/invoice_expiry_extend/Cargo.toml --all-targets -- -D warnings
```
