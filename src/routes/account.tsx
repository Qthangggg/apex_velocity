import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Failure, Loading, RequireUser } from "@/components/shop-feedback";
import { AddressFields, type AddressValue } from "@/components/address-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { useAuth } from "@/lib/auth-context";
import { formatPrice } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { emptyAddress, getAddresses, getOrders, orderLabels } from "@/lib/shop-api";
import { useConfirm } from "@/components/confirm-dialog";
import { requireSupabase } from "@/lib/supabase";
import type { Address, Order } from "@/lib/shop-types";

export const Route = createFileRoute("/account")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => {
    const tab = search["tab"];
    return typeof tab === "string" ? { tab } : {};
  },
  head: () => ({ meta: [{ title: "Tài khoản của tôi — Apex Velocity" }] }),
  component: AccountPage,
});
function AccountPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[65vh] max-w-6xl px-5 py-12">
        <h1 className="mb-10 font-display text-4xl font-black italic">TÀI KHOẢN CỦA TÔI</h1>
        <RequireUser>
          <AccountContent />
        </RequireUser>
      </main>
      <SiteFooter />
    </>
  );
}
function AccountContent() {
  const { user, profile, isAdmin, signOut, refreshProfile } = useAuth();
  const search = Route.useSearch();
  const [tab, setTab] = useState(search?.tab || "orders");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<unknown>(null);
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const { error: failure } = await requireSupabase().rpc("update_my_profile", {
        p_full_name: String(form.get("full_name")).trim(),
        p_phone: String(form.get("phone")).trim(),
      });
      if (failure) throw failure;
      await refreshProfile();
      setMessage("Đã cập nhật hồ sơ.");
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xl font-semibold">Xin chào, {profile!.full_name || "bạn"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{user!.email}</p>
        </div>
        <div className="flex gap-3">
          {isAdmin && (
            <Button variant="sport" asChild>
              <Link to="/admin">QUẢN TRỊ</Link>
            </Button>
          )}
          <Button
            variant="outline"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await signOut();
              } catch (failure) {
                setError(failure);
              } finally {
                setBusy(false);
              }
            }}
          >
            Đăng xuất
          </Button>
        </div>
      </div>
      <div className="mb-8 flex flex-wrap gap-3">
        {[
          { id: "orders", name: "Đơn hàng" },
          { id: "wishlist", name: "Yêu thích" },
          { id: "profile", name: "Hồ sơ" },
          { id: "addresses", name: "Sổ địa chỉ" },
        ].map((item) => (
          <Button
            key={item.id}
            variant={tab === item.id ? "sport" : "outline"}
            onClick={() => {
              setTab(item.id);
              setError(null);
              setMessage("");
            }}
          >
            {item.name}
          </Button>
        ))}
      </div>
      {error != null && <Failure error={error} />}
      {message && (
        <p role="status" className="mb-4 text-primary">
          {message}
        </p>
      )}
      {tab === "orders" && <OrdersPanel />}
      {tab === "wishlist" && <WishlistPanel />}
      {tab === "addresses" && <AddressesPanel />}
      {tab === "profile" && (
        <form onSubmit={saveProfile} className="max-w-xl space-y-5" key={profile!.id}>
          <div className="space-y-2">
            <Label htmlFor="full_name">Họ và tên</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={profile!.full_name}
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile!.phone}
              pattern="[+0-9 ()-]{8,20}"
              maxLength={20}
              autoComplete="tel"
            />
          </div>
          <Button variant="sport" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu hồ sơ"}
          </Button>
          <Link to="/reset-password" className="ml-5 text-sm text-primary underline">
            Đổi mật khẩu
          </Link>
        </form>
      )}
    </>
  );
}

function WishlistPanel() {
  const { wishlistItems, count } = useWishlist();

  if (count === 0) {
    return (
      <div className="border border-dashed border-border py-16 text-center">
        <Heart size={40} className="mx-auto mb-3 text-muted-foreground" />
        <h3 className="font-display text-xl font-bold uppercase italic">
          Danh sách yêu thích trống
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Hãy lưu các trang phục hoặc giày bạn yêu thích để dễ dàng mua sắm sau này.
        </p>
        <Button variant="sport" className="mt-6" asChild>
          <Link to="/shop">Khám phá bộ sưu tập</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold uppercase italic">
          Sản phẩm đã lưu ({count})
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
        {wishlistItems.map((item) =>
          item.products ? <ProductCard key={item.product_id} product={item.products} /> : null,
        )}
      </div>
    </div>
  );
}
function AddressesPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const addresses = useQuery({
    queryKey: ["addresses", user!.id],
    queryFn: () => getAddresses(user!.id),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState<AddressValue>({ ...emptyAddress });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const confirm = useConfirm();
  function edit(address?: Address) {
    setEditing(address?.id ?? null);
    setValue(
      address
        ? {
            recipient: address.recipient,
            phone: address.phone,
            line1: address.line1,
            ward: address.ward,
            district: address.district,
            city: address.city,
          }
        : { ...emptyAddress },
    );
    setOpen(true);
    setError(null);
    setMessage("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const payload = Object.fromEntries(
      Object.entries(value).map(([key, text]) => [key, text.trim()]),
    );
    try {
      const result = editing
        ? await requireSupabase()
            .from("addresses")
            .update(payload)
            .eq("id", editing)
            .eq("user_id", user!.id)
            .select("id")
            .single()
        : await requireSupabase()
            .from("addresses")
            .insert({ ...payload, user_id: user!.id })
            .select("id")
            .single();
      const { error: failure } = result;
      if (failure) throw failure;
      await queryClient.invalidateQueries({ queryKey: ["addresses", user!.id] });
      setOpen(false);
      setMessage("Đã lưu địa chỉ.");
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (
      !(await confirm({
        title: "Xóa địa chỉ",
        description: "Bạn có chắc muốn xóa địa chỉ giao hàng này?",
        confirmText: "Xóa địa chỉ",
        variant: "destructive",
      }))
    )
      return;
    setBusy(true);
    setError(null);
    try {
      const { error: failure } = await requireSupabase()
        .from("addresses")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id)
        .select("id")
        .single();
      if (failure) throw failure;
      await addresses.refetch();
      setMessage("Đã xóa địa chỉ.");
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold">Địa chỉ giao hàng</h2>
        <Button variant="sport" disabled={busy} onClick={() => edit()}>
          Thêm địa chỉ
        </Button>
      </div>
      {error != null && <Failure error={error} />}
      {message && (
        <p role="status" className="mb-4 text-primary">
          {message}
        </p>
      )}
      {open && (
        <form onSubmit={save} className="mb-8 border border-border p-5">
          <fieldset disabled={busy}>
            <h3 className="mb-5 font-bold">{editing ? "Sửa địa chỉ" : "Địa chỉ mới"}</h3>
            <AddressFields value={value} onChange={setValue} />
            <div className="mt-5 flex gap-3">
              <Button variant="sport" disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu địa chỉ"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {addresses.isLoading ? (
        <Loading />
      ) : addresses.error ? (
        <Failure error={addresses.error} retry={() => void addresses.refetch()} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.data?.map((address) => (
            <article key={address.id} className="border border-border p-5">
              <h3 className="font-semibold">
                {address.recipient} · {address.phone}
              </h3>
              <p className="my-3 text-sm leading-6 text-muted-foreground">
                {[address.line1, address.ward, address.district, address.city]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" disabled={busy} onClick={() => edit(address)}>
                  Sửa
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => void remove(address.id)}>
                  Xóa
                </Button>
              </div>
            </article>
          ))}
          {!addresses.data?.length && (
            <p className="py-8 text-muted-foreground">Bạn chưa lưu địa chỉ nào.</p>
          )}
        </div>
      )}
    </section>
  );
}
function OrdersPanel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const orders = useQuery({
    queryKey: ["orders", user!.id, page],
    queryFn: () => getOrders(user!.id, page),
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const confirm = useConfirm();
  async function cancel(order: Order) {
    if (
      !(await confirm({
        title: "Hủy đơn hàng",
        description: "Bạn có chắc muốn hủy đơn hàng đang chờ xác nhận này?",
        confirmText: "Hủy đơn hàng",
        variant: "destructive",
      }))
    )
      return;
    setBusy(order.id);
    setError(null);
    try {
      const { error: failure } = await requireSupabase().rpc("cancel_order", {
        p_order_id: order.id,
      });
      if (failure) throw failure;
      await orders.refetch();
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["product"] });
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(null);
    }
  }
  if (orders.isLoading) return <Loading />;
  if (orders.error) return <Failure error={orders.error} retry={() => void orders.refetch()} />;
  return (
    <section>
      {error != null && <Failure error={error} />}
      {!orders.data?.orders.length && (
        <div className="border border-border p-10 text-center">
          <p className="mb-5 text-muted-foreground">Chưa có đơn hàng nào.</p>
          <Button variant="sport" asChild>
            <Link to="/shop">Khám phá sản phẩm</Link>
          </Button>
        </div>
      )}
      <div className="space-y-5">
        {orders.data?.orders.map((order) => (
          <details key={order.id} className="border border-border p-5">
            <summary className="cursor-pointer">
              <span className="inline-flex w-full flex-wrap justify-between gap-4 align-middle">
                <span>
                  <strong className="block">Đơn #{order.id.slice(0, 8).toUpperCase()}</strong>
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("vi-VN")}
                  </span>
                </span>
                <span className="text-right">
                  <strong className="block">{formatPrice(order.total)}</strong>
                  <span className="text-sm text-primary">{orderLabels[order.status]}</span>
                </span>
              </span>
            </summary>
            <div className="mt-6 space-y-4 border-t border-border pt-5">
              <p className="break-all text-xs text-muted-foreground">Mã đầy đủ: {order.id}</p>
              {order.order_items.map((item) => (
                <div className="flex gap-4 text-sm" key={item.id}>
                  <img
                    src={item.image || "/images/category-running.jpg"}
                    alt={item.product_name}
                    className="h-16 w-16 object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-semibold">{item.product_name}</p>
                    <p className="text-muted-foreground">
                      {item.color} / {item.size} × {item.quantity}
                    </p>
                  </div>
                  <p>{formatPrice(item.unit_price * item.quantity)}</p>
                </div>
              ))}
              <div className="grid gap-5 border-t border-border pt-4 sm:grid-cols-2">
                <div className="text-sm leading-6">
                  <p className="font-semibold">Địa chỉ giao hàng</p>
                  <p>
                    {order.shipping_address.recipient} · {order.shipping_address.phone}
                  </p>
                  <p>
                    {[
                      order.shipping_address.line1,
                      order.shipping_address.ward,
                      order.shipping_address.district,
                      order.shipping_address.city,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {order.note && <p className="mt-2">Ghi chú: {order.note}</p>}
                </div>
                <div className="space-y-2 text-sm">
                  <p>Tạm tính: {formatPrice(order.subtotal)}</p>
                  <p>
                    Giảm giá: −{formatPrice(order.discount)}{" "}
                    {order.coupon_code && "(" + order.coupon_code + ")"}
                  </p>
                  <p>Vận chuyển: {formatPrice(order.shipping_fee)}</p>
                  <p className="font-semibold">Tổng: {formatPrice(order.total)}</p>
                  <p>
                    {order.payment_method === "cod" ? "COD" : "Chuyển khoản"} ·{" "}
                    {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa xác nhận thanh toán"}
                  </p>
                </div>
              </div>
              {order.payment_method === "bank_transfer" &&
                order.payment_status === "unpaid" &&
                order.status !== "cancelled" && (
                  <div className="border border-border p-4 text-sm leading-6">
                    <p>Ngân hàng: {import.meta.env.VITE_BANK_NAME || "Liên hệ cửa hàng"}</p>
                    <p>
                      Số tài khoản: {import.meta.env.VITE_BANK_ACCOUNT_NUMBER || "Chưa cấu hình"}
                    </p>
                    <p>
                      Chủ tài khoản: {import.meta.env.VITE_BANK_ACCOUNT_HOLDER || "Chưa cấu hình"}
                    </p>
                    <p className="break-all">Nội dung: APEX {order.id}</p>
                    <p>Chuyển đúng {formatPrice(order.total)}. Cửa hàng xác nhận thủ công.</p>
                  </div>
                )}
              {order.status === "pending" && order.payment_status === "unpaid" && (
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void cancel(order)}
                >
                  {busy === order.id ? "Đang hủy…" : "Hủy đơn hàng"}
                </Button>
              )}
            </div>
          </details>
        ))}
      </div>
      {(orders.data?.count ?? 0) > 10 && (
        <div className="mt-6 flex justify-center gap-4">
          <Button variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>
            Trang trước
          </Button>
          <span className="self-center">{page + 1}</span>
          <Button
            variant="outline"
            disabled={(page + 1) * 10 >= (orders.data?.count ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </Button>
        </div>
      )}
    </section>
  );
}
