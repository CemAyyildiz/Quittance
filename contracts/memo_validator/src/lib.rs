#![no_std]

//! `memo-validator` — Quittance Soroban contract that validates Stellar
//! text memos before they are accepted by the protocol.
//!
//! A valid text memo must satisfy two rules:
//!
//! 1. **Length:** at most [`MAX_MEMO_BYTES`] (28 bytes), matching the
//!    Stellar network's MEMO_TEXT limit.
//! 2. **Charset:** every byte must be a printable ASCII character in the
//!    range `0x20..=0x7E` (space through tilde). Control characters,
//!    high bytes, and non-UTF-8 sequences are rejected.
//!
//! # Deployment
//!
//! This contract is stateless — it performs no storage reads or writes
//! and has no constructor. Deploy once and cross-call [`MemoValidator::validate`]
//! from any other Soroban contract that needs to gate on memo validity.
//!
//! # Usage (Soroban CLI)
//!
//! ```ignore
//! soroban contract invoke \
//!   --id <CONTRACT_ID> \
//!   -- \
//!   validate \
//!   --memo "INV-42"
//! ```
//!
//! # Scope
//!
//! - Only the two validation rules above.
//! - No storage, no admin keys, no upgrade logic.
//! - **Explicitly not wired into Next.js or Express demos.**

use soroban_sdk::{contract, contractimpl, Env, String};

/// Maximum byte length of a Stellar text memo.
///
/// Stellar's MEMO_TEXT field is limited to 28 bytes on the network
/// level. Any memo longer than this is rejected without further
/// inspection.
pub const MAX_MEMO_BYTES: u32 = 28;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/// Returns `true` when `byte` is a printable ASCII character.
///
/// The allowed range is `0x20..=0x7E` which covers:
/// - Space (`0x20`)
/// - Digits `0`–`9` (`0x30`–`0x39`)
/// - Uppercase letters `A`–`Z` (`0x41`–`0x5A`)
/// - Lowercase letters `a`–`z` (`0x61`–`0x7A`)
/// - Common punctuation and symbols
///
/// Control characters (`0x00`–`0x1F`) and DEL (`0x7F`) are rejected.
/// Bytes above `0x7F` (which would indicate multi-byte UTF-8 sequences
/// or raw binary) are also rejected.
#[inline]
fn is_printable_ascii(byte: u8) -> bool {
    byte >= 0x20 && byte <= 0x7E
}

/// Validate every byte in `buf[..len]` against [`is_printable_ascii`].
///
/// Returns `true` when all bytes pass, `false` as soon as the first
/// non-printable byte is found.
#[inline]
fn all_bytes_printable(buf: &[u8], len: u32) -> bool {
    for i in 0..len as usize {
        if !is_printable_ascii(buf[i]) {
            return false;
        }
    }
    true
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

/// Stateless Soroban contract that validates Stellar text memos.
///
/// No constructor is needed — the contract operates entirely on its
/// input and compile-time constants.
#[contract]
pub struct MemoValidator;

#[contractimpl]
impl MemoValidator {
    /// Validate a Stellar text memo.
    ///
    /// Returns `true` when **both** of these hold:
    ///
    /// 1. `memo.len()` ≤ [`MAX_MEMO_BYTES`] (28 bytes).
    /// 2. Every byte in the memo is a printable ASCII character
    ///    (`0x20`–`0x7E`).
    ///
    /// An empty memo (length 0) is considered valid — Stellar
    /// transactions may omit the memo field entirely, and this function
    /// treats the empty string as acceptable.
    ///
    /// # Arguments
    ///
    /// * `env` — Soroban environment (used only for host allocations).
    /// * `memo` — The candidate text memo as a Soroban string.
    ///
    /// # Returns
    ///
    /// * `true` — The memo passes length and charset checks.
    /// * `false` — The memo is too long, contains forbidden bytes, or
    ///   both.
    pub fn validate(_env: Env, memo: String) -> bool {
        let len = memo.len();

        // Rule 1: length must not exceed the Stellar MEMO_TEXT limit.
        if len > MAX_MEMO_BYTES {
            return false;
        }

        // An empty memo is always valid.
        if len == 0 {
            return true;
        }

        // Rule 2: every byte must be printable ASCII.
        //
        // Soroban SDK String does not offer direct byte iteration in
        // no_std, so we copy the string contents into a fixed-size
        // stack buffer and inspect that buffer.
        let mut buf = [0u8; MAX_MEMO_BYTES as usize];
        memo.copy_into_slice(&mut buf[..len as usize]);

        all_bytes_printable(&buf, len)
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;
    use soroban_sdk::Env;

    /// Create a Soroban `String` from a Rust `&str` using the given env.
    fn s(env: &Env, value: &str) -> String {
        String::from_str(env, value)
    }

    // ----- helper: invoke validate via generated client -------------------

    fn validate(env: &Env, contract_id: &soroban_sdk::Address, memo: &str) -> bool {
        let client = MemoValidatorClient::new(env, contract_id);
        let memo_sdk = s(env, memo);
        client.validate(&memo_sdk)
    }

    // ----- length: happy path ---------------------------------------------

    #[test]
    fn empty_memo_is_valid() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        assert!(validate(&env, &contract_id, ""));
    }

    #[test]
    fn single_ascii_char_is_valid() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());

        // Test a representative sample of allowed characters.
        let chars = [" ", "A", "z", "0", "9", "!", "~"];
        for ch in chars {
            assert!(
                validate(&env, &contract_id, ch),
                "expected valid: '{ch}'"
            );
        }
    }

    #[test]
    fn typical_invoice_id_is_valid() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        assert!(validate(&env, &contract_id, "INV-001"));
    }

    #[test]
    fn short_ascii_text_is_valid() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        assert!(validate(&env, &contract_id, "Payment for order #42"));
    }

    #[test]
    fn exactly_28_bytes_is_valid() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        // Exactly 28 printable ASCII bytes.
        let memo = "abcdefghijklmnopqrstuvwxyzAB"; // 28 chars
        assert_eq!(memo.len(), MAX_MEMO_BYTES as usize);
        assert!(validate(&env, &contract_id, memo));
    }

    // ----- length: rejection ----------------------------------------------

    #[test]
    fn twenty_nine_bytes_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        let memo = "a".repeat(29);
        assert_eq!(memo.len(), 29);
        assert!(!validate(&env, &contract_id, &memo));
    }

    #[test]
    fn far_too_long_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        let memo = "x".repeat(256);
        assert!(!validate(&env, &contract_id, &memo));
    }

    // ----- charset: rejection ---------------------------------------------

    #[test]
    fn null_byte_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        let memo = "bad\0memo";
        assert!(!validate(&env, &contract_id, memo));
    }

    #[test]
    fn tab_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        assert!(!validate(&env, &contract_id, "has\ttab"));
    }

    #[test]
    fn newline_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        assert!(!validate(&env, &contract_id, "line\nbreak"));
    }

    #[test]
    fn carriage_return_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        assert!(!validate(&env, &contract_id, "return\rcr"));
    }

    #[test]
    fn del_byte_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        let memo_with_del = core::str::from_utf8(&[0x41, 0x7F, 0x42]).unwrap();
        assert!(!validate(&env, &contract_id, memo_with_del));
    }

    #[test]
    fn high_byte_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        // U+00E9 'e with acute' encodes as 0xC3 0xA9 in UTF-8.
        // Both bytes are > 0x7E, so the memo must be rejected.
        let memo = "A\u{00E9}B";
        assert!(!validate(&env, &contract_id, memo));
    }

    #[test]
    fn leading_control_char_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        // 0x01 (SOH) followed by "ok"
        let memo = core::str::from_utf8(&[0x01, b'o', b'k']).unwrap();
        assert!(!validate(&env, &contract_id, memo));
    }

    // ----- boundary: exact edges of allowed range -------------------------

    #[test]
    fn space_byte_is_valid() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        // Space (0x20) is the lower bound of printable ASCII.
        assert!(validate(&env, &contract_id, " "));
    }

    #[test]
    fn tilde_byte_is_valid() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        // Tilde (0x7E) is the upper bound of printable ASCII.
        assert!(validate(&env, &contract_id, "~~~"));
    }

    #[test]
    fn byte_below_space_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        // 0x1F (Unit Separator)
        let memo = core::str::from_utf8(&[0x1F]).unwrap();
        assert!(!validate(&env, &contract_id, memo));
    }

    #[test]
    fn byte_above_tilde_is_rejected() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        // 0x7F (DEL)
        let memo = core::str::from_utf8(&[0x7F]).unwrap();
        assert!(!validate(&env, &contract_id, memo));
    }

    // ----- misc -----------------------------------------------------------

    #[test]
    fn validate_is_idempotent() {
        let env = Env::default();
        let contract_id = env.register(MemoValidator, ());
        let memo = "INV-001";
        let first = validate(&env, &contract_id, memo);
        let second = validate(&env, &contract_id, memo);
        assert_eq!(first, second);
    }

    #[test]
    fn constants_have_expected_values() {
        assert_eq!(MAX_MEMO_BYTES, 28);
    }
}
