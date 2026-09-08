import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { requireSupabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/cart-context";
import type { Coupon } from "@/lib/shop-types";
import {
  ActiveBadge,
  Check,
  ErrorNotice,
  Field,
  inputClass,
  ListState,
  Notice,
  PAGE_SIZE,
  Pagination,
  panelClass,
  SectionHeading,
  Table,
} from "./admin-shared";
import {
  dateLabel,
  readNumber,
  requiredText,
  useAdminIdentity,
  useAdminMutation,
} from "./admin-data";

export function AdminCoupons() {
  const identity = useAdminIdentity();
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<Coupon | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["admin", identity, "coupons", page],
    queryFn: async () => {
      const { data, count, error } = await requireSupabase()
        .from("coupons")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Coupon[], total: count ?? 0 };
    },
  });
  const save = useAdminMutation(
    async (form: FormData) => {
      const code = requiredText(form, "code", "Mã giảm giá").toUpperCase();
      if (!/^[A-Z0-9][A-Z0-9_-]{0,63}$/.test(code))
        throw new Error(
          "Mã giảm giá dài 1–64 ký tự, bắt đầu bằng chữ hoặc số; chỉ gồm chữ không dấu, số, dấu gạch nối và gạch dưới.",
        );
      const discountType = requiredText(form, "discount_type", "Loại giảm giá");
      if (discountType !== "percent" && discountType !== "fixed")
        throw new Error("Loại giảm giá không hợp lệ.");
      const rawAmount = Number(requiredText(form, "amount", "Giá trị giảm"));
      const amount =
        discountType === "percent"
          ? Math.round((rawAmount + Number.EPSILON) * 100) / 100
          : rawAmount;
      if (
        !Number.isFinite(rawAmount) ||
        rawAmount < 1 ||
        rawAmount > (discountType === "percent" ? 100 : 1_000_000_000) ||
        amount !== rawAmount ||
        (discountType === "fixed" && !Number.isSafeInteger(amount))
      )
        throw new Error(
          discountType === "percent"
            ? "Phần trăm giảm phải từ 1 đến 100 và có tối đa hai chữ số thập phân."
            : "Số tiền giảm phải là số nguyên VND từ 1 đến 1.000.000.000.",
        );
      const maxUses = String(form.get("max_uses") ?? "").trim()
        ? readNumber(form, "max_uses", "Lượt dùng tối đa", 1, 2_147_483_647)
        : null;
      if (editor && editor !== "new" && maxUses !== null && maxUses < editor.used_count)
        throw new Error("Giới hạn lượt dùng không thể nhỏ hơn số lượt đã dùng.");
      const expiryInput = String(form.get("expires_at") ?? "").trim();
      const expiry = expiryInput ? new Date(expiryInput) : null;
      if (expiry && !Number.isFinite(expiry.getTime()))
        throw new Error("Ngày hết hạn không hợp lệ.");
      const payload = {
        code,
        discount_type: discountType,
        amount,
        min_order: readNumber(form, "min_order", "Đơn tối thiểu"),
        max_uses: maxUses,
        expires_at: expiry?.toISOString() ?? null,
        is_active: form.get("is_active") === "on",
      };
      const client = requireSupabase();
      const request =
        editor && editor !== "new"
          ? client.from("coupons").update(payload).eq("id", editor.id)
          : client.from("coupons").insert(payload);
      const { error } = await request.select("id").single();
      if (error) throw error;
    },
    () => {
      setEditor(null);
      setNotice("Đã lưu mã giảm giá. Số lượt đã dùng do hệ thống tự quản lý.");
    },
  );
  const remove = useAdminMutation(
    async (coupon: Coupon) => {
      const { error } = await requireSupabase()
        .from("coupons")
        .delete()
        .eq("id", coupon.id)
        .select("id")
        .single();
      if (error?.code === "23503")
        throw new Error(
          "Mã đã liên kết với đơn hàng. Sửa mã và tắt Hoạt động thay vì xóa để bảo toàn lịch sử.",
        );
      if (error) throw error;
    },
    () => setNotice("Đã xóa mã giảm giá."),
  );
  const busy = save.isPending || remove.isPending;
  return (
    <section className="space-y-6">
      <SectionHeading
        title="Mã giảm giá"
        description="Giảm theo phần trăm hoặc số tiền, giới hạn đơn tối thiểu, lượt dùng và thời hạn."
      >
        <Button
          variant="sport"
          disabled={busy || !!editor}
          onClick={() => {
            save.reset();
            remove.reset();
            setNotice("");
            setEditor("new");
          }}
        >
          Thêm mã
        </Button>
      </SectionHeading>
      <ErrorNotice error={save.error || remove.error} />
      {notice && <Notice>{notice}</Notice>}
      {editor && (
        <CouponForm
          key={editor === "new" ? "new" : editor.id}
          coupon={editor === "new" ? null : editor}
          busy={busy}
          onSave={(form) => {
            setNotice("");
            save.mutate(form);
          }}
          onClose={() => {
            if (window.confirm("Bỏ các thay đổi mã giảm giá chưa lưu?")) {
              setEditor(null);
              save.reset();
            }
          }}
        />
      )}
      <ListState
        pending={query.isPending}
        error={query.error}
        empty={!query.data?.rows.length}
        retry={() => void query.refetch()}
      />
      {query.data && !query.error && (
        <>
          {!!query.data.rows.length && (
            <Table
              caption="Danh sách mã giảm giá"
              headings={[
                "Mã / Giá trị",
                "Đơn tối thiểu",
                "Lượt dùng",
                "Hết hạn",
                "Trạng thái",
                "Thao tác",
              ]}
            >
              {query.data.rows.map((coupon) => (
                <tr key={coupon.id}>
                  <td>
                    <p className="font-mono font-bold">{coupon.code}</p>
                    <p className="mt-1">
                      {coupon.discount_type === "percent"
                        ? coupon.amount + "%"
                        : formatPrice(coupon.amount)}
                    </p>
                  </td>
                  <td>{formatPrice(coupon.min_order)}</td>
                  <td>
                    {coupon.used_count} / {coupon.max_uses ?? "Không giới hạn"}
                  </td>
                  <td>
                    {coupon.expires_at ? dateLabel(coupon.expires_at) : "Không hết hạn"}
                    {coupon.expires_at && Date.parse(coupon.expires_at) <= Date.now() && (
                      <p className="mt-1 text-xs text-destructive">Đã hết hạn</p>
                    )}
                  </td>
                  <td>
                    <ActiveBadge active={coupon.is_active} />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy || !!editor}
                        onClick={() => {
                          save.reset();
                          remove.reset();
                          setNotice("");
                          setEditor(coupon);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy || !!editor}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Xóa mã " +
                                coupon.code +
                                "? Nên tắt Hoạt động nếu muốn giữ số liệu sử dụng.",
                            )
                          ) {
                            save.reset();
                            setNotice("");
                            remove.mutate(coupon);
                          }
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination
            page={page}
            total={query.data.total}
            busy={busy || query.isFetching || !!editor}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}

function localDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function CouponForm({
  coupon,
  busy,
  onSave,
  onClose,
}: {
  coupon: Coupon | null;
  busy: boolean;
  onSave: (form: FormData) => void;
  onClose: () => void;
}) {
  const [discountType, setDiscountType] = useState(coupon?.discount_type ?? "percent");
  return (
    <form
      className={panelClass + " space-y-5"}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
    >
      <h3 className="text-lg font-bold">{coupon ? "Sửa mã giảm giá" : "Mã giảm giá mới"}</h3>
      <fieldset disabled={busy} className="space-y-5">
        <legend className="sr-only">Thông tin mã giảm giá</legend>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Mã *"
            hint="1–64 ký tự, bắt đầu bằng chữ hoặc số. Mã sẽ được chuyển thành chữ hoa."
          >
            <input
              className={inputClass + " uppercase"}
              name="code"
              required
              pattern="[A-Za-z0-9][A-Za-z0-9_\-]{0,63}"
              minLength={1}
              maxLength={64}
              defaultValue={coupon?.code ?? ""}
            />
          </Field>
          <Field label="Loại giảm giá *">
            <select
              className={inputClass}
              name="discount_type"
              value={discountType}
              onChange={(event) => setDiscountType(event.target.value as Coupon["discount_type"])}
            >
              <option value="percent">Phần trăm (%)</option>
              <option value="fixed">Số tiền (VND)</option>
            </select>
          </Field>
          <Field label={discountType === "percent" ? "Phần trăm giảm *" : "Số tiền giảm (VND) *"}>
            <input
              className={inputClass}
              name="amount"
              type="number"
              required
              min="1"
              max={discountType === "percent" ? "100" : "1000000000"}
              step={discountType === "percent" ? "0.01" : "1"}
              defaultValue={coupon?.amount ?? ""}
            />
          </Field>
          <Field label="Đơn tối thiểu (VND) *">
            <input
              className={inputClass}
              name="min_order"
              type="number"
              required
              min="0"
              max="1000000000"
              step="1"
              defaultValue={coupon?.min_order ?? 0}
            />
          </Field>
          <Field label="Lượt dùng tối đa" hint="Để trống nếu không giới hạn.">
            <input
              className={inputClass}
              name="max_uses"
              type="number"
              min={Math.max(1, coupon?.used_count ?? 0)}
              max="2147483647"
              step="1"
              defaultValue={coupon?.max_uses ?? ""}
            />
          </Field>
          <Field label="Hết hạn" hint="Giờ địa phương của thiết bị. Để trống nếu không hết hạn.">
            <input
              className={inputClass}
              name="expires_at"
              type="datetime-local"
              defaultValue={localDateInput(coupon?.expires_at)}
            />
          </Field>
        </div>
        {coupon && (
          <p className="text-sm">
            Đã dùng: <strong>{coupon.used_count}</strong> lượt (chỉ đọc).
          </p>
        )}
        <Check name="is_active" label="Hoạt động" checked={coupon?.is_active ?? true} />
        <div className="flex gap-2">
          <Button variant="sport" type="submit">
            {busy ? "Đang lưu…" : "Lưu mã giảm giá"}
          </Button>
          <Button variant="outline" type="button" onClick={onClose}>
            Hủy chỉnh sửa
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
