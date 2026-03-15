# Payment / Payout Runbook

## Payment smoke tối thiểu

- mở course trả phí chưa entitlement
- thấy CTA thanh toán
- mở được payment modal
- callback/success dẫn tới entitlement đúng
- refund thu hồi quyền truy cập đúng

## Payout smoke tối thiểu

- teacher thấy payout history
- cancel payout giữ lại row với trạng thái `Đã hủy`
- admin thấy đúng dữ liệu theo role
- `ORG_ADMIN` không thấy dữ liệu ngoài org
- masking bank account đúng

## Cảnh báo

- tránh tạo side effect tài chính thật trên production nếu không cần
- ưu tiên fixture account đã biết trạng thái ban đầu
