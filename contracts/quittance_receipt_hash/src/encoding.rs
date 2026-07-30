//! Internal encoders for receipt hash preimage construction.
//!
//! These functions are not part of the public API. They implement the
//! deterministic byte layout documented in the crate `README.md` so a
//! future Soroban contract can reproduce the same hash byte-for-byte.

use crate::domain::DomainSeparator;
use crate::receipt::ReceiptFields;

/// Current preimage version (encoded as `u32_be(VERSION)` immediately after
/// the domain block in the preimage).
///
/// Bumped only when the byte layout changes in a backward-incompatible way.
/// Adding a new field below the existing ones with a fresh, never-used tag
/// is backward-compatible and does NOT require a version bump, because SHA-256
/// over the same prefix plus new bytes produces a strictly different digest.
///
/// IMPORTANT: a Soroban contract that reproduces this encoding must write
/// the `u32_be(VERSION)` block in the same position: directly after the
/// `(u32_be len(domain) || domain_bytes)` block, before any per-field writes.
/// Removing or repositioning it would silently invalidate every existing
/// receipt hash.
pub(crate) const VERSION: u32 = 1;

/// Build the full byte preimage that is fed to SHA-256.
///
/// The exact byte layout is documented in `README.md`. Quick recap:
///
/// ```text
/// SHA256(
///     u32_be(len(domain)) || domain_bytes ||
///     u32_be(version) ||
///     field("network",     passphrase_bytes) ||
///     field("tx_hash",     tx_hash_32_bytes) ||
///     field("ledger",      u32_be(ledger)) ||
///     field("seller",      seller_utf8) ||
///     field("payer",       payer_utf8) ||
///     field("amount",      i64_be(amount_stroops)) ||
///     field("asset_code",  asset_code_utf8) ||
///     field("asset_issuer", encode_optional(asset_issuer)) ||
///     field("memo",        encode_optional(memo)) ||
///     field("invoice_id",  encode_optional(invoice_id))
/// )
/// ```
pub(crate) fn build_preimage(
    domain: &DomainSeparator,
    fields: &ReceiptFields,
) -> Vec<u8> {
    // 512 bytes is enough for the typical Quittance receipt; worst case we
    // reallocate once. The preimage is bounded because every field value is
    // length-prefixed by the writer and limited by Stellar / UUID sizes.
    let mut out = Vec::with_capacity(512);

    // Domain block: u32_be(len(domain)) || domain_bytes
    let domain_bytes = domain.as_bytes();
    out.extend_from_slice(&(domain_bytes.len() as u32).to_be_bytes());
    out.extend_from_slice(domain_bytes);

    // Version block
    out.extend_from_slice(&VERSION.to_be_bytes());

    // Per-field tagged writes
    write_field(&mut out, b"network", fields.network_passphrase.as_bytes());
    write_field(&mut out, b"tx_hash", &fields.tx_hash);

    let ledger_bytes = fields.ledger.to_be_bytes();
    write_field(&mut out, b"ledger", &ledger_bytes);

    write_field(&mut out, b"seller", fields.seller.as_bytes());
    write_field(&mut out, b"payer", fields.payer.as_bytes());

    let amount_bytes = fields.amount_stroops.to_be_bytes();
    write_field(&mut out, b"amount", &amount_bytes);

    write_field(&mut out, b"asset_code", fields.asset.code.as_bytes());
    write_field(
        &mut out,
        b"asset_issuer",
        &encode_optional(&fields.asset.issuer),
    );
    write_field(&mut out, b"memo", &encode_optional(&fields.memo));
    write_field(
        &mut out,
        b"invoice_id",
        &encode_optional(&fields.invoice_id),
    );

    out
}

/// Write a length-prefixed tagged field.
///
/// `field(tag, value)` is encoded as:
/// `u32_be(len(tag)) || tag || u32_be(len(value)) || value`.
///
/// The tag and value are both length-prefixed so concatenated field writes
/// cannot be confused with each other: every reader always knows where the
/// next field begins.
pub(crate) fn write_field(out: &mut Vec<u8>, tag: &[u8], value: &[u8]) {
    out.extend_from_slice(&(tag.len() as u32).to_be_bytes());
    out.extend_from_slice(tag);
    out.extend_from_slice(&(value.len() as u32).to_be_bytes());
    out.extend_from_slice(value);
}

/// Encode a tagged optional string value inside a field's value slot.
///
/// - `None`            -> `[0x00]`   (1 byte)
/// - `Some(s)` -> `[0x01] || u32_be(s.len()) || s.as_bytes()`
///
/// The leading `0x00`/`0x01` flag prevents the empty-string-in-Some case from
/// being encoded identically to None, while the embedded length prefix
/// preserves uniqueness for any non-empty string.
pub(crate) fn encode_optional(maybe: &Option<String>) -> Vec<u8> {
    let mut out = Vec::with_capacity(8);
    match maybe {
        None => out.push(0x00),
        Some(value) => {
            out.push(0x01);
            let bytes = value.as_bytes();
            out.extend_from_slice(&(bytes.len() as u32).to_be_bytes());
            out.extend_from_slice(bytes);
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn optional_none_is_one_zero_byte() {
        assert_eq!(encode_optional(&None), vec![0x00]);
    }

    #[test]
    fn optional_some_is_flag_len_value() {
        let got = encode_optional(&Some("hi".to_string()));
        assert_eq!(got, vec![0x01, 0x00, 0x00, 0x00, 0x02, b'h', b'i']);
    }

    #[test]
    fn optional_empty_some_differs_from_none() {
        assert_ne!(encode_optional(&None), encode_optional(&Some(String::new())));
    }

    #[test]
    fn field_writer_includes_tag_and_value_length_prefixes() {
        let mut out = Vec::new();
        write_field(&mut out, b"k", b"vv");
        // u32_be(1) || "k" || u32_be(2) || "vv"
        assert_eq!(
            out,
            vec![0x00, 0x00, 0x00, 0x01, b'k', 0x00, 0x00, 0x00, 0x02, b'v', b'v']
        );
    }
}
