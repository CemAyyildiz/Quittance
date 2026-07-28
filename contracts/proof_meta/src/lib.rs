//! `quittance-proof-meta`
//!
//! Pack/unpack a small proof metadata struct (amount, asset code, memo,
//! tx hash bytes) for Soroban payment proofs on Stellar.
//!
//! This crate defines a single [`ProofMeta`] struct with a deterministic
//! binary encoding. Use [`ProofMeta::pack`] to serialize and
//! [`ProofMeta::unpack`] to deserialize. Round-trip identity holds:
//!
//! ```
//! # use quittance_proof_meta::ProofMeta;
//! let meta = ProofMeta {
//!     amount: 100_000_000,
//!     asset_code: "XLM".to_string(),
//!     memo: Some("INV-001".to_string()),
//!     tx_hash: [0xab; 32],
//! };
//! let bytes = meta.pack().expect("pack must succeed");
//! let unpacked = ProofMeta::unpack(&bytes).expect("unpack must succeed");
//! assert_eq!(meta, unpacked);
//! ```
//!
//! # Binary format
//!
//! All multi-byte integers are **big-endian**. The layout is:
//!
//! | Offset | Len    | Field         | Description                                    |
//! |--------|--------|---------------|------------------------------------------------|
//! | 0      | 16     | `amount`      | `i128` stroop amount (big-endian).             |
//! | 16     | 1      | `code_len`    | Asset code byte length (`u8`, max 12).         |
//! | 17     | N      | `asset_code`  | UTF-8 asset code bytes (N = code_len).         |
//! | 17+N   | 1      | `memo_flag`   | `0x00` → None, `0x01` → Some.                 |
//! | 17+N+1 | 0/1    | `memo_len`    | If memo_flag == 1: memo byte length (`u8`, max 28). |
//! | ...    | 0/M    | `memo`        | If memo_flag == 1: UTF-8 memo bytes (M = memo_len). |
//! | var    | 32     | `tx_hash`     | 32-byte transaction hash.                      |
//!
//! Total packed size: 50 + N + (0 or 1 + M) bytes where N ≤ 12 and M ≤ 28.
//! The maximum packed size is 50 + 12 + 1 + 28 = **91 bytes**.
//!
//! # Validation
//!
//! - Asset codes longer than **12 bytes** are rejected on pack.
//! - Memo text longer than **28 bytes** (Stellar text memo limit) is
//!   rejected on pack.
//! - `tx_hash` is always fixed at 32 bytes by the type system.
//! - Unpack rejects truncated or malformed input with a clear error.

#![deny(unsafe_code)]
#![deny(unused_must_use)]

use core::fmt;

/// Maximum length of a Stellar asset code (bytes).
pub const MAX_ASSET_CODE_LEN: usize = 12;

/// Maximum length of a Stellar text memo (bytes).
pub const MAX_MEMO_LEN: usize = 28;

/// Fixed size of a Stellar transaction hash (bytes).
pub const TX_HASH_LEN: usize = 32;

/// Errors returned by [`ProofMeta::pack`] and [`ProofMeta::unpack`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProofMetaError {
    /// The asset code exceeds [`MAX_ASSET_CODE_LEN`] bytes.
    AssetCodeTooLong { len: usize, max: usize },
    /// The memo text exceeds [`MAX_MEMO_LEN`] bytes.
    MemoTooLong { len: usize, max: usize },
    /// The input buffer is too short to contain a valid proof metadata.
    Truncated,
    /// The memo flag byte was neither `0x00` nor `0x01`.
    InvalidMemoFlag(u8),
    /// The asset code length prefix exceeds [`MAX_ASSET_CODE_LEN`].
    InvalidCodeLen(u8),
    /// The memo length prefix exceeds [`MAX_MEMO_LEN`].
    InvalidMemoLen(u8),
}

impl fmt::Display for ProofMetaError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ProofMetaError::AssetCodeTooLong { len, max } => {
                write!(f, "asset code too long: {len} bytes, max {max}")
            }
            ProofMetaError::MemoTooLong { len, max } => {
                write!(f, "memo too long: {len} bytes, max {max}")
            }
            ProofMetaError::Truncated => {
                write!(f, "input buffer truncated")
            }
            ProofMetaError::InvalidMemoFlag(flag) => {
                write!(f, "invalid memo flag byte: 0x{flag:02x}")
            }
            ProofMetaError::InvalidCodeLen(len) => {
                write!(f, "invalid asset code length: {len}")
            }
            ProofMetaError::InvalidMemoLen(len) => {
                write!(f, "invalid memo length: {len}")
            }
        }
    }
}

impl std::error::Error for ProofMetaError {}

/// A small proof metadata struct for Soroban payment proofs.
///
/// Contains the four fields that uniquely identify an on-chain payment
/// for the purpose of generating a payment proof, receipt, or attestation:
///
/// * `amount` — payment amount in **stroops** (`i128`).
/// * `asset_code` — Stellar asset code (e.g. `"XLM"`, `"USDC"`), at most
///   [`MAX_ASSET_CODE_LEN`] bytes.
/// * `memo` — optional payment memo text, at most [`MAX_MEMO_LEN`] bytes
///   when present (matching the Stellar text memo limit).
/// * `tx_hash` — 32-byte transaction hash from the Stellar ledger.
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct ProofMeta {
    /// Payment amount in stroops.
    pub amount: i128,
    /// Stellar asset code (max [`MAX_ASSET_CODE_LEN`] bytes).
    pub asset_code: String,
    /// Optional payment memo (max [`MAX_MEMO_LEN`] bytes when present).
    pub memo: Option<String>,
    /// 32-byte transaction hash.
    pub tx_hash: [u8; TX_HASH_LEN],
}

impl ProofMeta {
    /// Serialize this proof metadata to its packed binary representation.
    ///
    /// Returns [`ProofMetaError::AssetCodeTooLong`] if the asset code
    /// exceeds [`MAX_ASSET_CODE_LEN`] bytes, or
    /// [`ProofMetaError::MemoTooLong`] if the (present) memo exceeds
    /// [`MAX_MEMO_LEN`] bytes.
    pub fn pack(&self) -> Result<Vec<u8>, ProofMetaError> {
        let code_bytes = self.asset_code.as_bytes();
        if code_bytes.len() > MAX_ASSET_CODE_LEN {
            return Err(ProofMetaError::AssetCodeTooLong {
                len: code_bytes.len(),
                max: MAX_ASSET_CODE_LEN,
            });
        }

        // Pre-allocate capacity for the worst case (max 91 bytes).
        let mut out = Vec::with_capacity(91);

        // 1. amount (16 bytes, i128 big-endian)
        out.extend_from_slice(&self.amount.to_be_bytes());

        // 2. asset_code length (1 byte) + bytes
        out.push(code_bytes.len() as u8);
        out.extend_from_slice(code_bytes);

        // 3. memo: flag + optional length + optional bytes
        match &self.memo {
            None => {
                out.push(0x00);
            }
            Some(text) => {
                let memo_bytes = text.as_bytes();
                if memo_bytes.len() > MAX_MEMO_LEN {
                    return Err(ProofMetaError::MemoTooLong {
                        len: memo_bytes.len(),
                        max: MAX_MEMO_LEN,
                    });
                }
                out.push(0x01);
                out.push(memo_bytes.len() as u8);
                out.extend_from_slice(memo_bytes);
            }
        }

        // 4. tx_hash (32 bytes)
        out.extend_from_slice(&self.tx_hash);

        Ok(out)
    }

    /// Deserialize a [`ProofMeta`] from its packed binary representation.
    ///
    /// Returns [`ProofMetaError::Truncated`] if the input is too short,
    /// [`ProofMetaError::InvalidCodeLen`] if the asset code length prefix
    /// exceeds [`MAX_ASSET_CODE_LEN`], or
    /// [`ProofMetaError::InvalidMemoFlag`] / [`ProofMetaError::InvalidMemoLen`]
    /// if the memo fields are malformed.
    pub fn unpack(data: &[u8]) -> Result<Self, ProofMetaError> {
        let len = data.len();
        let mut pos = 0;

        // 1. amount (16 bytes)
        if pos + 16 > len {
            return Err(ProofMetaError::Truncated);
        }
        let amount_bytes: [u8; 16] = data[pos..pos + 16]
            .try_into()
            .map_err(|_| ProofMetaError::Truncated)?;
        let amount = i128::from_be_bytes(amount_bytes);
        pos += 16;

        // 2. asset_code length (1 byte) + bytes
        if pos + 1 > len {
            return Err(ProofMetaError::Truncated);
        }
        let code_len = data[pos] as usize;
        pos += 1;
        if code_len > MAX_ASSET_CODE_LEN {
            return Err(ProofMetaError::InvalidCodeLen(code_len as u8));
        }
        if pos + code_len > len {
            return Err(ProofMetaError::Truncated);
        }
        let asset_code = core::str::from_utf8(&data[pos..pos + code_len])
            .map_err(|_| ProofMetaError::Truncated)?
            .to_string();
        pos += code_len;

        // 3. memo: flag + optional length + optional bytes
        if pos + 1 > len {
            return Err(ProofMetaError::Truncated);
        }
        let memo_flag = data[pos];
        pos += 1;
        let memo = match memo_flag {
            0x00 => None,
            0x01 => {
                if pos + 1 > len {
                    return Err(ProofMetaError::Truncated);
                }
                let memo_len = data[pos] as usize;
                pos += 1;
                if memo_len > MAX_MEMO_LEN {
                    return Err(ProofMetaError::InvalidMemoLen(memo_len as u8));
                }
                if pos + memo_len > len {
                    return Err(ProofMetaError::Truncated);
                }
                let memo_text = core::str::from_utf8(&data[pos..pos + memo_len])
                    .map_err(|_| ProofMetaError::Truncated)?
                    .to_string();
                pos += memo_len;
                Some(memo_text)
            }
            other => return Err(ProofMetaError::InvalidMemoFlag(other)),
        };

        // 4. tx_hash (32 bytes)
        if pos + TX_HASH_LEN > len {
            return Err(ProofMetaError::Truncated);
        }
        let tx_hash: [u8; TX_HASH_LEN] = data[pos..pos + TX_HASH_LEN]
            .try_into()
            .map_err(|_| ProofMetaError::Truncated)?;

        Ok(ProofMeta {
            amount,
            asset_code,
            memo,
            tx_hash,
        })
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    // ----- helpers --------------------------------------------------------

    fn sample_xlm() -> ProofMeta {
        ProofMeta {
            amount: 100_000_000, // 10 XLM
            asset_code: "XLM".to_string(),
            memo: Some("INV-001".to_string()),
            tx_hash: [0xab; 32],
        }
    }

    fn sample_usdc() -> ProofMeta {
        ProofMeta {
            amount: 50_000_000, // 5 USDC
            asset_code: "USDC".to_string(),
            memo: None,
            tx_hash: [0xcd; 32],
        }
    }

    // ----- pack -----------------------------------------------------------

    #[test]
    fn pack_xlm_succeeds() {
        let bytes = sample_xlm().pack().expect("pack must succeed");
        // Expected structure:
        //   amount: 16 bytes (100_000_000 = 0x05F5E100 as i128 BE)
        //   code_len: 1 (3 = "XLM")
        //   code: 3 bytes ("XLM")
        //   memo_flag: 1 (0x01)
        //   memo_len: 1 (7 = "INV-001")
        //   memo: 7 bytes ("INV-001")
        //   tx_hash: 32 bytes
        let expected_len = 16 + 1 + 3 + 1 + 1 + 7 + 32;
        assert_eq!(bytes.len(), expected_len);
    }

    #[test]
    fn pack_usdc_no_memo_succeeds() {
        let bytes = sample_usdc().pack().expect("pack must succeed");
        //   amount: 16 (50_000_000)
        //   code_len: 1 (4 = "USDC")
        //   code: 4 bytes
        //   memo_flag: 1 (0x00)
        //   tx_hash: 32 bytes
        let expected_len = 16 + 1 + 4 + 1 + 32;
        assert_eq!(bytes.len(), expected_len);
    }

    #[test]
    fn pack_rejects_oversized_asset_code() {
        let meta = ProofMeta {
            asset_code: "A".repeat(13), // 13 > MAX_ASSET_CODE_LEN
            ..sample_xlm()
        };
        assert_eq!(
            meta.pack(),
            Err(ProofMetaError::AssetCodeTooLong {
                len: 13,
                max: MAX_ASSET_CODE_LEN
            })
        );
    }

    #[test]
    fn pack_rejects_oversized_memo() {
        let meta = ProofMeta {
            memo: Some("x".repeat(29)), // 29 > MAX_MEMO_LEN
            ..sample_xlm()
        };
        assert_eq!(
            meta.pack(),
            Err(ProofMetaError::MemoTooLong {
                len: 29,
                max: MAX_MEMO_LEN
            })
        );
    }

    // ----- unpack ---------------------------------------------------------

    #[test]
    fn unpack_xlm_round_trips() {
        let meta = sample_xlm();
        let bytes = meta.pack().unwrap();
        let unpacked = ProofMeta::unpack(&bytes).expect("unpack must succeed");
        assert_eq!(unpacked, meta);
    }

    #[test]
    fn unpack_usdc_round_trips() {
        let meta = sample_usdc();
        let bytes = meta.pack().unwrap();
        let unpacked = ProofMeta::unpack(&bytes).expect("unpack must succeed");
        assert_eq!(unpacked, meta);
    }

    #[test]
    fn unpack_truncated_returns_error() {
        let meta = sample_xlm();
        let bytes = meta.pack().unwrap();
        // Truncate to half the size
        let truncated = &bytes[..bytes.len() / 2];
        assert_eq!(ProofMeta::unpack(truncated), Err(ProofMetaError::Truncated));
    }

    #[test]
    fn unpack_empty_buffer_returns_truncated() {
        assert_eq!(ProofMeta::unpack(&[]), Err(ProofMetaError::Truncated));
    }

    #[test]
    fn unpack_invalid_memo_flag_returns_error() {
        let mut bytes = sample_xlm().pack().unwrap();
        // Overwrite the memo flag byte (at offset 16 + 1 + 3 = 20) with 0x02
        let memo_flag_offset = 16 + 1 + 3; // amount(16) + code_len(1) + "XLM"(3)
        bytes[memo_flag_offset] = 0x02;
        assert_eq!(
            ProofMeta::unpack(&bytes),
            Err(ProofMetaError::InvalidMemoFlag(0x02))
        );
    }

    // ----- round-trip -----------------------------------------------------

    #[test]
    fn round_trip_zero_amount() {
        let meta = ProofMeta {
            amount: 0,
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_negative_amount() {
        let meta = ProofMeta {
            amount: -1,
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_i128_max() {
        let meta = ProofMeta {
            amount: i128::MAX,
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_i128_min() {
        let meta = ProofMeta {
            amount: i128::MIN,
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_no_memo() {
        let meta = ProofMeta {
            memo: None,
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_empty_string_memo() {
        let meta = ProofMeta {
            memo: Some(String::new()),
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_max_len_memo() {
        let long_memo = "x".repeat(MAX_MEMO_LEN);
        let meta = ProofMeta {
            memo: Some(long_memo.clone()),
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_max_len_asset_code() {
        let long_code = "A".repeat(MAX_ASSET_CODE_LEN);
        let meta = ProofMeta {
            asset_code: long_code.clone(),
            ..sample_xlm()
        };
        let bytes = meta.pack().unwrap();
        assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
    }

    #[test]
    fn round_trip_various_asset_codes() {
        for code in ["XLM", "USDC", "BTC", "ETH", "EURT", "JPYC", "ABCD12345678"] {
            let meta = ProofMeta {
                asset_code: code.to_string(),
                ..sample_xlm()
            };
            let bytes = meta.pack().unwrap();
            assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta, "code={code}");
        }
    }

    #[test]
    fn round_trip_different_tx_hashes() {
        for tx_hash in [[0x00; 32], [0xff; 32], [0xab; 32], [0x01; 32]] {
            let meta = ProofMeta {
                tx_hash,
                ..sample_xlm()
            };
            let bytes = meta.pack().unwrap();
            assert_eq!(ProofMeta::unpack(&bytes).unwrap(), meta);
        }
    }

    // ----- determinism ----------------------------------------------------

    #[test]
    fn pack_is_deterministic() {
        let meta = sample_xlm();
        let a = meta.pack().unwrap();
        let b = meta.pack().unwrap();
        assert_eq!(a, b);
    }

    #[test]
    fn pack_different_meta_produces_different_bytes() {
        let a = sample_xlm().pack().unwrap();
        let b = sample_usdc().pack().unwrap();
        assert_ne!(a, b);
    }

    // ----- constant sanity ------------------------------------------------

    #[test]
    fn constants_have_expected_values() {
        assert_eq!(MAX_ASSET_CODE_LEN, 12);
        assert_eq!(MAX_MEMO_LEN, 28);
        assert_eq!(TX_HASH_LEN, 32);
    }
}
