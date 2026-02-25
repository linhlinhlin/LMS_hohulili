package com.example.lms.shared.infrastructure.vnpay;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Tests cho VnPayGatewayAdapter - tích hợp cổng thanh toán VNPay v2.1.
 *
 * Kiểm tra:
 * - Tạo URL thanh toán với đầy đủ tham số (tmn_code, amount×100, HMAC-SHA512)
 * - Xác minh callback: chữ ký hợp lệ, bị thay đổi, và tham số rỗng
 * - Loại bỏ dấu tiếng Việt trong thông tin đơn hàng
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("VnPayGatewayAdapter (Cổng thanh toán VNPay)")
class VnPayGatewayAdapterTest {

    @Mock
    private VnPayConfig config;

    private static final String TEST_TMN_CODE = "TESTCODE01";
    private static final String TEST_HASH_SECRET = "ABCDEF0123456789ABCDEF0123456789";
    private static final String TEST_PAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private static final String TEST_RETURN_URL = "http://localhost:4200/payment/vnpay-return";

    @Nested
    @DisplayName("createPaymentUrl - Tạo URL thanh toán")
    class CreatePaymentUrl {

        private VnPayGatewayAdapter adapter;

        @BeforeEach
        void setUp() {
            // createPaymentUrl sử dụng tất cả config fields
            when(config.getTmnCode()).thenReturn(TEST_TMN_CODE);
            when(config.getHashSecret()).thenReturn(TEST_HASH_SECRET);
            when(config.getPayUrl()).thenReturn(TEST_PAY_URL);
            when(config.getReturnUrl()).thenReturn(TEST_RETURN_URL);
            when(config.getExpireMinutes()).thenReturn(15);

            adapter = new VnPayGatewayAdapter(config);
        }

        @Test
        @DisplayName("URL phải chứa mã terminal (vnp_TmnCode)")
        void urlShouldContainTmnCode() {
            UUID txnId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("500000");

            String url = adapter.createPaymentUrl(txnId, amount, "Thanh toan khoa hoc", "127.0.0.1");

            assertThat(url).contains("vnp_TmnCode=" + TEST_TMN_CODE);
        }

        @Test
        @DisplayName("Số tiền phải nhân 100 (VNPay không dùng số thập phân)")
        void amountShouldBeMultipliedBy100() {
            UUID txnId = UUID.randomUUID();
            // 500.000 VND × 100 = 50.000.000
            BigDecimal amount = new BigDecimal("500000");

            String url = adapter.createPaymentUrl(txnId, amount, "Test order", "127.0.0.1");

            assertThat(url).contains("vnp_Amount=50000000");
        }

        @Test
        @DisplayName("URL phải chứa chữ ký HMAC-SHA512 (vnp_SecureHash)")
        void urlShouldContainHmacSha512Signature() {
            UUID txnId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("100000");

            String url = adapter.createPaymentUrl(txnId, amount, "Test", "127.0.0.1");

            assertThat(url).contains("vnp_SecureHash=");

            // Trích xuất giá trị hash - phải là chuỗi hex 128 ký tự (SHA-512)
            String hash = url.substring(url.indexOf("vnp_SecureHash=") + "vnp_SecureHash=".length());
            if (hash.contains("&")) {
                hash = hash.substring(0, hash.indexOf("&"));
            }
            assertThat(hash).matches("[0-9a-f]{128}");
        }

        @Test
        @DisplayName("Phải loại bỏ dấu tiếng Việt trong thông tin đơn hàng")
        void shouldRemoveDiacriticsFromOrderInfo() {
            UUID txnId = UUID.randomUUID();
            BigDecimal amount = new BigDecimal("200000");

            // "Thanh toán khóa học Đại cương" chứa dấu tiếng Việt
            String url = adapter.createPaymentUrl(txnId, amount, "Thanh toán khóa học Đại cương", "127.0.0.1");

            // URL không được chứa ký tự có dấu
            // Sau khi removeDiacritics: "Thanh toan khoa hoc Dai cuong"
            assertThat(url).doesNotContain("toán");
            assertThat(url).doesNotContain("khóa");
            assertThat(url).doesNotContain("Đại");
            // URL-encoded "Thanh+toan+khoa+hoc+Dai+cuong" hoặc "Thanh%20toan..."
            assertThat(url).containsPattern("(?i)Thanh.toan.khoa.hoc.Dai.cuong");
        }
    }

    @Nested
    @DisplayName("verifyCallback - Xác minh callback từ VNPay")
    class VerifyCallback {

        private VnPayGatewayAdapter adapter;

        @BeforeEach
        void setUp() {
            // verifyCallback chỉ sử dụng config.getHashSecret()
            when(config.getHashSecret()).thenReturn(TEST_HASH_SECRET);

            adapter = new VnPayGatewayAdapter(config);
        }

        @Test
        @DisplayName("Callback hợp lệ phải trả về true")
        void validCallbackShouldReturnTrue() {
            // Tạo tham số giả lập callback từ VNPay
            Map<String, String> params = new TreeMap<>();
            params.put("vnp_Amount", "10000000");
            params.put("vnp_TmnCode", TEST_TMN_CODE);
            params.put("vnp_TxnRef", UUID.randomUUID().toString());
            params.put("vnp_ResponseCode", "00");
            params.put("vnp_TransactionStatus", "00");

            // Tính chữ ký hợp lệ bằng cùng secret
            String validHash = VnPayUtil.hashAllFields(params, TEST_HASH_SECRET);
            params.put("vnp_SecureHash", validHash);

            boolean result = adapter.verifyCallback(params);

            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("Callback bị thay đổi (tampered) phải trả về false")
        void tamperedCallbackShouldReturnFalse() {
            Map<String, String> params = new TreeMap<>();
            params.put("vnp_Amount", "10000000");
            params.put("vnp_TmnCode", TEST_TMN_CODE);
            params.put("vnp_TxnRef", UUID.randomUUID().toString());
            params.put("vnp_ResponseCode", "00");

            // Tính chữ ký hợp lệ
            String validHash = VnPayUtil.hashAllFields(params, TEST_HASH_SECRET);
            params.put("vnp_SecureHash", validHash);

            // Giả mạo: thay đổi số tiền sau khi ký
            params.put("vnp_Amount", "99999999");

            boolean result = adapter.verifyCallback(params);

            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Tham số rỗng (không có vnp_SecureHash) phải trả về false")
        void emptyParamsShouldReturnFalse() {
            Map<String, String> emptyParams = new HashMap<>();

            boolean result = adapter.verifyCallback(emptyParams);

            assertThat(result).isFalse();
        }
    }
}
