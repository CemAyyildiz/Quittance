//! Quittance contracts workspace -- example crate.
//!
//! This crate exists so the workspace has at least one build/test
//! target. New on-chain contract crates should be added alongside
//! this one as additional `[workspace] members` in the top-level
//! `contracts/Cargo.toml`.

#![cfg_attr(not(test), no_std)]

#[cfg(test)]
mod tests {
    #[test]
    fn workspace_smoke() {
        assert_eq!(2 + 2, 4);
    }
}
