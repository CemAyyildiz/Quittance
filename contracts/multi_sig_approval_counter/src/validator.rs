use crate::types::ApprovalError;

pub const MAX_REQUIRED_APPROVERS: u32 = 100;

pub fn validate_required(
    existing_required: Option<u32>,
    required: u32,
) -> Result<u32, ApprovalError> {
    if required == 0 || required > MAX_REQUIRED_APPROVERS {
        return Err(ApprovalError::InvalidRequiredThreshold);
    }
    if let Some(prev) = existing_required {
        if prev != required {
            return Err(ApprovalError::ThresholdMismatch);
        }
    }
    Ok(required)
}
