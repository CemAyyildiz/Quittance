/// Maximum number of payees in one split.
pub const MAX_PAYEES: usize = 8;

/// Basis points that represent 100% of a payment.
pub const BPS_TOTAL: u32 = 10_000;

/// One validated distribution. Only the first `len` entries are meaningful.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SplitPlan {
    /// Amount owed to each payee, in the same order as the input shares.
    pub shares: [i128; MAX_PAYEES],
    /// Number of payees that were supplied.
    pub len: usize,
}
