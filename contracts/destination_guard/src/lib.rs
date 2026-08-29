//! `destination-guard` — Interface-level Stellar destination address
//! guards.
//!
//! Before the Quittance codebase asks a deeper parser (such as
//! `stellar-strkey` or a contract-side StrKey verifier) to handle a
//! destination string, we want to reject obviously-invalid inputs as
//! cheaply as possible. This crate provides those first-line guards.
//!
//! # Scope (intentionally bounded)
//!
//! - **Empty** input is rejected — `""` cannot be a destination.
//! - **Wrong length** is rejected — Stellar public-key StrKeys are
//!   exactly 56 base32 characters (32-byte ed25519 public key + 2-byte
//!   CRC16-XMODEM checksum, encoded with the Stellar base32 alphabet).
//! - **Wrong prefix** is rejected — Stellar account-id StrKeys start
//!   with `G`. Contract addresses start with `C`. (Other StrKey
//!   families — `M` for muxed accounts, `S` for secret seeds, etc. —
//!   are deliberately out of scope for the "destination" interface.)
//! - **Invalid base32 character** is rejected — the Stellar alphabet
//!   is `A-Z` plus `2-7`.
//!
//! # Non-goals
//!
//! - Re-implementing StrKey crypto (CRC16 checksum, ed25519 curve
//!   validation, muxed-account decoding): use the off-the-shelf
//!   parser after [`check_destination`] has cleared the input.
//! - Validating that the destination has a trustline, a sequence
//!   number, or any on-chain state: this crate is structural only.
//!
//! # When you would use this
//!
//! - In a Soroban contract's `pay` entry point before passing the
//!   destination to `stellar_strkey::Strkey::from_string(...)`.
//! - In an off-chain HTTP validator that wants to reject obviously
//!   malformed destinations without round-tripping to Horizon.
//! - In a test fixture that wants to assert "this string is
//!   structurally a Stellar destination" without depending on a
//!   full parser.

#![deny(unsafe_code)]
#![deny(unused_must_use)]
#![forbid(missing_docs)]

/// Prefix character for a Stellar **account-id** StrKey.
///
/// Quittance sends invoice payments to a seller's account-id, so
/// `G` is the only prefix the destination guard treats as canonical.
pub const ACCOUNT_PREFIX: char = 'G';

/// Prefix character for a Stellar **contract** address.
///
/// Useful for routes and memo destinations that point at an invoked
/// contract address in addition to the seller account.
pub const CONTRACT_PREFIX: char = 'C';

/// Total length (in characters) of a Stellar StrKey-encoded ed25519
/// public key. This is independent of which prefix is used (`G` for
/// account-id, `C` for contract).
pub const STRKEY_LENGTH: usize = 56;

/// Errors returned by [`check_destination`].
///
/// Each variant carries a stable `#[repr(u32)]` discriminant so
/// off-chain tools can match on the numeric code without depending
/// on the Rust identifier (mirrors the convention in
/// `contracts/error_codes/src/lib.rs`).
#[derive(Debug, Copy, Clone, PartialEq, Eq)]
#[repr(u32)]
pub enum DestinationError {
    /// The destination string was empty (`""`).
    Empty = 1,
    /// The destination string's length was not 56 characters.
    // Stored as `u32` so the discriminant assignment is unambiguous.
    WrongLength = 2,
    /// The destination string did not begin with `G` or `C`.
    InvalidPrefix = 3,
    /// The destination string contained a character outside the
    /// Stellar base32 alphabet (`A-Z`, `2-7`).
    InvalidCharacter = 4,
}

impl DestinationError {
    /// Return a stable English message describing the error.
    pub fn message(&self) -> &'static str {
        match self {
            DestinationError::Empty => "Destination string is empty.",
            DestinationError::WrongLength => {
                "Destination string is not the expected Stellar StrKey length."
            }
            DestinationError::InvalidPrefix => {
                "Destination string does not start with a Stellar account-id or contract prefix."
            }
            DestinationError::InvalidCharacter => {
                "Destination string contains a character outside the Stellar base32 alphabet."
            }
        }
    }
}

/// Validate the structural shape of a Stellar destination string.
///
/// Returns `Ok(())` when **`every** of the following holds:
///
/// - the input is non-empty,
/// - the input is exactly [`STRKEY_LENGTH`] (`56`) characters long,
/// - the first character is [`ACCOUNT_PREFIX`] (`'G'`) **or**
///   [`CONTRACT_PREFIX`] (`'C'`),
/// - every character is inside the Stellar base32 alphabet
///   (`A`–`Z` or `2`–`7`).
///
/// On failure, returns the **first** [`DestinationError`] variant
/// detected. Order of detection is fixed:
///
/// 1. [`DestinationError::Empty`],
/// 2. [`DestinationError::WrongLength`],
/// 3. [`DestinationError::InvalidPrefix`],
/// 4. [`DestinationError::InvalidCharacter`].
///
/// The order is part of the public contract so consumers can rely on
/// a deterministic error for diagnostics and tests.
///
/// # Example
///
/// ```
/// use destination_guard::{check_destination, ACCOUNT_PREFIX,
///                         STRKEY_LENGTH, DestinationError};
///
/// // A well-known testnet stellar address payload of all-zeros.
/// const ZERO_STRKEY: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
/// assert!(check_destination(ZERO_STRKEY).is_ok());
/// assert_eq!(ZERO_STRKEY.len(), STRKEY_LENGTH);
/// assert_eq!(ZERO_STRKEY.chars().next(), Some(ACCOUNT_PREFIX));
///
/// assert_eq!(
///     check_destination(""),
///     Err(DestinationError::Empty)
/// );
/// assert_eq!(
///     check_destination("G"),
///     Err(DestinationError::WrongLength)
/// );
/// ```
pub fn check_destination(input: &str) -> Result<(), DestinationError> {
    if input.is_empty() {
        return Err(DestinationError::Empty);
    }
    if input.len() != STRKEY_LENGTH {
        return Err(DestinationError::WrongLength);
    }
    match input.chars().next() {
        Some(c) if c == ACCOUNT_PREFIX || c == CONTRACT_PREFIX => {}
        _ => return Err(DestinationError::InvalidPrefix),
    }
    for byte in input.bytes() {
        if !is_stellar_base32(byte) {
            return Err(DestinationError::InvalidCharacter);
        }
    }
    Ok(())
}

/// Convenience wrapper: returns `true` when [`check_destination`] returns
/// `Ok(())`.
///
/// Mirrors the `is_valid_tx_hash` convenience-wrapper pattern in
/// `tx-hash-validate`: callers that only need a yes/no answer can skip
/// handling the [`DestinationError`] enum.
///
/// # Examples
///
/// ```
/// use destination_guard::is_valid_destination;
///
/// // A well-known testnet stellar address payload of all-zeros.
/// const ZERO_STRKEY: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
/// assert!(is_valid_destination(ZERO_STRKEY));
///
/// assert!(!is_valid_destination(""));
/// assert!(!is_valid_destination("G"));
/// ```
#[must_use = "the validation result is ignored; consider using `check_destination` if you need to distinguish the error reason"]
pub fn is_valid_destination(input: &str) -> bool {
    check_destination(input).is_ok()
}

/// Returns `true` if `c` is in the Stellar base32 alphabet (`A-Z`,
/// `2-7`). Lower-case `a-z` is rejected: Stellar StrKeys are always
/// upper-case.
///
/// Space, tab, newline, `-`, and `0`/`1`/`8`/`9` are all rejected.
#[inline]
pub fn is_stellar_base32(c: u8) -> bool {
    matches!(c, b'A'..=b'Z' | b'2'..=b'7')
}

#[cfg(test)]
mod tests {
    use super::*;

    // The canonical zero-payload StrKey.
    // Verified against `stellar-strkey = "0.0.18"`'s
    // `ed25519::PublicKey::from_payload([0u8; 32]).to_string()`.
    const ZERO_STRKEY: &str = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    // One byte set.
    const PAYLOAD_1_STRKEY: &str = "GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H";

    /// Build a 56-character contract-id StrKey by replacing the
    /// `G` (account-id) prefix of [`ZERO_STRKEY`] with the contract
    /// prefix `C`. Same length and alphabet — only the version byte
    /// differs on the wire, the visible StrKey is the same shape.
    fn contract_strkey() -> String {
        // We construct the contract fixture from `ZERO_STRKEY` so
        // they share an exact 56-character body; only the first
        // character differs.
        format!("C{}", &ZERO_STRKEY[1..])
    }

    // ── happy path ──────────────────────────────────────────────────

    #[test]
    fn accepts_canonical_zero_payload_account_strkey() {
        assert_eq!(check_destination(ZERO_STRKEY), Ok(()));
    }

    #[test]
    fn accepts_payload_1_account_strkey() {
        assert_eq!(check_destination(PAYLOAD_1_STRKEY), Ok(()));
    }

    #[test]
    fn accepts_uppercase_c_prefix_for_contract_strkey() {
        let contract = contract_strkey();
        assert_eq!(check_destination(&contract), Ok(()));
    }

    #[test]
    fn well_known_strkeys_have_expected_length() {
        assert_eq!(ZERO_STRKEY.len(), STRKEY_LENGTH);
        assert_eq!(PAYLOAD_1_STRKEY.len(), STRKEY_LENGTH);
        let contract = contract_strkey();
        assert_eq!(contract.len(), STRKEY_LENGTH);
    }

    // ── bounds ───────────────────────────────────────────────────────

    #[test]
    fn rejects_empty_input() {
        assert_eq!(check_destination(""), Err(DestinationError::Empty));
    }

    #[test]
    fn rejects_inputs_at_length_boundaries() {
        // 55 chars (one short)
        let short = &ZERO_STRKEY[..ZERO_STRKEY.len() - 1];
        assert_eq!(short.len(), STRKEY_LENGTH - 1);
        assert_eq!(check_destination(short), Err(DestinationError::WrongLength));

        // 57 chars (one long)
        let long = format!("{}A", ZERO_STRKEY);
        assert_eq!(long.len(), STRKEY_LENGTH + 1);
        assert_eq!(check_destination(&long), Err(DestinationError::WrongLength));
    }

    // ── prefix check ─────────────────────────────────────────────────

    #[test]
    fn rejects_non_g_or_c_prefix() {
        let mut bad = ZERO_STRKEY.to_string();
        // pick a prefix that is in the alphabet but reserved for a
        // different StrKey family — `S` for secret seed, `M` for muxed.
        bad.replace_range(0..1, "S");
        assert_eq!(check_destination(&bad), Err(DestinationError::InvalidPrefix));

        let mut bad = ZERO_STRKEY.to_string();
        bad.replace_range(0..1, "M");
        assert_eq!(check_destination(&bad), Err(DestinationError::InvalidPrefix));
    }

    #[test]
    fn rejects_lowercase_g_prefix_as_invalid_prefix() {
        // `g` is not in the documented `{'G', 'C'}` prefix set, so
        // the prefix check (step 3 of the detection order) fires
        // BEFORE the alphabet scan (step 4). The expected error is
        // `InvalidPrefix`, not `InvalidCharacter`.
        let mut bad = ZERO_STRKEY.to_string();
        bad.replace_range(0..1, "g");
        assert_eq!(check_destination(&bad), Err(DestinationError::InvalidPrefix));
    }

    #[test]
    fn rejects_lowercase_c_prefix_as_invalid_prefix() {
        // `c` is also not in the documented `{'G', 'C'}` prefix
        // set, so the prefix check fires first.
        let mut bad = ZERO_STRKEY.to_string();
        bad.replace_range(0..1, "c");
        assert_eq!(check_destination(&bad), Err(DestinationError::InvalidPrefix));
    }

    // ── character alphabet ───────────────────────────────────────────

    #[test]
    fn rejects_character_outside_alphabet() {
        // length and prefix still ok; replace one char with something
        // invalid.
        let mut bad = ZERO_STRKEY.to_string();
        // position 5: pick `0` (digit zero is not in alphabet).
        // `String::replace_range` is safe and keeps the surrounding
        // UTF-8 invariants intact without needing `unsafe` blocks.
        bad.replace_range(5..6, "0");

        assert_eq!(
            check_destination(&bad),
            Err(DestinationError::InvalidCharacter)
        );
    }

    #[test]
    fn rejects_each_invalid_digit_independently() {
        // 0, 1, 8, 9, dashes and spaces are not in the alphabet.
        for bad_byte_str in ["0", "1", "8", "9", "-", " ", "_"] {
            let mut bad = ZERO_STRKEY.to_string();
            bad.replace_range(5..6, bad_byte_str);
            assert_eq!(
                check_destination(&bad),
                Err(DestinationError::InvalidCharacter),
                "byte {:?} should be rejected",
                bad_byte_str
            );
        }
    }

    #[test]
    fn rejects_lowercase_letters_past_prefix_as_invalid_character() {
        // Pick the FIRST uppercase letter strictly past position 0
        // (the prefix). Replacing it with its lowercase form yields
        // a string whose prefix is still `G` (passes step 3) but
        // whose alphabet scan fails (step 4). So the expected error
        // is `InvalidCharacter`.
        for (pos, byte) in ZERO_STRKEY.as_bytes().iter().enumerate() {
            if pos == 0 || !byte.is_ascii_uppercase() {
                continue;
            }
            let mut bad = ZERO_STRKEY.to_string();
            let replacement = (*byte as char).to_ascii_lowercase().to_string();
            bad.replace_range(pos..pos + 1, &replacement);
            assert_eq!(
                check_destination(&bad),
                Err(DestinationError::InvalidCharacter),
                "lowercase at position {} (was {:?}) should be rejected as InvalidCharacter",
                pos,
                *byte as char
            );
            return;
        }
        // If we get here, ZERO_STRKEY has no uppercase letters past
        // the prefix, which would mean the fixture drifted.
        panic!("ZERO_STRKEY fixture must contain uppercase letters past the prefix");
    }

    // ── is_stellar_base32 ────────────────────────────────────────────

    #[test]
    fn is_stellar_base32_classifies_alphabet_correctly() {
        for c in b'A'..=b'Z' {
            assert!(is_stellar_base32(c), "{} should be in alphabet", c as char);
        }
        for c in b'2'..=b'7' {
            assert!(is_stellar_base32(c), "{} should be in alphabet", c as char);
        }
    }

    #[test]
    fn is_stellar_base32_rejects_non_alphabet_bytes() {
        for c in b'0'..=b'1' {
            assert!(!is_stellar_base32(c));
        }
        for c in b'8'..=b'9' {
            assert!(!is_stellar_base32(c));
        }
        for c in b'a'..=b'z' {
            assert!(!is_stellar_base32(c), "lowercase {} should be rejected", c as char);
        }
        for &c in &[b'-', b'_', b' ', b'\t', b'\n', b'!', b'?', b'.', b','] {
            assert!(!is_stellar_base32(c), "{:?} should be rejected", c as char);
        }
    }

    // ── is_valid_destination ─────────────────────────────────────────

    #[test]
    fn is_valid_returns_true_for_valid_g_account_strkey() {
        assert!(is_valid_destination(ZERO_STRKEY));
        assert!(is_valid_destination(PAYLOAD_1_STRKEY));
    }

    #[test]
    fn is_valid_returns_true_for_valid_c_contract_strkey() {
        let contract = contract_strkey();
        assert!(is_valid_destination(&contract));
    }

    #[test]
    fn is_valid_returns_false_for_empty_string() {
        assert!(!is_valid_destination(""));
    }

    #[test]
    fn is_valid_returns_false_for_bad_prefix() {
        // `S` is reserved for secret-seed StrKeys, so it must not be a
        // valid destination prefix.
        let bad = format!("S{}", &ZERO_STRKEY[1..]);
        assert!(!is_valid_destination(&bad));
    }

    #[test]
    fn is_valid_returns_false_for_invalid_character() {
        // Digit `0` is not in the Stellar base32 alphabet (`A-Z`, `2-7`).
        let mut bad = ZERO_STRKEY.to_string();
        bad.replace_range(5..6, "0");
        assert!(!is_valid_destination(&bad));
    }

    // ── error metadata ───────────────────────────────────────────────

    #[test]
    fn error_messages_are_non_empty() {
        for err in [
            DestinationError::Empty,
            DestinationError::WrongLength,
            DestinationError::InvalidPrefix,
            DestinationError::InvalidCharacter,
        ] {
            assert!(!err.message().is_empty());
        }
    }

    #[test]
    fn error_discriminants_are_unique() {
        let codes = [
            DestinationError::Empty as u32,
            DestinationError::WrongLength as u32,
            DestinationError::InvalidPrefix as u32,
            DestinationError::InvalidCharacter as u32,
        ];
        let unique: std::collections::BTreeSet<u32> = codes.iter().copied().collect();
        assert_eq!(unique.len(), codes.len(), "discriminants must not collide");
    }

    #[test]
    fn error_discriminants_match_expected_values() {
        assert_eq!(DestinationError::Empty as u32, 1);
        assert_eq!(DestinationError::WrongLength as u32, 2);
        assert_eq!(DestinationError::InvalidPrefix as u32, 3);
        assert_eq!(DestinationError::InvalidCharacter as u32, 4);
    }

    #[test]
    fn errors_exhaustively_classify_inputs() {
        // Spot-check that every `check_destination` invocation
        // returns either `Ok(())` or one of the four documented
        // error variants. Strengthens the per-test assertions above
        // by also pinning the specific mapping for representative
        // samples alongside them.
        //
        // We use `Vec<(String, Result<...>)>` rather than a static
        // slice so we can include dynamically-constructed inputs
        // (the part-of-string-with-byte-replaced case below) and
        // the contract StrKey, which is derived from
        // `ZERO_STRKEY` rather than hand-counted.
        let contract = contract_strkey();
        let mut bad_char: String = ZERO_STRKEY.to_string();
        bad_char.replace_range(5..6, "0");

        let samples: Vec<(String, Result<(), DestinationError>)> = vec![
            (String::new(), Err(DestinationError::Empty)),
            ("G".to_string(), Err(DestinationError::WrongLength)),
            (ZERO_STRKEY.to_string(), Ok(())),
            (PAYLOAD_1_STRKEY.to_string(), Ok(())),
            (contract, Ok(())),
            // `S` is reserved for secret-seed StrKeys. Derived
            // from `ZERO_STRKEY` so future fixture edits can't drift
            // the literal.
            (format!("S{}", &ZERO_STRKEY[1..]),
             Err(DestinationError::InvalidPrefix)),
            // Digit `0` in a non-prefix position trips the
            // alphabet scan.
            (bad_char, Err(DestinationError::InvalidCharacter)),
        ];
        for (input, expected) in &samples {
            let actual = check_destination(input);
            assert_eq!(
                actual, *expected,
                "check_destination({:?}) mismatch",
                input
            );
        }
    }

    // ── detection order ──────────────────────────────────────────────

    #[test]
    fn detection_order_is_documented() {
        // Empty: takes precedence over WrongLength (an empty string
        // is also "wrong length").
        assert_eq!(check_destination(""), Err(DestinationError::Empty));

        // WrongLength: takes precedence over InvalidPrefix (a non-56
        // string cannot have its first character meaningfully tested).
        let short_non_g = "G"; // 1 char, valid base32, valid prefix candidate.
        assert_eq!(check_destination(short_non_g), Err(DestinationError::WrongLength));

        // InvalidPrefix: takes precedence over InvalidCharacter when
        // both apply (we never get to alphabet scan).
        let mut s = ZERO_STRKEY.to_string();
        s.replace_range(0..1, "X"); // X not in alphabet, also not a valid prefix.
        assert_eq!(check_destination(&s), Err(DestinationError::InvalidPrefix));
    }
}
