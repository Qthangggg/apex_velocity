import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Failure, Loading, RequireUser } from "@/components/shop-feedback";
import { AddressFields, type AddressValue } from "@/components/address-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { formatPrice, useCart } from "@/lib/cart-context";
import { emptyAddress, errorMessage, getAddresses, placeOrder } from "@/lib/shop-api";
import { useConfirm } from "@/components/confirm-dialog";
import { requireSupabase } from "@/lib/supabase";
import type { CheckoutInput, PaymentMethod, ShopProduct, Variant } from "@/lib/shop-types";
export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Thanh toán — Apex Velocity" }] }),
  component: CheckoutPage,
});
function isAmbiguousCheckoutError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return ![
    "22023",
    "22P02",
    "23502",
    "23503",
    "23505",
    "23514",
    "40001",
    "40P01",
    "42501",
    "P0001",
  ].includes(code);
}
function CheckoutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[65vh] max-w-6xl px-5 py-12">
        <h1 className="mb-10 font-display text-4xl font-black italic">THANH TOÁN</h1>
        <RequireUser>
          <CheckoutForm />
        </RequireUser>
      </main>
      <SiteFooter />
    </>
  );
}
function CheckoutForm() {
  const { user, profile } = useAuth();
  const confirm = useConfirm();
  const currentUserId = user!.id;
  const { items, isReady, clearCart } = useCart();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState<AddressValue>({
    ...emptyAddress,
    recipient: profile?.full_name || "",
    phone: profile?.phone || "",
  });
  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<{
    code: string;
    discount: number;
    subtotal: number;
  } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [success, setSuccess] = useState<{ id: string; method: PaymentMethod } | null>(null);
  const [unresolved, setUnresolved] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [storageReady, setStorageReady] = useState(false);
  const submission = useRef(false);
  const pending = useRef<{ key: string; payload: CheckoutInput } | null>(null);
  const addresses = useQuery({
    queryKey: ["addresses", user!.id],
    queryFn: () => getAddresses(user!.id),
  });
  const stock = useQuery({
    queryKey: ["checkout-stock", items.map((item) => item.variantId)],
    enabled: isReady && items.length > 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error: failure } = await requireSupabase()
        .from("product_variants")
        .select("*,products(*)")
        .in(
          "id",
          items.map((item) => item.variantId),
        )
        .eq("is_active", true);
      if (failure) throw failure;
      return data as (Variant & { products: ShopProduct })[];
    },
  });
  const finishOrder = useCallback(
    (id: string, paymentMethod: PaymentMethod) => {
      setSuccess({ id, method: paymentMethod });
      clearCart();
      pending.current = null;
      setUnresolved(false);
      try {
        sessionStorage.removeItem("apex-pending-" + currentUserId);
      } catch {
        setStorageReady(false);
      }
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
    },
    [clearCart, currentUserId, queryClient],
  );
  useEffect(() => {
    let live = true;
    try {
      const stored = sessionStorage.getItem("apex-pending-" + currentUserId);
      setStorageReady(true);
      if (stored) {
        const saved = JSON.parse(stored) as { key: string; payload: CheckoutInput };
        if (
          saved.payload?.p_request_id &&
          saved.payload.p_address &&
          typeof saved.key === "string"
        ) {
          pending.current = saved;
          setUnresolved(true);
          setAddress(saved.payload.p_address);
          setCoupon(saved.payload.p_coupon_code);
          setNote(saved.payload.p_note);
          setMethod(saved.payload.p_payment_method);
          void requireSupabase()
            .from("orders")
            .select("id,payment_method")
            .eq("user_id", currentUserId)
            .eq("request_id", saved.payload.p_request_id)
            .maybeSingle()
            .then(({ data, error: failure }) => {
              if (!live) return;
              if (data) finishOrder(data.id, data.payment_method);
              else if (failure) setError(failure);
              setRestoring(false);
            });
        } else {
          throw new Error(
            "Dữ liệu yêu cầu đặt hàng tạm không hợp lệ. Hãy kiểm tra đơn hàng và liên hệ cửa hàng trước khi đặt lại.",
          );
        }
      } else {
        setRestoring(false);
      }
    } catch (failure) {
      setError(failure);
      setStorageReady(false);
      setRestoring(false);
    }
    return () => {
      live = false;
    };
  }, [currentUserId, finishOrder]);
  const lines = items.map((item) => ({
    item,
    variant: stock.data?.find((variant) => variant.id === item.variantId),
  }));
  const unavailable = lines.some(
    ({ item, variant }) => !variant?.products?.is_active || variant.stock < item.quantity,
  );
  const subtotal = lines.reduce(
    (sum, { item, variant }) => sum + (variant?.products?.price ?? item.priceValue) * item.quantity,
    0,
  );
  const discount =
    applied?.code === coupon.trim().toUpperCase() && applied.subtotal === subtotal
      ? applied.discount
      : 0;
  const couponValid =
    !coupon.trim() ||
    (applied?.code === coupon.trim().toUpperCase() && applied.subtotal === subtotal);
  const shipping = subtotal >= 1500000 ? 0 : 30000;
  const bankConfigured = Boolean(
    import.meta.env.VITE_BANK_NAME &&
    import.meta.env.VITE_BANK_ACCOUNT_NUMBER &&
    import.meta.env.VITE_BANK_ACCOUNT_HOLDER,
  );
  async function applyCoupon() {
    setCouponBusy(true);
    setError(null);
    setCouponError(null);
    setApplied(null);
    try {
      const { data, error: failure } = await requireSupabase().rpc("preview_coupon", {
        p_code: coupon.trim().toUpperCase(),
        p_subtotal: subtotal,
      });
      if (failure) throw failure;
      setApplied({ code: coupon.trim().toUpperCase(), discount: Number(data), subtotal });
    } catch (failure) {
      setCouponError(errorMessage(failure));
    } finally {
      setCouponBusy(false);
    }
  }
  async function sendPendingRequest() {
    const request = pending.current;
    if (!request || submission.current) return;
    const recovering = unresolved;
    submission.current = true;
    setBusy(true);
    setError(null);
    setUnresolved(true);
    try {
      const id = await placeOrder(request.payload);
      finishOrder(id, request.payload.p_payment_method);
    } catch (failure) {
      setError(failure);
      if (recovering || isAmbiguousCheckoutError(failure)) {
        setUnresolved(true);
      } else {
        pending.current = null;
        setUnresolved(false);
        try {
          sessionStorage.removeItem("apex-pending-" + currentUserId);
        } catch {
          setStorageReady(false);
        }
        void stock.refetch();
      }
    } finally {
      setBusy(false);
      submission.current = false;
    }
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submission.current || unresolved || unavailable || !couponValid) return;
    setError(null);
    const payloadBase = {
      p_items: items.map((item) => ({ variant_id: item.variantId, quantity: item.quantity })),
      p_address: Object.fromEntries(
        Object.entries(address).map(([key, value]) => [key, value.trim()]),
      ) as AddressValue,
      p_payment_method: method,
      p_coupon_code: coupon.trim().toUpperCase(),
      p_note: note.trim(),
      p_expected_total: subtotal - discount + shipping,
    };
    const key = JSON.stringify(payloadBase);
    if (pending.current) {
      setError(
        new Error(
          "Một yêu cầu đặt hàng trước vẫn chưa được xác minh. Vui lòng kiểm tra yêu cầu đó trước khi tạo đơn mới.",
        ),
      );
      setUnresolved(true);
      return;
    }
    pending.current = { key, payload: { ...payloadBase, p_request_id: crypto.randomUUID() } };
    try {
      sessionStorage.setItem("apex-pending-" + currentUserId, JSON.stringify(pending.current));
      setStorageReady(true);
    } catch {
      pending.current = null;
      setStorageReady(false);
      setError(
        new Error(
          "Trình duyệt không thể lưu mã chống gửi trùng, vì vậy cửa hàng chưa gửi yêu cầu. Hãy bật lưu trữ phiên hoặc dùng trình duyệt khác rồi tải lại trang.",
        ),
      );
      return;
    }
    await sendPendingRequest();
  }
  if (success)
    return (
      <section className="border border-primary/30 bg-primary/5 p-8">
        <p className="text-xs font-bold tracking-widest text-primary">ĐẶT HÀNG THÀNH CÔNG</p>
        <h2 className="mt-3 text-2xl font-bold">Cảm ơn bạn đã chọn Apex Velocity</h2>
        <p className="mt-4 break-all">
          Mã đơn: <strong>{success.id}</strong>
        </p>
        <p className="mt-3 text-muted-foreground">
          Đơn hàng đang chờ xác nhận. Chưa có khoản thanh toán nào được xác nhận tự động.
        </p>
        {success.method === "bank_transfer" && (
          <div className="mt-5 space-y-2 border border-border p-5">
            <p>
              {import.meta.env.VITE_BANK_NAME} · {import.meta.env.VITE_BANK_ACCOUNT_NUMBER}
            </p>
            <p>Chủ tài khoản: {import.meta.env.VITE_BANK_ACCOUNT_HOLDER}</p>
            <p>Nội dung: APEX {success.id}</p>
            <p>
              Xem tổng tiền chính xác trong chi tiết đơn hàng trước khi chuyển khoản. Cửa hàng sẽ
              kiểm tra và xác nhận thủ công.
            </p>
          </div>
        )}
        <Button className="mt-6" variant="sport" asChild>
          <Link to="/account">XEM ĐƠN HÀNG</Link>
        </Button>
      </section>
    );
  if (!isReady || restoring) return <Loading />;
  if (unresolved)
    return (
      <section role="alert" className="border border-primary/40 bg-primary/5 p-6">
        <h2 className="text-xl font-bold">Đang xác minh yêu cầu đặt hàng trước</h2>
        <p className="mt-3 leading-6 text-muted-foreground">
          Kết nối có thể đã ngắt sau khi database nhận yêu cầu. Để tránh tạo hai đơn, thông tin này
          đang được khóa và chỉ gửi lại đúng mã yêu cầu cũ.
        </p>
        {pending.current && (
          <p className="mt-3 break-all text-xs text-muted-foreground">
            Mã yêu cầu: {pending.current.payload.p_request_id}
          </p>
        )}
        {error != null && <Failure error={error} />}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="sport"
            disabled={busy || !pending.current}
            onClick={() => void sendPendingRequest()}
          >
            {busy ? "ĐANG KIỂM TRA…" : "KIỂM TRA / GỬI LẠI AN TOÀN"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link to="/account">XEM ĐƠN HÀNG</Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={async () => {
              if (
                !(await confirm({
                  title: "Bỏ mã yêu cầu đang lưu",
                  description:
                    "Chỉ bỏ yêu cầu sau khi đã kiểm tra lịch sử đơn hoặc xác nhận với cửa hàng. Thao tác này KHÔNG hủy đơn đã được tạo; đặt lại có thể tạo đơn thứ hai. Bạn xác nhận muốn bỏ mã yêu cầu đang lưu?",
                  confirmText: "Xác nhận bỏ",
                  variant: "destructive",
                }))
              )
                return;
              try {
                sessionStorage.removeItem("apex-pending-" + currentUserId);
                pending.current = null;
                setUnresolved(false);
                setError(null);
                setApplied(null);
                void stock.refetch();
              } catch (failure) {
                setError(failure);
              }
            }}
          >
            ĐÃ KIỂM TRA — BỎ YÊU CẦU TẠM
          </Button>
        </div>
      </section>
    );
  if (!storageReady)
    return (
      <Failure error="Trình duyệt không cho phép lưu mã chống gửi trùng. Hãy bật lưu trữ phiên hoặc dùng trình duyệt khác rồi tải lại trang." />
    );
  if (!items.length)
    return (
      <p>
        Giỏ hàng trống.{" "}
        <Link to="/shop" className="text-primary underline">
          Tiếp tục mua sắm
        </Link>
      </p>
    );
  return (
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_360px]">
      <fieldset disabled={busy} className="min-w-0 space-y-7">
        <section>
          <h2 className="mb-5 text-lg font-bold">Địa chỉ nhận hàng</h2>
          {addresses.data && addresses.data.length > 0 && (
            <select
              aria-label="Chọn địa chỉ đã lưu"
              className="mb-5 h-12 w-full border border-input bg-background px-3"
              defaultValue=""
              onChange={(event) => {
                const saved = addresses.data?.find((item) => item.id === event.target.value);
                if (saved)
                  setAddress({
                    recipient: saved.recipient,
                    phone: saved.phone,
                    line1: saved.line1,
                    ward: saved.ward,
                    district: saved.district,
                    city: saved.city,
                  });
              }}
            >
              <option value="">Nhập địa chỉ hoặc chọn địa chỉ đã lưu</option>
              {addresses.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.recipient} — {item.line1}, {item.city}
                </option>
              ))}
            </select>
          )}
          {addresses.error && <Failure error={addresses.error} />}
          <AddressFields value={address} onChange={setAddress} />
        </section>
        <section className="border-t border-border pt-6">
          <h2 className="mb-5 text-lg font-bold">Phương thức thanh toán</h2>
          <label className="flex items-start gap-3 border border-border p-4">
            <input
              type="radio"
              name="payment"
              value="cod"
              checked={method === "cod"}
              onChange={() => setMethod("cod")}
              className="mt-1"
            />
            <span>
              Thanh toán khi nhận hàng (COD)
              <small className="mt-1 block text-muted-foreground">
                Trả tiền cho đơn vị giao hàng khi nhận hàng.
              </small>
            </span>
          </label>
          <label className="mt-3 flex items-start gap-3 border border-border p-4">
            <input
              type="radio"
              name="payment"
              value="bank_transfer"
              checked={method === "bank_transfer"}
              disabled={!bankConfigured}
              onChange={() => setMethod("bank_transfer")}
              className="mt-1"
            />
            <span>
              Chuyển khoản ngân hàng
              <small className="mt-1 block text-muted-foreground">
                {bankConfigured
                  ? "Thông tin chuyển khoản hiển thị sau khi đặt hàng. Xác nhận thủ công."
                  : "Cửa hàng chưa cấu hình tài khoản nhận chuyển khoản."}
              </small>
            </span>
          </label>
        </section>
        <div>
          <Label htmlFor="note">Ghi chú đơn hàng</Label>
          <textarea
            id="note"
            className="mt-3 min-h-24 w-full border border-input bg-background p-3"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={500}
          />
        </div>
      </fieldset>
      <aside className="h-fit border border-border p-6">
        <h2 className="mb-5 text-sm font-bold tracking-widest">ĐƠN HÀNG CỦA BẠN</h2>
        {stock.isLoading ? (
          <Loading />
        ) : stock.error ? (
          <Failure error={stock.error} retry={() => void stock.refetch()} />
        ) : (
          <div className="space-y-4">
            {lines.map(({ item, variant }) => (
              <div key={item.key} className="text-sm">
                <div className="flex justify-between gap-4">
                  <span>
                    {item.name} × {item.quantity}
                  </span>
                  <span className="shrink-0">
                    {formatPrice((variant?.products?.price ?? item.priceValue) * item.quantity)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.color} / {item.size}
                </p>
                {(!variant?.products?.is_active || variant.stock < item.quantity) && (
                  <p className="text-destructive">Không đủ tồn kho hoặc đã ngừng bán.</p>
                )}
              </div>
            ))}
          </div>
        )}
        {unavailable && stock.data && (
          <p className="mt-4 text-sm text-destructive">
            Vui lòng{" "}
            <Link to="/cart" className="underline">
              sửa giỏ hàng
            </Link>{" "}
            trước khi tiếp tục.
          </p>
        )}
        <div className="mt-6">
          <Label htmlFor="coupon">Mã giảm giá</Label>
          <div className="mt-2 flex gap-2">
            <Input
              id="coupon"
              value={coupon}
              onChange={(event) => {
                setCoupon(event.target.value.toUpperCase());
                setApplied(null);
                setCouponError(null);
              }}
              maxLength={64}
              disabled={busy}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!coupon.trim() || couponBusy || busy || stock.isLoading || !!stock.error}
              onClick={() => void applyCoupon()}
            >
              {couponBusy ? "…" : "Áp dụng"}
            </Button>
          </div>
          {couponError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {couponError}
            </p>
          )}
          {applied && discount > 0 && (
            <p role="status" className="mt-2 text-xs text-primary">
              Đã áp dụng: −{formatPrice(discount)}
            </p>
          )}
        </div>
        <div className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
          <p className="flex justify-between">
            <span>Tạm tính</span>
            <span>{formatPrice(subtotal)}</span>
          </p>
          <p className="flex justify-between">
            <span>Giảm giá</span>
            <span>−{formatPrice(discount)}</span>
          </p>
          <p className="flex justify-between">
            <span>Giao hàng</span>
            <span>{formatPrice(shipping)}</span>
          </p>
          <p className="flex justify-between text-lg font-bold">
            <span>Tổng dự kiến</span>
            <span>{formatPrice(subtotal - discount + shipping)}</span>
          </p>
        </div>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Hệ thống xác nhận lại giá, mã giảm giá và tồn kho tại thời điểm đặt đơn. Không thu tiền
          trực tuyến.
        </p>
        {error != null && <Failure error={error} />}
        <Button
          type="submit"
          variant="sport"
          size="xl"
          className="mt-6 w-full"
          disabled={busy || stock.isLoading || !!stock.error || unavailable || !couponValid}
        >
          {busy ? "ĐANG ĐẶT HÀNG…" : "XÁC NHẬN ĐẶT HÀNG"}
        </Button>
        {!couponValid && (
          <p className="mt-2 text-xs text-muted-foreground">
            Áp dụng hoặc xóa mã giảm giá trước khi đặt đơn.
          </p>
        )}
      </aside>
    </form>
  );
}
