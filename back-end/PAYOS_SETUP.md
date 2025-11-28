# PayOS Integration Setup Guide

## Cấu hình PayOS cho Payment Gateway

### 1. Đăng ký tài khoản PayOS

1. Truy cập: https://my.payos.vn/login
2. Đăng ký tài khoản mới
3. Xác thực tổ chức/cá nhân theo hướng dẫn

### 2. Tạo Kênh Thanh Toán

1. Vào mục **"Kênh thanh toán"** trong dashboard
2. Nhấn **"Tạo kênh thanh toán"**
3. Điền thông tin:
   - Tên kênh: ShoeFam Store
   - Logo (tùy chọn)
   - Chọn ngân hàng chính
4. Sau khi tạo, bạn sẽ nhận được:
   - **Client ID**
   - **API Key**
   - **Checksum Key**

### 3. Cấu hình Webhook

1. Trong kênh thanh toán, tìm mục **"Webhook"**
2. Nhập Webhook URL:
   ```
   https://your-domain.com/api/orders/payos/webhook
   ```
   **Cho development với ngrok** (URL sẽ thay đổi mỗi lần chạy ngrok):
   ```
   https://rosia-jarless-jenice.ngrok-free.dev/api/orders/payos/webhook
   ```
   ⚠️ **Lưu ý**: URL ngrok thay đổi mỗi lần bạn restart ngrok. Cần cập nhật lại trong PayOS dashboard.
3. Lưu cấu hình

### 4. Thêm vào file `.env`

Thêm các biến sau vào file `back-end/.env`:

```env
# PayOS Configuration
PAYOS_CLIENT_ID=your_client_id_here
PAYOS_API_KEY=your_api_key_here
PAYOS_CHECKSUM_KEY=your_checksum_key_here

# Frontend URL (đã có sẵn)
FRONTEND_URL=http://localhost:8080
```

### 5. Test Integration

1. Khởi động backend: `npm run dev`
2. Tạo order với payment method = "payos"
3. Kiểm tra:
   - Order được tạo với payment link trong metadata
   - Redirect đến PayOS payment page
   - Sau khi thanh toán, webhook được gọi
   - Order status được cập nhật thành "paid"

### 6. Lưu ý

- **Order Code**: PayOS yêu cầu orderCode là số nguyên (6 chữ số). Code tự động lấy 6 số cuối của orderId
- **Webhook**: Đảm bảo webhook URL có thể truy cập được từ internet (dùng ngrok cho local testing)
- **Return URL**: User sẽ được redirect về `/orders/{orderId}?payment=success` sau khi thanh toán
- **Cancel URL**: User sẽ được redirect về `/checkout?payment=cancelled` nếu hủy thanh toán

### 7. Testing với ngrok (Local Development)

```bash
# Cài đặt ngrok
npm install -g ngrok

# Chạy ngrok
ngrok http 4000

# Copy HTTPS URL và cập nhật webhook trong PayOS dashboard
# Ví dụ: https://abc123.ngrok.io/api/orders/payos/webhook
```

### 8. Troubleshooting

#### Lỗi "Missing credentials"
- **Nguyên nhân**: PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY chưa được cấu hình trong .env
- **Giải pháp**: 
  1. Kiểm tra file `back-end/.env` có đầy đủ 3 biến trên
  2. Đảm bảo không có khoảng trắng thừa hoặc dấu ngoặc kép
  3. Restart backend server sau khi sửa .env

#### Lỗi "Cổng thanh toán không tồn tại hoặc đã tạm dừng" (code: 214)
- **Nguyên nhân**: Kênh thanh toán trong PayOS dashboard chưa được kích hoạt hoặc credentials không đúng
- **Giải pháp**:
  1. Đăng nhập PayOS Dashboard: https://my.payos.vn/login
  2. Vào mục **"Kênh thanh toán"** (Payment Channels)
  3. Kiểm tra:
     - Kênh thanh toán có trạng thái **"Active"** (Đang hoạt động)
     - Kênh thanh toán chưa bị **"Tạm dừng"** (Paused) hoặc **"Xóa"** (Deleted)
  4. Nếu kênh chưa active:
     - Click vào kênh thanh toán
     - Nhấn **"Kích hoạt"** (Activate) hoặc **"Kích hoạt lại"** (Reactivate)
  5. Kiểm tra credentials:
     - Vào **"Cài đặt"** (Settings) hoặc **"Thông tin kênh"** (Channel Info)
     - Copy lại **Client ID**, **API Key**, **Checksum Key**
     - So sánh với file `.env` để đảm bảo chính xác
  6. Nếu đã tạo kênh mới:
     - Copy credentials mới vào `.env`
     - Restart backend server
  7. Nếu vẫn lỗi:
     - Kiểm tra xem có nhiều kênh thanh toán không
     - Đảm bảo đang dùng đúng kênh (kênh đang active)
     - Liên hệ PayOS support nếu cần

#### Webhook không nhận được
- **Nguyên nhân**: URL webhook không đúng hoặc không accessible
- **Giải pháp**:
  1. Kiểm tra ngrok đang chạy: `ngrok http 4000`
  2. Copy HTTPS URL từ ngrok (ví dụ: `https://abc123.ngrok-free.dev`)
  3. Cập nhật webhook URL trong PayOS dashboard: `https://abc123.ngrok-free.dev/api/orders/payos/webhook`
  4. Test webhook URL: Truy cập `https://abc123.ngrok-free.dev/api/orders/payos/webhook/test` trong browser
  5. Kiểm tra backend logs khi PayOS gửi webhook

#### Payment link không tạo được
- **Nguyên nhân**: orderCode không đúng format hoặc dữ liệu không hợp lệ
- **Giải pháp**:
  1. Kiểm tra orderCode là số nguyên 10 chữ số (tự động generate từ timestamp)
  2. Kiểm tra amount phải là số nguyên (đã được round)
  3. Kiểm tra items array không rỗng
  4. Kiểm tra returnUrl và cancelUrl là URL hợp lệ

