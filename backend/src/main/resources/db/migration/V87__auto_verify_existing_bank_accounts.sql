-- V80: Auto-verify all existing teacher bank accounts
-- Context: ManageTeacherBankAccountUseCase.addAccount() now calls account.verify() automatically
-- (no real-time Napas API validation available). Existing accounts were created before this fix
-- with is_verified = false, which caused RequestPayoutUseCase to throw 400 for all payout requests.
UPDATE teacher_bank_accounts
SET verified = true
WHERE verified = false;
