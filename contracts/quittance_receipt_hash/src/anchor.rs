//! On-chain anchor record for a paid Quittance receipt.
//!
//! The hash module computes a canonical digest for a receipt; this module is
//! the write-side of the same crate: it exposes [`QuittanceAnchor`], the
//! Soroban contract entry a wallet calls to store the invoice id and digest on
//! chain. Reusing the crate keeps the digest and the anchor on the same wire
//! format — no second crate and no second hashing implementation.
//!
//! The contract entry point is:
//!
//! ```text
//! anchor(env, seller: Address, invoice_id: String, digest: Bytes) -> Result<(), AnchorError>
//! ```
//!
//! The seller's address must authorize that host-function call; the server
//! never holds a signing key. The digest is the canonical 32-byte receipt hash
//! the backend recomputed and checked against the confirmed payment before the
//! wallet was asked to sign.
//!
//! Each invoice can be anchored once. The record lives in Soroban instance
//! storage under [`DataKey::Anchor`], so it survives the invocation and is
//! readable by later calls to [`QuittanceAnchor::get_anchor`].

use alloc::string::String as StdString;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, Address, Bytes, BytesN, Env, String,
};

/// Fixed byte length of the canonical SHA-256 digest.
pub const DIGEST_LEN: usize = 32;

/// Ledgers a stored anchor is bumped by when it falls below the threshold.
///
/// Same 30/90 day convention as the other Quittance contracts: the entry is
/// extended whenever it is within ~30 days of archiving, out to ~90 days.
const TTL_THRESHOLD: u32 = 30 * 17_280;
const TTL_EXTEND_TO: u32 = 90 * 17_280;

/// Errors returned when an anchor is written.
#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum AnchorError {
    /// The invoice is not in the PAID state yet (checked by the caller before
    /// signing; the contract cannot see off-chain invoice state).
    InvoiceNotPaid = 1,
    /// This invoice already has an anchor; anchors are one-shot.
    AlreadyAnchored = 2,
    /// The submitted digest is not the canonical digest of the invoice
    /// (checked by the caller before signing).
    DigestMismatch = 3,
    /// The digest is not 32 bytes of hexadecimal.
    InvalidDigest = 4,
}

impl core::fmt::Display for AnchorError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let message = match self {
            AnchorError::InvoiceNotPaid => "invoice is not paid",
            AnchorError::AlreadyAnchored => "invoice already has an anchor",
            AnchorError::DigestMismatch => "digest does not match the invoice",
            AnchorError::InvalidDigest => "digest must be 32 bytes of hex",
        };
        f.write_str(message)
    }
}

/// The immutable record written on chain: invoice id plus canonical digest.
#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ReceiptAnchor {
    /// Quittance invoice UUID the proof belongs to.
    pub invoice_id: String,
    /// Canonical 32-byte receipt digest.
    pub digest: BytesN<32>,
}

impl ReceiptAnchor {
    /// Build an anchor from an invoice id and a lowercase/uppercase hex digest.
    pub fn new(env: &Env, invoice_id: &str, digest_hex: &str) -> Result<Self, AnchorError> {
        let raw = hex::decode(digest_hex).map_err(|_| AnchorError::InvalidDigest)?;
        if raw.len() != DIGEST_LEN {
            return Err(AnchorError::InvalidDigest);
        }
        let mut digest = [0u8; DIGEST_LEN];
        digest.copy_from_slice(&raw);
        Ok(Self {
            invoice_id: String::from_str(env, invoice_id),
            digest: BytesN::from_array(env, &digest),
        })
    }

    /// Lowercase hex representation of the anchored digest.
    pub fn digest_hex(&self) -> StdString {
        hex::encode(self.digest.to_array())
    }
}

/// Storage keys used by the anchor contract.
#[contracttype]
#[derive(Clone)]
pub(crate) enum DataKey {
    /// One anchor per invoice id.
    Anchor(String),
}

/// Write-once on-chain anchor for paid Quittance invoices.
#[contract]
pub struct QuittanceAnchor;

#[contractimpl]
impl QuittanceAnchor {
    /// Store the canonical digest for `invoice_id`, authorized by `seller`.
    ///
    /// The call persists [`ReceiptAnchor`] in instance storage. A second
    /// anchor for the same invoice is rejected with
    /// [`AnchorError::AlreadyAnchored`]; a digest that is not exactly
    /// [`DIGEST_LEN`] bytes is rejected with [`AnchorError::InvalidDigest`]
    /// and nothing is written.
    pub fn anchor(
        env: Env,
        seller: Address,
        invoice_id: String,
        digest: Bytes,
    ) -> Result<(), AnchorError> {
        seller.require_auth();

        let key = DataKey::Anchor(invoice_id.clone());
        if env.storage().instance().has(&key) {
            return Err(AnchorError::AlreadyAnchored);
        }
        if digest.len() as usize != DIGEST_LEN {
            return Err(AnchorError::InvalidDigest);
        }

        let mut raw = [0u8; DIGEST_LEN];
        digest.copy_into_slice(&mut raw);
        let record = ReceiptAnchor {
            invoice_id,
            digest: BytesN::from_array(&env, &raw),
        };

        env.storage().instance().set(&key, &record);
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        Ok(())
    }

    /// Return the anchor recorded for `invoice_id`, or `None` when the
    /// invoice has not been anchored yet.
    pub fn get_anchor(env: Env, invoice_id: String) -> Option<ReceiptAnchor> {
        let key = DataKey::Anchor(invoice_id);
        let record: Option<ReceiptAnchor> = env.storage().instance().get(&key);
        if record.is_some() {
            env.storage()
                .instance()
                .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        }
        record
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{compute_hex, Asset, DomainSeparator, ReceiptFieldsBuilder};
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Bytes, Env, String};

    const DIGEST: &str = "45d16a23e4b9492ccd2d36951094398064db488e804d2e975f0222c4fdde8e31";
    const INVOICE_ID: &str = "11111111-1111-1111-1111-111111111111";

    fn setup(env: &Env) -> (QuittanceAnchorClient<'_>, Address, String, Address) {
        env.mock_all_auths();
        let contract_id = env.register(QuittanceAnchor, ());
        let client = QuittanceAnchorClient::new(env, &contract_id);
        (
            client,
            Address::generate(env),
            String::from_str(env, INVOICE_ID),
            contract_id,
        )
    }

    fn digest_bytes(env: &Env) -> Bytes {
        Bytes::from_array(env, &[0xab; DIGEST_LEN])
    }

    #[test]
    fn anchors_a_paid_invoice_with_the_canonical_digest() {
        let env = Env::default();
        let (client, seller, invoice_id, _) = setup(&env);
        let digest = digest_bytes(&env);

        client.anchor(&seller, &invoice_id, &digest);

        let record = client.get_anchor(&invoice_id).expect("anchor must persist");
        assert_eq!(record.invoice_id, invoice_id);
        assert_eq!(record.digest, BytesN::from_array(&env, &[0xab; DIGEST_LEN]));
    }

    #[test]
    fn writes_the_record_to_instance_storage() {
        let env = Env::default();
        let (client, seller, invoice_id, contract_id) = setup(&env);
        let digest = digest_bytes(&env);

        client.anchor(&seller, &invoice_id, &digest);

        env.as_contract(&contract_id, || {
            let stored: Option<ReceiptAnchor> = env
                .storage()
                .instance()
                .get(&DataKey::Anchor(invoice_id.clone()));
            let stored = stored.expect("anchor must be in instance storage");
            assert_eq!(stored.invoice_id, invoice_id);
        });
    }

    #[test]
    fn refuses_a_second_anchor_for_the_same_invoice() {
        let env = Env::default();
        let (client, seller, invoice_id, _) = setup(&env);
        let digest = digest_bytes(&env);

        client.anchor(&seller, &invoice_id, &digest);

        assert_eq!(
            client
                .try_anchor(&seller, &invoice_id, &digest)
                .unwrap_err()
                .unwrap(),
            AnchorError::AlreadyAnchored
        );
        assert!(client.get_anchor(&invoice_id).is_some());
    }

    #[test]
    fn refuses_a_digest_that_is_not_32_bytes() {
        let env = Env::default();
        let (client, seller, invoice_id, _) = setup(&env);
        let short = Bytes::from_array(&env, &[0xab; DIGEST_LEN - 1]);

        assert_eq!(
            client
                .try_anchor(&seller, &invoice_id, &short)
                .unwrap_err()
                .unwrap(),
            AnchorError::InvalidDigest
        );
        assert_eq!(client.get_anchor(&invoice_id), None);
    }

    #[test]
    fn seller_must_authorize_the_anchor() {
        let env = Env::default();
        let contract_id = env.register(QuittanceAnchor, ());
        let client = QuittanceAnchorClient::new(&env, &contract_id);
        let seller = Address::generate(&env);
        let invoice_id = String::from_str(&env, INVOICE_ID);

        // No `mock_all_auths`: the seller's authorization is required.
        assert!(client
            .try_anchor(&seller, &invoice_id, &digest_bytes(&env))
            .is_err());
        assert_eq!(client.get_anchor(&invoice_id), None);
    }

    #[test]
    fn accepts_a_digest_produced_by_the_hash_module() {
        let env = Env::default();
        let (client, seller, invoice_id, _) = setup(&env);

        let fields = ReceiptFieldsBuilder::default()
            .network_passphrase("Test SDF Network ; September 2015")
            .tx_hash([0xab; 32])
            .ledger(12_345)
            .seller("SellerA")
            .payer("PayerA")
            .amount_stroops(100_000_000)
            .asset(Asset::native())
            .invoice_id(INVOICE_ID)
            .build()
            .unwrap();
        let digest = compute_hex(&DomainSeparator::quittance_v1(), &fields);
        let record = ReceiptAnchor::new(&env, INVOICE_ID, &digest).unwrap();

        client.anchor(
            &seller,
            &invoice_id,
            &Bytes::from_array(&env, &record.digest.to_array()),
        );

        assert_eq!(client.get_anchor(&invoice_id).unwrap().digest_hex(), digest);
    }

    #[test]
    fn receipt_anchor_parses_and_re_encodes_hex() {
        let env = Env::default();
        let record = ReceiptAnchor::new(&env, INVOICE_ID, DIGEST).unwrap();
        assert_eq!(record.digest_hex(), DIGEST);
        assert!(ReceiptAnchor::new(&env, INVOICE_ID, "abcd").is_err());
    }
}
