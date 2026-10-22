use crate::Error;

pub(crate) fn validate(previous: u32, ledger: u32, min_gap: u32) -> Result<(), Error> {
    if ledger < previous {
        return Err(Error::LedgerRegression);
    }
    if ledger - previous < min_gap {
        return Err(Error::RetryTooSoon);
    }
    Ok(())
}
