import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-dialog";
import { requireSupabase } from "@/lib/supabase";
import type { Category } from "@/lib/shop-types";
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
import { readSlug, requiredText, useAdminIdentity, useAdminMutation } from "./admin-data";

export function AdminCategories() {
  const identity = useAdminIdentity();
  const confirm = useConfirm();
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<Category | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["admin", identity, "categories", page],
    queryFn: async () => {
      const { data, error, count } = await requireSupabase()
        .from("categories")
        .select("*", { count: "exact" })
        .order("name")
        .order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Category[], total: count ?? 0 };
    },
  });
  const save = useAdminMutation(
    async (form: FormData) => {
      const payload = {
        name: requiredText(form, "name", "Tên danh mục"),
        slug: readSlug(form),
        description: String(form.get("description") ?? "").trim(),
        is_active: form.get("is_active") === "on",
      };
      const client = requireSupabase();
      const request =
        editor && editor !== "new"
          ? client.from("categories").update(payload).eq("id", editor.id)
          : client.from("categories").insert(payload);
      const { error } = await request.select("id").single();
      if (error) throw error;
    },
    () => {
      setEditor(null);
      setNotice("Đã lưu danh mục.");
    },
  );
  const remove = useAdminMutation(
    async (category: Category) => {
      const { error } = await requireSupabase()
        .from("categories")
        .delete()
        .eq("id", category.id)
        .select("id")
        .single();
      if (error?.code === "23503")
        throw new Error(
          "Danh mục đang được sử dụng. Chuyển sản phẩm sang danh mục khác hoặc sửa và tắt Hoạt động trước.",
        );
      if (error) throw error;
    },
    () => setNotice("Đã xóa danh mục."),
  );
  const busy = save.isPending || remove.isPending;
  const current = editor && editor !== "new" ? editor : null;
  return (
    <section className="space-y-6">
      <SectionHeading
        title="Danh mục"
        description="Sắp xếp sản phẩm và quản lý các nhóm hiển thị trên cửa hàng."
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
          Thêm danh mục
        </Button>
      </SectionHeading>
      <ErrorNotice error={save.error || remove.error} />
      {notice && <Notice>{notice}</Notice>}
      {editor && (
        <form
          key={current?.id ?? "new"}
          className={panelClass + " space-y-5"}
          onSubmit={(event) => {
            event.preventDefault();
            setNotice("");
            save.mutate(new FormData(event.currentTarget));
          }}
        >
          <h3 className="text-lg font-bold">{current ? "Sửa danh mục" : "Danh mục mới"}</h3>
          <fieldset disabled={busy} className="space-y-5">
            <legend className="sr-only">Thông tin danh mục</legend>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Tên danh mục *">
                <input
                  className={inputClass}
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={current?.name ?? ""}
                />
              </Field>
              <Field label="Đường dẫn (slug) *">
                <input
                  className={inputClass}
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  maxLength={120}
                  defaultValue={current?.slug ?? ""}
                />
              </Field>
            </div>
            <Field label="Mô tả">
              <textarea
                className={inputClass}
                name="description"
                rows={3}
                maxLength={5000}
                defaultValue={current?.description ?? ""}
              />
            </Field>
            <Check
              name="is_active"
              label="Hoạt động / hiển thị"
              checked={current?.is_active ?? true}
            />
            <div className="flex gap-2">
              <Button type="submit" variant="sport">
                {busy ? "Đang lưu…" : "Lưu danh mục"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Hủy chỉnh sửa",
                      description: "Bỏ các thay đổi danh mục chưa lưu?",
                      confirmText: "Bỏ thay đổi",
                      cancelText: "Tiếp tục sửa",
                    })
                  ) {
                    setEditor(null);
                    save.reset();
                  }
                }}
              >
                Hủy chỉnh sửa
              </Button>
            </div>
          </fieldset>
        </form>
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
              caption="Danh sách danh mục"
              headings={["Danh mục", "Đường dẫn", "Hiển thị", "Thao tác"]}
            >
              {query.data.rows.map((category) => (
                <tr key={category.id}>
                  <td>
                    <p className="font-bold">{category.name}</p>
                    <p className="mt-1 max-w-sm text-muted-foreground">{category.description}</p>
                  </td>
                  <td className="break-all">{category.slug}</td>
                  <td>
                    <ActiveBadge active={category.is_active} />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy || !!editor}
                        onClick={() => {
                          save.reset();
                          remove.reset();
                          setNotice("");
                          setEditor(category);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy || !!editor}
                        onClick={async () => {
                          if (
                            await confirm({
                              title: "Xóa danh mục",
                              description:
                                'Xóa danh mục "' +
                                category.name +
                                '"? Danh mục đang có sản phẩm sẽ không thể xóa; có thể ẩn thay thế.',
                              confirmText: "Xóa danh mục",
                              variant: "destructive",
                            })
                          ) {
                            save.reset();
                            setNotice("");
                            remove.mutate(category);
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
