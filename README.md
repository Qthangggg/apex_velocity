# Apex Velocity

Cửa hàng thể thao tiếng Việt, phát triển trên giao diện hiện có: React 19, TanStack Start, TypeScript, Tailwind và Supabase. Không có đăng nhập hay đơn hàng giả lập.

## Chức năng

- Catalog thật: tìm kiếm, lọc danh mục, sắp xếp, phân trang, ảnh và biến thể màu/kích cỡ/tồn kho.
- Tài khoản: đăng ký, xác nhận email, đăng nhập, khôi phục/đổi mật khẩu, cập nhật hồ sơ và CRUD địa chỉ.
- Giỏ hàng lưu cục bộ; checkout yêu cầu đăng nhập, kiểm tra lại giá/tồn kho/mã giảm giá bằng giao dịch database, có chống gửi trùng và kiểm tra tổng tiền đã hiển thị.
- Thanh toán COD hoặc chuyển khoản xác nhận thủ công; không tích hợp cổng thanh toán trực tuyến và không tự nhận tiền.
- Khách xem đơn của mình, hủy đơn pending/unpaid. Đơn lưu snapshot sản phẩm/địa chỉ để bảo toàn lịch sử.
- Admin: dashboard, CRUD danh mục/sản phẩm/biến thể/mã giảm giá, upload ảnh, quản lý tồn kho/đơn hàng/vai trò/trạng thái khách và danh sách nhận tin.
- Quyền thực thi bằng RLS và RPC PostgreSQL. Không dùng role từ auth metadata hoặc browser làm nguồn quyền.

## Chạy local

Yêu cầu Node.js >=22.16 (đã kiểm tra với Node 24), npm và một Supabase project.

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Mở http://localhost:3000. Nếu chưa điền ENV, trang hiển thị thông báo chờ cấu hình; không tạo tài khoản/đơn giả và không đưa dữ liệu demo vào luồng mua hàng. Thay ENV cần khởi động lại dev hoặc build lại.

## Supabase & ENV

1. Tạo project Supabase của riêng bạn, chạy migration và seed theo [docs/database.md](docs/database.md).
2. Điền trong .env (không commit):

| Biến                          | Bắt buộc             | Nội dung                                                  |
| ----------------------------- | -------------------- | --------------------------------------------------------- |
| VITE_SUPABASE_URL             | Có                   | Project URL, dạng https://PROJECT.supabase.co             |
| VITE_SUPABASE_PUBLISHABLE_KEY | Có                   | Publishable key (sb_publishable_...) hoặc legacy anon key |
| VITE_SITE_URL                 | Có khi deploy        | URL HTTPS chính thức; local http://localhost:3000         |
| VITE_BANK_NAME                | Nếu bật chuyển khoản | Tên ngân hàng                                             |
| VITE_BANK_ACCOUNT_NUMBER      | Nếu bật chuyển khoản | Số tài khoản nhận tiền                                    |
| VITE_BANK_ACCOUNT_HOLDER      | Nếu bật chuyển khoản | Chủ tài khoản                                             |
| VITE_SUPPORT_EMAIL            | Trước mở bán         | Email hỗ trợ công khai                                    |

Mọi VITE_* đều công khai trong bundle. **Không đặt service_role, secret key, database password hoặc SMTP password vào VITE\_*.** Ứng dụng không cần service-role key. Khai báo ngân hàng là thông tin công khai, không phải credential ngân hàng.

3. Auth → URL Configuration: Site URL bằng VITE_SITE_URL; thêm chính xác /account và /reset-password vào redirect allowlist cho localhost và domain production. Không dùng wildcard rộng cho production.
4. Bật email confirmation, cấu hình SMTP production, giới hạn gửi email và cân nhắc CAPTCHA trong Supabase Auth. Google OAuth không nằm trong bản này; không hiển thị nút OAuth giả.
5. Đăng ký tài khoản đầu tiên rồi cấp admin bằng SQL Editor theo docs/database.md. Không có mật khẩu admin mặc định.
6. Bucket product-images được migration tạo. Seed dùng ảnh trong public/images; ảnh upload lưu vào Supabase Storage.

## Deploy Vercel

- Import repository vào Vercel, dùng Node.js 24, npm ci, build npm run build. vercel.json cung cấp cấu hình và security headers.
- Đặt ENV public nêu trên vào đúng Production/Preview. Không dùng database production cho preview không tin cậy.
- Deploy, thêm domain và cập nhật VITE_SITE_URL cùng Supabase Auth redirect allowlist, sau đó redeploy để bundle nhận ENV mới.
- Nitro chọn preset Vercel theo môi trường. Có thể kiểm tra build tương đương bằng NITRO_PRESET=vercel npm run build (PowerShell: $env:NITRO_PRESET='vercel'; npm run build; Remove-Item Env:NITRO_PRESET).
- Không đưa thư mục build từ Windows lên Linux. Hãy để nền tảng build từ source với npm ci.

### Node server / Docker

```sh
npm ci
npm run build
npm start
```

Node output tại .output, cổng mặc định 3000 (cấu hình PORT/HOST của Nitro khi cần). Với Docker, truyền VITE_* bằng build args (public) khi build vì frontend đóng gói ENV tại build time. Đặt reverse proxy HTTPS phía trước Node server.

## Quy tắc nghiệp vụ

- Phí giao hàng 30.000₫; miễn phí khi subtotal trước giảm giá >=1.500.000₫.
- Một mã giảm giá/đơn. Database kiểm tra hạn, lượt dùng, mức tối thiểu; tổng tiền và tồn kho là dữ liệu server.
- Đơn mới pending/unpaid. Admin xác nhận và chuyển trạng thái theo luồng; đánh dấu paid chỉ sau khi thực nhận tiền. Không gọi admin action thay cho hoàn tiền ngân hàng.
- Customer chỉ hủy pending/unpaid; admin hủy theo quy tắc trong RPC. Kho được hoàn một lần, không xóa đơn hoặc sửa snapshot trực tiếp.
- Tài khoản khách quản lý bằng khóa/mở khóa; không xóa bản ghi Auth từ UI. Đổi quyền có bảo vệ admin cuối cùng và tự khóa.
- Newsletter lưu email đăng ký của tài khoản hoạt động, không phải hệ thống gửi chiến dịch email. Admin xóa đăng ký theo yêu cầu.
- Chính sách vận hành, thông tin pháp nhân, giao nhận thực tế và nội dung hỗ trợ cần chủ shop duyệt trước khi mở bán. Không có tích hợp hãng vận chuyển, hoàn tiền tự động, thuế/hóa đơn hoặc thanh toán online.

## Kiểm tra trước mở bán

```sh
npm run typecheck
npm run lint
npm run build
```

Chạy database acceptance theo docs/database.md. Kiểm tra thêm trên Supabase thật:

1. Đăng ký/xác nhận email/đăng nhập/đặt lại mật khẩu; khách không vào được admin.
2. Tạo/sửa/xóa danh mục, sản phẩm chưa có đơn, biến thể, coupon; upload ảnh sai MIME/quá 5MB bị từ chối.
3. Hai khách không đọc/sửa được hồ sơ/địa chỉ/đơn của nhau; không tự nâng quyền qua API.
4. Đặt COD/chuyển khoản, hết hàng, coupon hết hạn, thay giá trước đặt hàng, gửi lại cùng request ID.
5. Hai yêu cầu tranh tồn kho cuối; hủy đơn hai lần không hoàn kho lặp; khóa user chặn checkout.
6. Admin xác nhận/giao/hoàn tất/thanh toán, trạng thái sai bị từ chối. Không hạ quyền admin cuối cùng.
7. Tải lại trang sâu /shop, /account, /admin trên deployment; desktop/mobile không tràn ngang.

Không coi local build hoặc PostgreSQL stub là kiểm thử Supabase Auth/Storage end-to-end. Chưa có project key/domain thì chưa thể xác nhận email, Storage, đơn thật hoặc deployment production.
