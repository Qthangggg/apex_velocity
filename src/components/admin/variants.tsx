import { useState } from "react";
import { useIsMutating, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-dialog";
import { requireSupabase } from "@/lib/supabase";
import type { Variant } from "@/lib/shop-types";
import {
  Check,
  ErrorNotice,
  Field,
  inputClass,
  ListState,
  Notice,
  PAGE_SIZE,
  Pagination,
  panelClass,
} from "./admin-shared";
import { readNumber, requiredText, useAdminIdentity, useAdminMutation } from "./admin-data";

export function VariantEditor({ productId }: { productId: string }) {
  const confirm = useConfirm();
  const identity = useAdminIdentity();
  const mutations = useIsMutating();
  const [page, setPage] = useState(0);
  const [newVersion, setNewVersion] = useState(0);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["admin", identity, "variants", productId, page],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, count, error } = await requireSupabase()
        .from("product_variants")
        .select("*", { count: "exact" })
        .eq("product_id", productId)
        .order("size")
        .order("color")
        .order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Variant[], total: count ?? 0 };
    },
  });
  const save = useAdminMutation(
    async ({ form, variant }: { form: FormData; variant: Variant | null }) => {
      const swatch = requiredText(form, "swatch", "Mã màu");
      if (!/^#[0-9a-fA-F]{6}$/.test(swatch))
        throw new Error("Mã màu phải có dạng #RRGGBB, ví dụ #121212.");
      const payload = {
        product_id: productId,
        size: requiredText(form, "size", "Kích cỡ"),
        color: requiredText(form, "color", "Tên màu"),
        swatch,
        sku: requiredText(form, "sku", "SKU"),
        stock: readNumber(form, "stock", "Tồn kho", 0, 2_147_483_647),
        is_active: form.get("is_active") === "on",
      };
      const client = requireSupabase();
      const request = variant
        ? client
            .from("product_variants")
            .update(payload)
            .eq("id", variant.id)
            .eq("product_id", productId)
            .eq("stock", variant.stock)
        : client.from("product_variants").insert(payload);
      const { error } = await request.select("id").single();
      if (error?.code === "PGRST116")
        throw new Error(
          "Tồn kho đã thay đổi hoặc biến thể không còn khả dụng. Tải lại biến thể trước khi lưu để tránh ghi đè đơn hàng mới.",
        );
      if (error) throw error;
      return !variant;
    },
    (created) => {
      setNotice(created ? "Đã thêm biến thể." : "Đã lưu biến thể và tồn kho.");
      if (created) setNewVersion((value) => value + 1);
    },
  );
  const remove = useAdminMutation(
    async (variant: Variant) => {
      const { error } = await requireSupabase()
        .from("product_variants")
        .delete()
        .eq("id", variant.id)
        .eq("product_id", productId)
        .select("id")
        .single();
      if (error?.code === "23503")
        throw new Error(
          "Biến thể đã liên kết với đơn hàng và không thể xóa. Bỏ chọn Hoạt động rồi bấm Lưu biến thể để ngừng bán mà vẫn giữ lịch sử.",
        );
      if (error) throw error;
    },
    () => setNotice("Đã xóa biến thể."),
  );
  const busy = save.isPending || remove.isPending || query.isFetching || mutations > 0;
  return (
    <section className="space-y-5 border-t-4 border-primary pt-6" aria-label="Biến thể và tồn kho">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-2xl font-extrabold uppercase">Biến thể & tồn kho</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Mỗi biến thể có nút lưu riêng. Thay đổi ở đây không được lưu bằng nút Lưu sản phẩm.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            if (
              await confirm({
                title: "Tải lại tồn kho",
                description: "Tải lại tồn kho từ máy chủ? Các sửa đổi biến thể chưa lưu sẽ bị bỏ qua.",
                confirmText: "Tải lại",
                cancelText: "Hủy",
                variant: "outline",
              })
            ) {
              setRefreshVersion((value) => value + 1);
              setNewVersion((value) => value + 1);
              void query.refetch();
            }
          }}
        >
          Tải lại biến thể
        </Button>
      </div>
      <ErrorNotice error={save.error || remove.error} />
      {notice && <Notice>{notice}</Notice>}
      <ListState
        pending={query.isPending}
        error={query.error}
        empty={!query.data?.rows.length}
        retry={() => void query.refetch()}
      />
      {query.data && !query.error && (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            {query.data.rows.map((variant) => (
              <VariantForm
                key={refreshVersion + JSON.stringify(variant)}
                variant={variant}
                busy={busy}
                onSave={(form) => {
                  setNotice("");
                  remove.reset();
                  save.mutate({ form, variant });
                }}
                onRemove={async () => {
                  if (
                    await confirm({
                      title: "Xóa biến thể",
                      description: `Xóa biến thể ${variant.sku}? Nếu có lịch sử đơn hàng, hãy ẩn biến thể thay vì xóa.`,
                      confirmText: "Xóa biến thể",
                      cancelText: "Hủy",
                      variant: "destructive",
                    })
                  ) {
                    setNotice("");
                    save.reset();
                    remove.mutate(variant);
                  }
                }}
              />
            ))}
          </div>
          <Pagination
            page={page}
            total={query.data.total}
            busy={busy || query.isFetching}
            onChange={async (next) => {
              if (
                await confirm({
                  title: "Chuyển trang",
                  description: "Chuyển trang biến thể? Các thay đổi chưa lưu sẽ bị bỏ qua.",
                  confirmText: "Chuyển trang",
                  cancelText: "Ở lại",
                })
              ) {
                setPage(next);
              }
            }}
          />
        </>
      )}
      <VariantForm
        key={"new-" + newVersion}
        variant={null}
        busy={busy}
        onSave={(form) => {
          setNotice("");
          remove.reset();
          save.mutate({ form, variant: null });
        }}
      />
    </section>
  );
}

function VariantForm({
  variant,
  busy,
  onSave,
  onRemove,
}: {
  variant: Variant | null;
  busy: boolean;
  onSave: (form: FormData) => void;
  onRemove?: () => void;
}) {
  return (
    <form
      className={panelClass + " space-y-4"}
      onSubmit={(event) => {
        event.preventDefault();
        onSave(new FormData(event.currentTarget));
      }}
    >
      <h4 className="break-all font-bold uppercase">
        {variant ? variant.sku : "Thêm biến thể mới"}
      </h4>
      <fieldset disabled={busy} className="space-y-4">
        <legend className="sr-only">
          {variant ? "Chỉnh sửa biến thể " + variant.sku : "Thông tin biến thể mới"}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kích cỡ *">
            <input
              className={inputClass}
              name="size"
              required
              maxLength={30}
              defaultValue={variant?.size ?? ""}
              placeholder="M / 42 / One size"
            />
          </Field>
          <Field label="Tên màu *">
            <input
              className={inputClass}
              name="color"
              required
              maxLength={60}
              defaultValue={variant?.color ?? ""}
            />
          </Field>
          <Field label="Mã màu *" hint="Mã hex 6 ký tự, có dấu #.">
            <input
              className={inputClass}
              name="swatch"
              required
              pattern="#[0-9a-fA-F]{6}"
              defaultValue={variant?.swatch ?? "#121212"}
            />
          </Field>
          <Field label="SKU *">
            <input
              className={inputClass}
              name="sku"
              required
              maxLength={80}
              defaultValue={variant?.sku ?? ""}
            />
          </Field>
          <Field label="Tồn kho *">
            <input
              className={inputClass}
              name="stock"
              type="number"
              min="0"
              max="2147483647"
              step="1"
              required
              defaultValue={variant?.stock ?? 0}
            />
          </Field>
        </div>
        <Check name="is_active" label="Hoạt động" checked={variant?.is_active ?? true} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="sport">
            {busy ? "Đang xử lý…" : variant ? "Lưu biến thể" : "Thêm biến thể"}
          </Button>
          {variant && (
            <Button type="button" variant="destructive" onClick={onRemove}>
              Xóa biến thể
            </Button>
          )}
        </div>
      </fieldset>
    </form>
  );
}
