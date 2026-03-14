-- V89: localize legacy teacher-cancelled payout notes

UPDATE payout_requests
SET admin_note = 'Giảng viên đã hủy yêu cầu rút tiền'
WHERE admin_note = 'Teacher cancelled request';
