# HƯỚNG DẪN CÀI ĐẶT & CHẠY HỆ THỐNG QUẢN LÝ XUẤT NHẬP KHẨU (XNK)

Tài liệu này hướng dẫn chi tiết từng bước để khởi động, kiểm thử và vận hành hệ thống Quản lý Xuất Nhập Khẩu (XNK) từ môi trường phát triển (Local) đến triển khai Production trên máy chủ Linux/Ubuntu.

---

## 1. TỔNG QUAN KIẾN TRÚC & CÔNG NGHỆ

Hệ thống được xây dựng theo mô hình **Clean Architecture**:
- **Backend**: ASP.NET Core 8 Web API (C#)
  - `XNK.Core`: Domain Entities, DTOs, Enums, Interfaces.
  - `XNK.Infrastructure`: EF Core 8, PostgreSQL Provider, Repositories, Services (Auth, Search, File Storage), Seeder.
  - `XNK.API`: Controllers, JWT Bearer Middleware, Swagger UI.
- **Database**: PostgreSQL 16 (chạy qua Docker Compose).
- **Authentication**: JWT Access Token (hạn 8 tiếng) + Refresh Token (7 ngày) + Phân quyền RBAC.
- **Frontend**: Angular 18+ (Standalone components, theme Sáng/Tối, đa ngôn ngữ Việt - Anh - Trung).

---

## 2. YÊU CẦU MÔI TRƯỜNG (PREREQUISITES)

Trước khi chạy, máy tính của bạn cần cài đặt:
1. **.NET 8 SDK**: Kiểm tra bằng lệnh `dotnet --version` (Kết quả `>= 8.0.x`).
2. **Docker Desktop** (hoặc Docker Engine trên Linux): Kiểm tra bằng `docker --version`.
3. **Node.js 18+ & npm**: Kiểm tra bằng `node -v` và `npm -v`.

---

## 3. BƯỚC 1: KHỞI ĐỘNG CƠ SỞ DỮ LIỆU POSTGRESQL

Tại thư mục gốc dự án `d:\CODE\XNK\`, chạy lệnh Docker Compose:

```bash
docker-compose up -d
```

### Kiểm tra container database:
```bash
docker ps
```
Bạn sẽ thấy container `xnk_postgres` đang chạy ở trạng thái `healthy` tại cổng `5432`.

> **Thông số kết nối mặc định:**
> - **Host**: `localhost`
> - **Port**: `5432`
> - **Database**: `xnk_db`
> - **Username**: `xnk_admin`
> - **Password**: `XnkAdmin@2026`

---

## 4. BƯỚC 2: KHỞI CHẠY BACKEND (.NET 8 WEB API)

Mở terminal tại thư mục `d:\CODE\XNK\`:

```bash
dotnet run --project backend/XNK.API --urls=http://localhost:5000
```

### Cơ chế tự động khi khởi động Backend:
1. **Auto-Migrate**: Hệ thống tự động tạo và cập nhật toàn bộ 21 bảng dữ liệu vào PostgreSQL nếu chưa có.
2. **Auto-Seed Data**: Hệ thống tự động nạp sẵn tài khoản Admin và bộ dữ liệu mẫu thực tế:
   - **Tài khoản Admin**: `admin` / Mật khẩu: `Admin@123`
   - **Nhà cung cấp mẫu**: `LONG CHENG WU TEXTILE CO., LTD` (Đài Loan), `FORMOSA TAFFETA CO., LTD`.
   - **Khách hàng mẫu**: `CÔNG TY TNHH DỆT MAY VIỆT NAM (VINTEX)`.
   - **Sản phẩm mẫu**: Sợi Polyester FDY 100D/36F Semi Dull (`YARN-FDY-10036-SD`), Sợi DTY 150D/48F (`YARN-DTY-15048-BR`), Sợi POY (`YARN-POY-25072-SD`).
   - **Lô hàng & Invoice thực tế**: Lô nhập `SHP-20260806-LCW`, Hóa đơn thương mại `INV-LCW-26073`, Packing List `PL-LCW-26073`.

Khi thấy thông báo:
```text
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:5000
```
Backend đã sẵn sàng nhận kết nối!

---

## 5. BƯỚC 3: TRUY CẬP VÀ KIỂM THỬ TRÊN SWAGGER UI

Mở trình duyệt web và truy cập địa chỉ:
👉 **[http://localhost:5000/swagger](http://localhost:5000/swagger)**

### Các bước xác thực trên Swagger:
1. Kéo xuống mục **Auth**, mở endpoint `POST /api/auth/login`.
2. Bấm **Try it out**, nhập JSON đăng nhập:
   ```json
   {
     "username": "admin",
     "password": "Admin@123"
   }
   ```
3. Bấm **Execute**. Copy chuỗi `accessToken` trong kết quả trả về.
4. Kéo lên góc trên bên phải trang Swagger, bấm nút **Authorize** (hình ổ khóa).
5. Nhập chuỗi token vừa copy theo định dạng:
   ```text
   Bearer YOUR_ACCESS_TOKEN_HERE
   ```
6. Bấm **Authorize** -> **Close**. Bây giờ bạn có thể thử nghiệm mọi endpoint có ổ khóa bảo vệ!

---

## 6. BƯỚC 4: HƯỚNG DẪN GỌI API BẰNG CURL / POWERSHELL

### 1. Đăng nhập lấy Token
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"Admin@123\"}"
```

### 2. Xem thống kê Dashboard
```bash
curl -X GET http://localhost:5000/api/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```
*Kết quả trả về: Tổng kim ngạch nhập/xuất, số lô hàng đang xử lý, biểu đồ theo tháng, 10 lô hàng gần nhất.*

### 3. Xem danh sách Sản phẩm
```bash
curl -X GET "http://localhost:5000/api/products?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Tra cứu lịch sử nhập/xuất của sản phẩm (Tính năng mục 4.3)
```bash
curl -X GET "http://localhost:5000/api/products/{PRODUCT_ID}/history" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
*Kết quả trả về: Tổng số lần nhập/xuất, đơn giá nhập gần nhất, giá bình quân, danh sách chi tiết kèm số Invoice, số Lô hàng, tên Nhà cung cấp, ngày nhập.*

### 5. Tìm kiếm Global (Toàn hệ thống)
```bash
curl -X GET "http://localhost:5000/api/search?keyword=LCW" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
*Tìm kiếm tức thì trên cả Sản phẩm, Lô hàng, Hóa đơn, Nhà cung cấp và Khách hàng.*

### 6. Tạo Đơn mua hàng PO (Purchase Order)
```bash
curl -X POST http://localhost:5000/api/orders/purchase \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "poNumber": "PO-2026-001",
    "poDate": "2026-09-22T00:00:00Z",
    "currency": "USD",
    "deliveryTerm": "CIF",
    "supplierId": "SUPPLIER_GUID_HERE",
    "items": [
      {
        "productId": "PRODUCT_GUID_HERE",
        "quantity": 10000,
        "unitPrice": 2.25
      }
    ]
  }'
```

### 7. Upload chứng từ file (B/L, C/O, Hóa đơn scan)
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/BL_SIGN.pdf" \
  -F "category=BillOfLading" \
  -F "shipmentId=SHIPMENT_GUID_HERE" \
  -F "description=Vận đơn gốc đã ký"
```

---

## 7. BƯỚC 5: HƯỚNG DẪN CHẠY FRONTEND (ANGULAR)

Frontend được cấu hình chạy cổng `4200` (đã được cấu hình sẵn CORS trong backend).

### Khởi tạo & Cài đặt dependencies:
```bash
cd frontend
npm install
```

### Khởi chạy môi trường phát triển:
```bash
npm start
# hoặc: npx ng serve --port 4200
```
Mở trình duyệt: 👉 **http://localhost:4200**

---

## 8. BƯỚC 6: XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Trùng cổng 5432 (PostgreSQL)
- **Nguyên nhân**: Máy tính đã có dịch vụ PostgreSQL cục bộ đang chạy.
- **Khắc phục**: Đổi cổng ngoài trong `docker-compose.yml`:
  ```yaml
  ports:
    - "5433:5432"
  ```
  Sau đó sửa chuỗi kết nối trong `backend/XNK.API/appsettings.json`:
  `Port=5433;`

### 2. Lỗi 401 Unauthorized khi gọi API
- **Nguyên nhân**: Quên truyền Header `Authorization: Bearer <TOKEN>` hoặc Token đã hết hạn.
- **Khắc phục**: Gọi lại API `POST /api/auth/login` để lấy Token mới hoặc dùng `POST /api/auth/refresh-token`.

### 3. Reset lại toàn bộ dữ liệu mẫu
Nếu muốn xóa sạch database và để hệ thống tự tạo lại từ đầu:
```bash
docker-compose down -v
docker-compose up -d
dotnet run --project backend/XNK.API
```

---

## 9. BƯỚC 7: HƯỚNG DẪN DEPLOY PRODUCTION TRÊN UBUNTU 24.04 LTS

### 1. Cài đặt Docker & Docker Compose trên Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
```

### 2. Copy mã nguồn lên server
```bash
git clone https://github.com/your-org/XNK.git /opt/xnk
cd /opt/xnk
```

### 3. Cấu hình biến môi trường bảo mật
Tạo file `.env` trên VPS:
```env
DB_PASSWORD=MatKhauDatabaseSieuBaoMat_2026!
JWT_KEY=ChuoiKhoaBaoMatJWTCucKyDaiToiThieu64KyTuDeBaoMatTuyetDoi2026!
```

### 4. Build và khởi động bằng Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 5. Cấu hình Nginx Reverse Proxy & SSL Let's Encrypt
Tạo file cấu hình `/etc/nginx/sites-available/xnk.conf`:
```nginx
server {
    server_name xnk.yourcompany.com;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:4200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Kích hoạt SSL miễn phí:
```bash
sudo ln -s /etc/nginx/sites-available/xnk.conf /etc/nginx/sites-enabled/
sudo certbot --nginx -d xnk.yourcompany.com
sudo systemctl restart nginx
```
---
Hệ thống hoàn tất cài đặt và sẵn sàng vận hành!
