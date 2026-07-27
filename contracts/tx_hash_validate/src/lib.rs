#![no_std]

//! `quittance-tx-hash-validate` — stateless helper that validates
//! Stellar transaction hashes in their **64-character hex** form.
//!
//! Purpose
//! -------
//! Off-chain code asks the same shape of question hundreds of times:
//! "is this a plausible Stellar transaction hash I can pass to a
//! Stellar explorer, Horizon endpoint, or a Soroban receipt helper?".
//! The answer is a pure format check — every Stellar transaction hash
//! is the 64-character hex encoding of a 32-byte SHA-256 digest, so the
//! rules are strict and side-effect free.
//!
//! Off-chain callers (the back-end, a CLI tool, a future Soroban
//! contract) all benefit from one tested, allocation-free
//! implementation rather than reimplementing the same byte loop each
//! place. This crate plays that role.
//!
//! Scope guard
//! -----------
//! This crate **only** checks string format. It does **not**:
//! - Resolve the hash against Horizon or any other Stellar endpoint.
//! - Verify the hash actually exists on the Stellar ledger.
//! - Decode the hex into the underlying 32 raw bytes (callers that
//!   want the bytes should hex-decode themselves after this check).
//! - Touch the Next.js frontend, Express MVP backend, or any other
//!   Quittance crate in this PR.
//!
//! Composition
//! -----------
//! The crate depends on the standard library only via `core` (it is
//! `#![no_std]`). It does not pull in `soroban-sdk`. Any Soroban
//! contract (or any other Rust consumer) can link it directly and
//! call [`is_valid_tx_hash`] from its own code.

/// The exact hex-string length of a Stellar transaction hash.
///
/// A Stellar transaction hash is the hex encoding of a 32-byte
/// SHA-256 digest, so it is **exactly 64 ASCII characters** long.
/// Inputs of any other length are rejected before any per-byte
/// check, both to fail fast and to lock the constant that downstream
/// callers might want to assert.
pub const TX_HASH_HEX_LEN: usize = 64;

/// Return `true` if `hash` is a valid 64-character ASCII hex string.
///
/// "Valid" means:
/// 1. exactly [`TX_HASH_HEX_LEN`] characters, **and**
/// 2. every byte is an ASCII hex digit (`0-9`, `a-f`, `A-F`).
///
/// The check is **case-insensitive**: both `deadbeef...` and
/// `DEADBEEF...` are accepted. The 32-byte digest the hex string
/// represents is bit-identical regardless of display case, so
/// strict-lowercase is unnecessarily strict and rejects legitimate
/// hashes produced by tools that uppercase for legibility.
///
/// A leading `0x`, surrounding whitespace, or any character outside
/// the ASCII hex range causes the input to be rejected. The function
/// does **not** split or strip; if your upstream code attaches a
/// `0x` prefix, slice it off before calling this validator.
///
/// **Format check only.** A `true` return does **not** prove the hash
/// exists on the Stellar ledger. Callers that need on-ledger proof
/// must resolve the hash against Horizon or a Soroban host function.
pub fn is_valid_tx_hash(hash: &str) -> bool {
    if hash.len() != TX_HASH_HEX_LEN {
        return false;
    }
    hash.as_bytes().iter().all(|b| b.is_ascii_hexdigit())
}

#[cfg(test)]
mod tests {
    use super::{is_valid_tx_hash, TX_HASH_HEX_LEN};

    /// Build a lowercase hex string with `prefix` (length 0..=3) plus
    /// 64 hex bytes chosen to be a plausible Stellar-shape string.
    /// We don't vendor a real test hash to keep the test file
    /// deterministic and obviously not sensitive, but the pattern
    /// matches what Horizon returns.
    fn plausible_lowercase_hash() -> String {
        // 64 hex chars of `"a..b..c..d..e..f..0..1..2"` cycle.
        const CHARS: &[u8; 16] = b"0123456789abcdef";
        let mut s = String::with_capacity(TX_HASH_HEX_LEN);
        for i in 0..TX_HASH_HEX_LEN {
            s.push(CHARS[i % CHARS.len()] as char);
        }
        s
    }

    // ----- positive cases (valid 64-hex strings) --------------------

    #[test]
    fn accepts_all_lowercase_hex() {
        assert!(is_valid_tx_hash(&plausible_lowercase_hash()));
    }

    #[test]
    fn accepts_all_uppercase_hex() {
        // Same bytes as the lowercase helper, uppercased.
        let mut s = plausible_lowercase_hash();
        s.make_ascii_uppercase();
        assert!(is_valid_tx_hash(&s));
    }

    #[test]
    fn accepts_mixed_case_hex() {
        // Alternating case across the 64-byte string.
        let mut s = plausible_lowercase_hash();
        let bytes = unsafe { s.as_bytes_mut() };
        for (i, b) in bytes.iter_mut().enumerate() {
            if i % 2 == 0 {
                *b = b.to_ascii_uppercase();
            }
        }
        assert!(is_valid_tx_hash(&s));
    }

    #[test]
    fn accepts_zeros_boundary() {
        let s: String = std::iter::repeat('0').take(TX_HASH_HEX_LEN).collect();
        assert_eq!(s.len(), TX_HASH_HEX_LEN);
        assert!(is_valid_tx_hash(&s));
    }

    #[test]
    fn accepts_lowercase_f_boundary() {
        let s: String = std::iter::repeat('f').take(TX_HASH_HEX_LEN).collect();
        assert!(is_valid_tx_hash(&s));
    }

    #[test]
    fn accepts_uppercase_f_boundary() {
        let s: String = std::iter::repeat('F').take(TX_HASH_HEX_LEN).collect();
        assert!(is_valid_tx_hash(&s));
    }

    // ----- negative cases (length) ---------------------------------

    #[test]
    fn rejects_empty_string() {
        assert!(!is_valid_tx_hash(""));
    }

    #[test]
    fn rejects_one_byte_short() {
        let mut s = plausible_lowercase_hash();
        s.pop();
        assert_eq!(s.len(), TX_HASH_HEX_LEN - 1);
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_one_byte_long() {
        let mut s = plausible_lowercase_hash();
        s.push('0');
        assert_eq!(s.len(), TX_HASH_HEX_LEN + 1);
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_zero_one_byte_short() {
        let s: String = std::iter::repeat('0').take(TX_HASH_HEX_LEN - 1).collect();
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_f_one_byte_short() {
        let s: String = std::iter::repeat('f').take(TX_HASH_HEX_LEN - 1).collect();
        assert!(!is_valid_tx_hash(&s));
    }

    // ----- negative cases (character class) -------------------------

    #[test]
    fn rejects_with_non_hex_letter() {
        // 'g' is the first ASCII letter outside the hex range. Any
        // single occurrence on the string should reject.
        let mut s = plausible_lowercase_hash();
        // Replace the final byte with 'g'; the rest stays valid.
        let last_index = s.len() - 1;
        unsafe {
            let bytes = s.as_bytes_mut();
            bytes[last_index] = b'g';
        }
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_with_zero_x_prefix() {
        // 66 chars total: 64 valid hex plus a leading "0x".
        let mut s = String::from("0x");
        s.push_str(&plausible_lowercase_hash());
        assert_eq!(s.len(), TX_HASH_HEX_LEN + 2);
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_with_zero_x_uppercase_prefix() {
        let mut s = String::from("0X");
        s.push_str(&plausible_lowercase_hash());
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_with_leading_whitespace() {
        let mut s = String::from(" ");
        s.push_str(&plausible_lowercase_hash());
        assert_eq!(s.len(), TX_HASH_HEX_LEN + 1);
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_with_trailing_whitespace() {
        let mut s = plausible_lowercase_hash();
        s.push('\t');
        assert_eq!(s.len(), TX_HASH_HEX_LEN + 1);
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_with_internal_space() {
        // Exact length, but a space in the middle.
        let mut bytes_vec: Vec<u8> = plausible_lowercase_hash().into_bytes();
        bytes_vec[TX_HASH_HEX_LEN / 2] = b' ';
        let s = unsafe { String::from_utf8_unchecked(bytes_vec) };
        assert_eq!(s.len(), TX_HASH_HEX_LEN);
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_with_bang() {
        let mut bytes_vec: Vec<u8> = plausible_lowercase_hash().into_bytes();
        bytes_vec[0] = b'!';
        let s = unsafe { String::from_utf8_unchecked(bytes_vec) };
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_with_unicode_homoglyph() {
        // Cyrillic "а" (U+0430) substitutes for ASCII 'a' in the
        // middle of an otherwise-valid hex string. Even though
        // `is_ascii_hexdigit` would catch it (the byte sequence for
        // U+0430 is multi-byte UTF-8), we lock this explicitly to
        // mirror the asset_allowlist homoglyph test.
        let mut bytes_vec: Vec<u8> = plausible_lowercase_hash().into_bytes();
        // 'а' (U+0430) is two UTF-8 bytes: 0xD0 0xB0. Splice it at
        // index 32 and truncate the right half by the same 1 byte to
        // keep total byte length at TX_HASH_HEX_LEN.
        bytes_vec.truncate(TX_HASH_HEX_LEN - 1);
        bytes_vec.splice(32..32, [0xD0_u8, 0xB0_u8]);
        let s = match std::str::from_utf8(&bytes_vec) {
            Ok(s) => s.to_string(),
            Err(_) => panic!("homoglyph splice produced invalid UTF-8"),
        };
        assert_eq!(s.len(), TX_HASH_HEX_LEN);
        assert!(!is_valid_tx_hash(&s));
    }

    #[test]
    fn rejects_cyrillic_e_substituting_e() {
        // Cyrillic "Е" (U+0415) substituting for ASCII 'E' in an
        // otherwise-uppercase valid hash.
        let mut bytes_vec: Vec<u8> = plausible_lowercase_hash().into_bytes();
        bytes_vec.truncate(TX_HASH_HEX_LEN - 1);
        // 'Е' (U+0415) is two UTF-8 bytes: 0xD0 0xA5.
        bytes_vec.splice(8..8, [0xD0_u8, 0xA5_u8]);
        let s = std::str::from_utf8(&bytes_vec).unwrap().to_string();
        assert_eq!(s.len(), TX_HASH_HEX_LEN);
        assert!(!is_valid_tx_hash(&s));
    }

    // ----- constant sanity -----------------------------------------

    #[test]
    fn hex_len_constant_matches_stellar() {
        // Stellar transaction hashes are 32-byte SHA-256 digests.
        // 32 bytes == 64 hex characters. If a future Stellar change
        // broke this invariant, this assertion would scream loudly.
        assert_eq!(TX_HASH_HEX_LEN, 64);
        assert_eq!(32 * 2, TX_HASH_HEX_LEN);
    }

    // ----- exhaustive truth-table screenshot ------------------------

    #[test]
    fn exhaustive_truth_table() {
        // A single screenshot of the validator over a representative
        // matrix of inputs. Mirrors `asset_allowlist::is_allowed_
        // asset_code` in providing a one-glance view of behaviour.
        let valid: &[&str] = &[
            "0000000000000000000000000000000000000000000000000000000000000000",
            "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
            "DEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEFDEADBEEF",
        ];
        for s in valid {
            assert!(is_valid_tx_hash(s), "{:?} should be valid", s);
        }

        let invalid: &[&str] = &[
            "",
            "0",
            // one short
            "000000000000000000000000000000000000000000000000000000000000000",
            // one long
            "00000000000000000000000000000000000000000000000000000000000000000",
            // 0x prefix
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            // non-hex char inside (space)
            "00000000000000000000000000000000 00000000000000000000000000000",
            // non-hex letter
            "000000000000000000000000000000000000000000000000000000000000000g",
            // uppercase 'G'
            "G000000000000000000000000000000000000000000000000000000000000000",
            // punctuation
            "00000000000000000000000000000000!000000000000000000000000000000",
            // leading whitespace
            " 000000000000000000000000000000000000000000000000000000000000000",
        ];
        for s in invalid {
            assert!(
                !is_valid_tx_hash(s),
                "{:?} should be rejected",
                s
            );
        }
    }
}
