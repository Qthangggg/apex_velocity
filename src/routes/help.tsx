import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Hỗ trợ mua hàng — Apex Velocity" }] }),
  component: HelpPage,
});
function HelpPage() {
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 py-12">
        <p className="text-xs font-bold tracking-widest text-primary">CHÚNG TÔI LUÔN SẴN SÀNG</p>
        <h1 className="mb-12 mt-3 font-display text-4xl font-black italic">HỖ TRỢ MUA HÀNG</h1>
        <div className="space-y-10 leading-7">
          <section id="shipping" className="scroll-mt-24">
            <h2 className="mb-3 text-xl font-bold">Giao hàng & thanh toán</h2>
            <p>
              Phí giao hàng tiêu chuẩn là 30.000₫. Đơn có tạm tính trước giảm giá từ 1.500.000₫ được
              miễn phí giao hàng. Điền chính xác địa chỉ và số điện thoại để cửa hàng xác nhận đơn.
            </p>
            <p className="mt-3">
              Bạn có thể chọn thanh toán khi nhận hàng (COD). Chuyển khoản chỉ mở khi cửa hàng đã
              cấu hình thông tin ngân hàng; nội dung và số tiền hiển thị trong đơn hàng. Không có
              xác nhận thanh toán tự động.
            </p>
          </section>
          <section id="returns" className="scroll-mt-24">
            <h2 className="mb-3 text-xl font-bold">Hủy đơn & yêu cầu đổi trả</h2>
            <p>
              Bạn có thể tự hủy đơn đang chờ xác nhận và chưa được ghi nhận thanh toán tại{" "}
              <Link to="/account" className="text-primary underline">
                Tài khoản → Đơn hàng
              </Link>
              . Đơn đã xác nhận, đã thanh toán hoặc đang giao cần liên hệ cửa hàng. Với yêu cầu đổi
              trả, gửi mã đơn và mô tả tình trạng sản phẩm để được hỗ trợ; hệ thống không tự động
              hoàn tiền.
            </p>
          </section>
          <section id="sizes" className="scroll-mt-24">
            <h2 className="mb-3 text-xl font-bold">Chọn kích thước</h2>
            <p>
              Trang sản phẩm liệt kê các tổ hợp màu và kích thước đang bán cùng số lượng còn lại.
              Nếu chưa chắc về kích thước, liên hệ cửa hàng trước khi đặt đơn. Không sử dụng một
              bảng quy đổi chung cho mọi sản phẩm.
            </p>
          </section>
          <section id="privacy" className="scroll-mt-24">
            <h2 className="mb-3 text-xl font-bold">Tài khoản & dữ liệu</h2>
            <p>
              Email được dùng cho đăng nhập và khôi phục tài khoản. Hồ sơ, số điện thoại và địa chỉ
              được dùng để xử lý đơn hàng. Bạn xem và cập nhật hồ sơ, địa chỉ tại trang tài khoản.
              Giỏ hàng được lưu trong trình duyệt; đăng nhập được xử lý qua Supabase Auth.
            </p>
            <p className="mt-3">
              Lịch sử đơn lưu thông tin mua hàng tại thời điểm đặt đơn, nên việc sửa địa chỉ trong
              sổ địa chỉ không thay đổi đơn cũ. Đăng ký nhận tin là tự nguyện; liên hệ cửa hàng để
              ngừng nhận tin hoặc yêu cầu hỗ trợ về dữ liệu tài khoản. Không gửi mật khẩu hoặc mã
              khôi phục cho bất kỳ ai.
            </p>
          </section>
          <section id="contact" className="scroll-mt-24 border border-border p-6">
            <h2 className="mb-3 text-xl font-bold">Liên hệ</h2>
            {supportEmail ? (
              <p>
                Email:{" "}
                <a href={"mailto:" + supportEmail} className="text-primary underline">
                  {supportEmail}
                </a>
              </p>
            ) : (
              <p>
                Cửa hàng đang cập nhật kênh hỗ trợ. Quản trị viên cần cấu hình email hỗ trợ trước
                khi mở bán.
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Khi liên hệ, vui lòng cung cấp mã đơn đầy đủ trong trang tài khoản để tra cứu nhanh.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
