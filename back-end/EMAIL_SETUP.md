# Email Setup Guide

## Cấu hình Email cho Password Reset

### 1. Thêm vào file `.env`:

```env
# Frontend URL (for email links)
FRONTEND_URL=http://localhost:8080

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 2. Cấu hình Gmail:

**Bước 1:** Bật 2-Step Verification
- Vào: https://myaccount.google.com/security
- Bật "2-Step Verification"

**Bước 2:** Tạo App Password
- Vào: https://myaccount.google.com/apppasswords
- Chọn "Mail" và "Other (Custom name)"
- Nhập tên: "ShoeFam Backend"
- Copy App Password (16 ký tự)

**Bước 3:** Dùng App Password
- `EMAIL_USER`: email của bạn (ví dụ: `yourname@gmail.com`)
- `EMAIL_PASSWORD`: App Password vừa tạo (16 ký tự, không có dấu cách)

### 3. Test:

1. Khởi động server: `npm run dev`
2. Vào `/forgot-password` và nhập email
3. Kiểm tra inbox email để nhận link reset

### Lưu ý:

- App Password chỉ hiện 1 lần, hãy lưu lại
- Trong development, có thể dùng Mailtrap để test

