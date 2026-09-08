import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { isConfigured } from "@/lib/supabase";
import { errorMessage } from "@/lib/shop-api";
import { Button } from "./ui/button";

export function SetupNotice() {
  return (
    <div role="status" className="border border-primary/30 bg-primary/5 p-5 text-sm leading-6">
      <strong>Cửa hàng đang chờ kết nối dữ liệu.</strong>
      <p>
        Quản trị viên cần cấu hình Supabase và khởi tạo database theo README. Tài khoản, sản phẩm và
        thanh toán sẽ hoạt động sau khi kết nối.
      </p>
    </div>
  );
}
export function Failure({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="my-4 border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <p>{errorMessage(error)}</p>
      {retry && (
        <Button type="button" variant="outline" className="mt-3" onClick={retry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <p role="status" className="py-12 text-center text-muted-foreground">
      Đang tải…
    </p>
  );
}
export function RequireUser({ children }: { children: ReactNode }) {
  const { user, profile, loading, error, refreshProfile, signOut } = useAuth();
  if (!isConfigured) return <SetupNotice />;
  if (loading) return <Loading />;
  if (!user)
    return (
      <div className="border border-border p-8 text-center">
        <h2 className="text-xl font-bold">Đăng nhập để tiếp tục</h2>
        <p className="my-4 text-muted-foreground">Quản lý tài khoản và đặt hàng an toàn.</p>
        <Button variant="sport" asChild>
          <Link to="/login">Đăng nhập</Link>
        </Button>
      </div>
    );
  if (error || !profile)
    return (
      <Failure
        error={error || "Không tìm thấy hồ sơ tài khoản."}
        retry={() => void refreshProfile()}
      />
    );
  if (!profile.is_active)
    return (
      <div role="alert" className="border border-border p-8">
        <h2 className="font-bold">Tài khoản đã bị tạm khóa</h2>
        <p className="my-3">Vui lòng liên hệ cửa hàng để được hỗ trợ.</p>
        <Button onClick={() => void signOut()}>Đăng xuất</Button>
      </div>
    );
  return children;
}
