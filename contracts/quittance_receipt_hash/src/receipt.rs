//! Receipt proof field definitions plus a builder for ergonomic construction.

/// Asset identifier carried by a Stellar payment.
///
/// Native XLM is represented as [`Asset::native`]. Non-native assets use
/// [`Asset::new`] with an issuer public key.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Asset {
    /// Asset code, e.g. `"XLM"`, `"USDC"`.
    pub code: String,
    /// Issuer public key, or `None` for native XLM.
    pub issuer: Option<String>,
}

impl Asset {
    /// Native XLM. Asset code is `"XLM"` with no issuer.
    pub fn native() -> Self {
        Self {
            code: "XLM".to_string(),
            issuer: None,
        }
    }

    /// Non-native asset with code and issuer public key.
    pub fn new(code: impl Into<String>, issuer: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            issuer: Some(issuer.into()),
        }
    }
}

/// All on-chain proof fields for a single confirmed Stellar payment.
///
/// Construct a value via [`ReceiptFields::builder`] for ergonomic setup, or
/// set fields directly because every field is `pub`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ReceiptFields {
    /// Full Stellar network passphrase (`"Test SDF Network ; September 2015"`
    /// for testnet, `"Public Global Stellar Network ; September 2015"` for
    /// public). Required so the same proof over testnet and public must hash
    /// to different digests.
    pub network_passphrase: String,

    /// 32-byte transaction hash recorded on the Stellar ledger. Use the hex
    /// representation from the Horizon `/transactions/{hash}` endpoint decoded
    /// to bytes, not the hex string itself.
    pub tx_hash: [u8; 32],

    /// Ledger sequence number that closed the transaction.
    pub ledger: u32,

    /// Stellar public key of the invoice seller (`G...`).
    pub seller: String,

    /// Stellar public key of the invoice payer (`G...`).
    pub payer: String,

    /// Payment amount in **stroops** (1 XLM = 10 000 000 stroops). `i64`
    /// matches the Soroban SDK and Stellar core representation.
    pub amount_stroops: i64,

    /// Asset tuple: native or non-native.
    pub asset: Asset,

    /// Optional payment memo text. `None` when the transaction had no memo.
    pub memo: Option<String>,

    /// Optional Quittance invoice UUID for binding the receipt back to a
    /// specific invoice. Helps prevent one receipt being misattributed to a
    /// different invoice of the same seller.
    pub invoice_id: Option<String>,
}

impl ReceiptFields {
    /// Start building a `ReceiptFields` value.
    pub fn builder() -> ReceiptFieldsBuilder {
        ReceiptFieldsBuilder::default()
    }
}

/// Errors returned by [`ReceiptFieldsBuilder::build`] when one of the
/// required fields has not been set.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BuildError {
    /// `network_passphrase` was not set.
    MissingNetwork,
    /// `tx_hash` was not set.
    MissingTxHash,
    /// `ledger` was not set.
    MissingLedger,
    /// `seller` was not set.
    MissingSeller,
    /// `payer` was not set.
    MissingPayer,
    /// `amount_stroops` was not set.
    MissingAmount,
    /// `asset` was not set.
    MissingAsset,
}

impl core::fmt::Display for BuildError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        let field = match self {
            BuildError::MissingNetwork => "network_passphrase",
            BuildError::MissingTxHash => "tx_hash",
            BuildError::MissingLedger => "ledger",
            BuildError::MissingSeller => "seller",
            BuildError::MissingPayer => "payer",
            BuildError::MissingAmount => "amount_stroops",
            BuildError::MissingAsset => "asset",
        };
        write!(f, "receipt builder: missing required field `{}`", field)
    }
}

impl std::error::Error for BuildError {}

/// Fluent builder for [`ReceiptFields`].
#[derive(Debug, Default, Clone)]
pub struct ReceiptFieldsBuilder {
    network_passphrase: Option<String>,
    tx_hash: Option<[u8; 32]>,
    ledger: Option<u32>,
    seller: Option<String>,
    payer: Option<String>,
    amount_stroops: Option<i64>,
    asset: Option<Asset>,
    memo: Option<String>,
    invoice_id: Option<String>,
}

impl ReceiptFieldsBuilder {
    /// Set the network passphrase (testnet or public).
    pub fn network_passphrase(mut self, s: impl Into<String>) -> Self {
        self.network_passphrase = Some(s.into());
        self
    }

    /// Set the 32-byte transaction hash.
    pub fn tx_hash(mut self, h: [u8; 32]) -> Self {
        self.tx_hash = Some(h);
        self
    }

    /// Set the ledger sequence number.
    pub fn ledger(mut self, n: u32) -> Self {
        self.ledger = Some(n);
        self
    }

    /// Set the seller public key (Stellar `G...`).
    pub fn seller(mut self, s: impl Into<String>) -> Self {
        self.seller = Some(s.into());
        self
    }

    /// Set the payer public key (Stellar `G...`).
    pub fn payer(mut self, s: impl Into<String>) -> Self {
        self.payer = Some(s.into());
        self
    }

    /// Set the payment amount in stroops (1 XLM = 10 000 000 stroops).
    pub fn amount_stroops(mut self, n: i64) -> Self {
        self.amount_stroops = Some(n);
        self
    }

    /// Set the asset tuple.
    pub fn asset(mut self, a: Asset) -> Self {
        self.asset = Some(a);
        self
    }

    /// Set the memo text. Pass `String::new()` to mark a present-but-empty
    /// memo (distinct from not setting it at all).
    pub fn memo(mut self, s: impl Into<String>) -> Self {
        self.memo = Some(s.into());
        self
    }

    /// Set the Quittance invoice UUID binding.
    pub fn invoice_id(mut self, s: impl Into<String>) -> Self {
        self.invoice_id = Some(s.into());
        self
    }

    /// Build the [`ReceiptFields`]. Returns [`BuildError`] if any required
    /// field has not been set.
    pub fn build(self) -> Result<ReceiptFields, BuildError> {
        Ok(ReceiptFields {
            network_passphrase: self
                .network_passphrase
                .ok_or(BuildError::MissingNetwork)?,
            tx_hash: self.tx_hash.ok_or(BuildError::MissingTxHash)?,
            ledger: self.ledger.ok_or(BuildError::MissingLedger)?,
            seller: self.seller.ok_or(BuildError::MissingSeller)?,
            payer: self.payer.ok_or(BuildError::MissingPayer)?,
            amount_stroops: self.amount_stroops.ok_or(BuildError::MissingAmount)?,
            asset: self.asset.ok_or(BuildError::MissingAsset)?,
            memo: self.memo,
            invoice_id: self.invoice_id,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builder_requires_all_mandatory_fields() {
        let result = ReceiptFieldsBuilder::default().build();
        // Any required field can fail first because they are checked in order;
        // assert the error represents something mandatory, not Optional ones.
        assert!(matches!(
            result,
            Err(BuildError::MissingNetwork)
                | Err(BuildError::MissingTxHash)
                | Err(BuildError::MissingLedger)
                | Err(BuildError::MissingSeller)
                | Err(BuildError::MissingPayer)
                | Err(BuildError::MissingAmount)
                | Err(BuildError::MissingAsset)
        ));
    }

    #[test]
    fn builder_completes_with_all_required_fields() {
        let f = ReceiptFieldsBuilder::default()
            .network_passphrase("Test SDF Network ; September 2015")
            .tx_hash([0u8; 32])
            .ledger(1)
            .seller("SellerA")
            .payer("PayerA")
            .amount_stroops(100)
            .asset(Asset::native())
            .build()
            .unwrap();
        assert_eq!(f.network_passphrase, "Test SDF Network ; September 2015");
        assert_eq!(f.ledger, 1);
        assert_eq!(f.amount_stroops, 100);
        assert_eq!(f.asset, Asset::native());
        assert_eq!(f.memo, None);
        assert_eq!(f.invoice_id, None);
    }

    #[test]
    fn asset_native_has_no_issuer() {
        let a = Asset::native();
        assert_eq!(a.code, "XLM");
        assert!(a.issuer.is_none());
    }

    #[test]
    fn asset_new_stores_both() {
        let a = Asset::new("USDC", "GISSUER");
        assert_eq!(a.code, "USDC");
        assert_eq!(a.issuer.as_deref(), Some("GISSUER"));
    }
}
