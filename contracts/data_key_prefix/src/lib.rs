//! `quittance-data-key-prefix`
//!
//! Helpers for building upgrade-safe storage-key prefixes for Soroban
//! contracts that use **instance** or **persistent** storage.
//!
//! # Why prefixing?
//!
//! A Soroban contract's storage namespace (`instance` / `persistent`) is
//! shared across all versions of the contract. If v1 stores a value at key
//! `"balance"` and v2 stores a different value at key `"balance"`, the
//! upgrade silently reads corrupt data at worst, or requires a complex
//! migration at best.
//!
//! By prefixing every key with a **namespace string** (e.g. `"v1:settings"`)
//! that encodes the version and/or module, an upgrade can introduce new
//! namespaced keys while the old keys remain untouched — old data is
//! structurally unreachable by new code unless the migration explicitly
//! reads and re-writes it under the new prefix.
//!
//! # Usage
//!
//! ```ignore
//! use quittance_data_key_prefix::prefixed;
//!
//! // Instance-level key for the admin address in v1 of the contract.
//! let admin_key: Vec<u8> = prefixed("v1:admin");
//! env.storage().instance().set(&admin_key, &admin_addr);
//!
//! // Persistent key for user balances.
//! let balance_key: Vec<u8> = prefixed("v1:balance");
//! env.storage().persistent().set(&balance_key, &balance);
//! ```
//!
//! # Collision model
//!
//! A prefix **collision** happens when two logically distinct contract
//! concepts produce the same hashed or raw key bytes. Since this crate
//! uses the raw namespace string itself as the key (no hashing), collisions
//! can only occur if two namespaces are byte-for-byte identical — which is
//! a naming bug, not a systematic risk.
//!
//! The tests below verify that semantically distinct prefixes differ in at
//! least one byte, and that the helper rejects empty namespaces.

#![deny(unsafe_code)]
#![deny(unused_must_use)]

/// Build a storage key by prefixing `namespace` with a fixed marker byte
/// (`0x00`) reserved for future upgrade signalling.
///
/// The returned `Vec<u8>` is suitable as a key in both
/// `env.storage().instance().set(...)` and
/// `env.storage().persistent().set(...)`.
///
/// # Empty namespace
///
/// Returns `None` when `namespace` is empty — contracts must choose a
/// non-empty prefix for every key they store.
///
/// # Examples
///
/// ```
/// use quittance_data_key_prefix::prefixed;
///
/// let key = prefixed("v1:admin").expect("non-empty prefix");
/// assert!(!key.is_empty());
/// assert_eq!(key[0], 0x00);
/// ```
pub fn prefixed(namespace: &str) -> Option<Vec<u8>> {
    if namespace.is_empty() {
        return None;
    }

    let mut key = Vec::with_capacity(1 + namespace.len());
    key.push(0x00); // reserved upgrade marker
    key.extend_from_slice(namespace.as_bytes());
    Some(key)
}

/// Build a storage key **without** the leading marker byte.
///
/// Use this when you want a simpler key layout and accept that a future
/// upgrade must be aware of the raw-byte namespace contract.
///
/// # Empty namespace
///
/// Returns `None` when `namespace` is empty.
///
/// # Examples
///
/// ```
/// use quittance_data_key_prefix::raw_prefixed;
///
/// let key = raw_prefixed("v1:settings").expect("non-empty prefix");
/// assert_eq!(key, b"v1:settings");
/// ```
pub fn raw_prefixed(namespace: &str) -> Option<Vec<u8>> {
    if namespace.is_empty() {
        return None;
    }
    Some(namespace.as_bytes().to_vec())
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ----- prefixed -------------------------------------------------------

    #[test]
    fn prefixed_returns_non_empty_key() {
        let key = prefixed("v1:admin").expect("non-empty prefix");
        assert!(!key.is_empty());
    }

    #[test]
    fn prefixed_reserves_leading_marker_byte() {
        let key = prefixed("v1:admin").expect("non-empty prefix");
        assert_eq!(key[0], 0x00);
    }

    #[test]
    fn prefixed_appends_namespace_bytes() {
        let ns = "v1:balance";
        let key = prefixed(ns).expect("non-empty prefix");
        assert_eq!(&key[1..], ns.as_bytes());
    }

    #[test]
    fn prefixed_rejects_empty_namespace() {
        assert!(prefixed("").is_none());
    }

    #[test]
    fn prefixed_single_char_namespace_is_accepted() {
        let key = prefixed("a").expect("single-char is non-empty");
        assert_eq!(key.len(), 2);
        assert_eq!(key[1], b'a');
    }

    // ----- raw_prefixed ---------------------------------------------------

    #[test]
    fn raw_prefixed_returns_namespace_as_bytes() {
        let ns = "v1:settings";
        let key = raw_prefixed(ns).expect("non-empty prefix");
        assert_eq!(key, ns.as_bytes());
    }

    #[test]
    fn raw_prefixed_rejects_empty_namespace() {
        assert!(raw_prefixed("").is_none());
    }

    // ----- collision avoidance --------------------------------------------

    #[test]
    fn distinct_namespaces_produce_distinct_keys() {
        let ns_a = "v1:admin";
        let ns_b = "v1:balance";
        let key_a = prefixed(ns_a).expect("non-empty");
        let key_b = prefixed(ns_b).expect("non-empty");
        assert_ne!(key_a, key_b);
    }

    #[test]
    fn prefixed_and_raw_prefixed_differ_for_same_namespace() {
        let ns = "v1:admin";
        let p = prefixed(ns).expect("non-empty");
        let r = raw_prefixed(ns).expect("non-empty");
        assert_ne!(p, r);
    }

    #[test]
    fn namespace_variants_avoid_collisions() {
        // Semantic variations of "admin" should all be distinct.
        let keys: Vec<Vec<u8>> = ["admin", "Admin", "ADMIN", "v1:admin", "admin:v1"]
            .iter()
            .map(|ns| prefixed(ns).expect("non-empty"))
            .collect();

        for i in 0..keys.len() {
            for j in (i + 1)..keys.len() {
                assert_ne!(keys[i], keys[j], "collision between '{}' and '{}'", i, j);
            }
        }
    }

    #[test]
    fn prefix_includes_full_namespace_in_correct_order() {
        // Verify the full key content, not just length or first byte.
        let ns = "v1:invoice_paid";
        let key = prefixed(ns).expect("non-empty");
        let expected: Vec<u8> = std::iter::once(0x00)
            .chain(ns.as_bytes().iter().copied())
            .collect();
        assert_eq!(key, expected);
    }

    // ----- edge cases -----------------------------------------------------

    #[test]
    fn prefixed_handles_long_namespace() {
        let long_ns = "v1:".to_string() + &"a".repeat(255);
        let key = prefixed(&long_ns).expect("non-empty");
        assert_eq!(key.len(), 1 + long_ns.len());
    }

    #[test]
    fn prefixed_handles_unicode_namespace() {
        // Unicode bytes are preserved without transformation.
        let ns = "v1:café";
        let key = prefixed(ns).expect("non-empty");
        assert_eq!(&key[1..], ns.as_bytes());
    }
}
