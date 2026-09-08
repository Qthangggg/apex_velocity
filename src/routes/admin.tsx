import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useIsMutating } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { AdminDashboard } from "@/components/admin/dashboard";
import { AdminProducts } from "@/components/admin/products";
import { AdminCategories } from "@/components/admin/categories";
import { AdminCoupons } from "@/components/admin/coupons";
import { AdminOrders } from "@/components/admin/orders";
import { AdminCustomers, AdminNewsletters } from "@/components/admin/people";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Quản trị | Apex Velocity" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminPage,
});

const tabs = [
  ["dashboard", "Tổng quan"],
  ["products", "Sản phẩm"],
  ["categories", "Danh mục"],
  ["coupons", "Mã giảm giá"],
  ["orders", "Đơn hàng"],
  ["customers", "Khách hàng"],
  ["newsletters", "Bản tin"],
] as const;
type AdminTab = (typeof tabs)[number][0];

function AdminPage() {
  const { user, profile, loading, isAdmin, error, refreshProfile } = useAuth();
  const [verifiedUserId, setVerifiedUserId] = useState<string | null>(null);
  const currentUserId = user?.id ?? null;
  useEffect(() => {
    if (!currentUserId) return;
    let mounted = true;
    void refreshProfile().finally(() => {
      if (mounted) setVerifiedUserId(currentUserId);
    });
    return () => {
      mounted = false;
    };
  }, [currentUserId, refreshProfile]);
  let message = "";
  if (!supabase)
    message =
      "Chưa cấu hình Supabase. Hãy thiết lập VITE_SUPABASE_URL và VITE_SUPABASE_PUBLISHABLE_KEY, sau đó tải lại ứng dụng.";
  else if (loading || (currentUserId && currentUserId !== verifiedUserId))
    message = "Đang xác thực quyền quản trị…";
  else if (!user) message = "Vui lòng đăng nhập bằng tài khoản quản trị để tiếp tục.";
  else if (error) message = error;
  else if (!isAdmin || !profile?.is_active)
    message = "Bạn không có quyền truy cập trang quản trị hoặc tài khoản đã bị khóa.";

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="border-b bg-foreground text-background">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <a href="/" className="text-xl font-black italic tracking-tighter">
            APEX<span className="text-primary"> VELOCITY</span>
          </a>
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
            <ShieldCheck size={16} className="text-primary" /> Trung tâm quản trị
          </span>
          <a href="/" className="flex items-center gap-2 text-sm hover:underline">
            <ArrowLeft size={16} /> Về cửa hàng
          </a>
        </div>
      </header>
      {message && (
        <main className="mx-auto max-w-2xl space-y-5 px-4 py-20">
          <h1 className="text-3xl font-extrabold uppercase">Quản trị cửa hàng</h1>
          <p
            role={loading && supabase ? "status" : "alert"}
            className="border-l-4 border-primary bg-muted p-5"
          >
            {message}
          </p>
          {!loading && !user && supabase && (
            <a
              href="/login"
              className="inline-block bg-primary px-6 py-3 font-semibold text-primary-foreground"
            >
              Đăng nhập
            </a>
          )}
        </main>
      )}
      {user && isAdmin && !error && currentUserId === verifiedUserId && (
        <div hidden={Boolean(message)} inert={Boolean(message)} aria-hidden={Boolean(message)}>
          <AdminWorkspace key={user.id} />
        </div>
      )}
    </div>
  );
}

function AdminWorkspace() {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const mutations = useIsMutating();
  const { profile } = useAuth();
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Apex / Operations
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tight sm:text-5xl">
            Quản trị cửa hàng
          </h1>
        </div>
        <p className="max-w-sm break-words text-sm text-muted-foreground">
          Xin chào, {profile?.full_name || "quản trị viên"}
        </p>
      </div>
      <nav aria-label="Chức năng quản trị" className="mb-8 flex flex-wrap gap-1 border-b pb-3">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            disabled={mutations > 0}
            aria-current={tab === value ? "page" : undefined}
            onClick={() => {
              if (
                tab !== value &&
                (tab === "products" ||
                  tab === "categories" ||
                  tab === "coupons" ||
                  tab === "orders" ||
                  tab === "customers") &&
                !window.confirm("Chuyển mục? Những thay đổi chưa bấm lưu sẽ bị bỏ qua.")
              )
                return;
              setTab(value);
            }}
            className={
              "min-h-11 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-50 " +
              (tab === value ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted")
            }
          >
            {label}
          </button>
        ))}
      </nav>
      <div key={tab}>
        {tab === "dashboard" && <AdminDashboard />}
        {tab === "products" && <AdminProducts />}
        {tab === "categories" && <AdminCategories />}
        {tab === "coupons" && <AdminCoupons />}
        {tab === "orders" && <AdminOrders />}
        {tab === "customers" && <AdminCustomers />}
        {tab === "newsletters" && <AdminNewsletters />}
      </div>
    </main>
  );
}
