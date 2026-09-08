import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-dialog";
import { requireSupabase } from "@/lib/supabase";
import type { Profile, Role, Subscription } from "@/lib/shop-types";
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
import { dateLabel, useAdminIdentity, useAdminMutation } from "./admin-data";

export function AdminCustomers() {
  const confirm = useConfirm();
  const identity = useAdminIdentity();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState<Profile | null>(null);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["admin", identity, "customers", page, filter],
    queryFn: async () => {
      let request = requireSupabase().from("profiles").select("*", { count: "exact" });
      if (filter === "user" || filter === "admin") request = request.eq("role", filter);
      if (filter === "inactive") request = request.eq("is_active", false);
      const { data, error, count } = await request
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Profile[], total: count ?? 0 };
    },
  });
  const update = useAdminMutation(
    async ({ profile, role, active }: { profile: Profile; role: Role; active: boolean }) => {
      if (profile.id === identity && (role !== "admin" || !active))
        throw new Error("Không thể tự hạ quyền hoặc khóa tài khoản đang dùng.");
      if (role !== "admin" && role !== "user") throw new Error("Vai trò không hợp lệ.");
      const { error } = await requireSupabase().rpc("admin_update_user", {
        p_user_id: profile.id,
        p_role: role,
        p_is_active: active,
      });
      if (error) throw error;
    },
    () => {
      setEditor(null);
      setNotice("Đã cập nhật quyền và trạng thái tài khoản.");
    },
  );
  return (
    <section className="space-y-6">
      <SectionHeading
        title="Khách hàng"
        description="Quản lý hồ sơ, vai trò và trạng thái. Hồ sơ không chứa email; không hiển thị email giả hoặc suy đoán."
      />
      <div className="max-w-xs">
        <Field label="Lọc tài khoản">
          <select
            className={inputClass}
            value={filter}
            disabled={update.isPending || !!editor}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả tài khoản</option>
            <option value="user">Khách hàng</option>
            <option value="admin">Quản trị viên</option>
            <option value="inactive">Đã khóa</option>
          </select>
        </Field>
      </div>
      <Notice>
        Không thể tự hạ quyền hoặc khóa chính mình. Máy chủ cũng bảo vệ quản trị viên hoạt động cuối
        cùng. Khóa tài khoản không xóa hồ sơ hoặc lịch sử đơn hàng.
      </Notice>
      <ErrorNotice error={update.error} />
      {notice && <Notice>{notice}</Notice>}
      {editor && (
        <form
          key={editor.id}
          className={panelClass + " space-y-5"}
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const role = String(form.get("role")) as Role;
            const active = form.get("is_active") === "on";
            if (
              await confirm({
                title: "Cập nhật tài khoản",
                description:
                  "Cập nhật tài khoản “" +
                  (editor.full_name || editor.id) +
                  "” thành " +
                  (role === "admin" ? "Quản trị viên" : "Khách hàng") +
                  " / " +
                  (active ? "Hoạt động" : "Đã khóa") +
                  "?" +
                  (role === "admin" && editor.role !== "admin"
                    ? " Quyền quản trị cho phép quản lý toàn bộ cửa hàng và dữ liệu khách hàng."
                    : ""),
                confirmText: "Cập nhật",
                cancelText: "Hủy",
                variant: role === "admin" ? "destructive" : "sport",
              })
            ) {
              setNotice("");
              update.mutate({ profile: editor, role, active });
            }
          }}
        >
          <div>
            <h3 className="text-lg font-bold">{editor.full_name || "Chưa có tên"}</h3>
            <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{editor.id}</p>
          </div>
          <fieldset disabled={update.isPending || editor.id === identity} className="space-y-5">
            <legend className="sr-only">Vai trò và trạng thái tài khoản</legend>
            <div className="max-w-sm">
              <Field label="Vai trò">
                <select className={inputClass} name="role" defaultValue={editor.role}>
                  <option value="user">Khách hàng</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </Field>
            </div>
            <Check name="is_active" label="Tài khoản hoạt động" checked={editor.is_active} />
            <div className="flex gap-2">
              <Button variant="sport" type="submit">
                {update.isPending ? "Đang lưu…" : "Lưu quyền & trạng thái"}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Bỏ thay đổi",
                      description: "Bỏ các thay đổi tài khoản chưa lưu?",
                      confirmText: "Bỏ thay đổi",
                      cancelText: "Tiếp tục sửa",
                      variant: "destructive",
                    })
                  ) {
                    setEditor(null);
                    update.reset();
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
              caption="Danh sách tài khoản"
              headings={[
                "Khách hàng / ID",
                "Điện thoại",
                "Vai trò",
                "Trạng thái",
                "Ngày tạo",
                "Thao tác",
              ]}
            >
              {query.data.rows.map((profile) => (
                <tr key={profile.id}>
                  <td>
                    <p className="font-bold">
                      {profile.full_name || "Chưa có tên"}
                      {profile.id === identity && (
                        <span className="ml-2 text-xs text-primary">(Bạn)</span>
                      )}
                    </p>
                    <p className="mt-1 max-w-64 break-all font-mono text-xs text-muted-foreground">
                      {profile.id}
                    </p>
                  </td>
                  <td>{profile.phone || "Chưa cung cấp"}</td>
                  <td>{profile.role === "admin" ? "Quản trị viên" : "Khách hàng"}</td>
                  <td>
                    <ActiveBadge active={profile.is_active} />
                  </td>
                  <td>{dateLabel(profile.created_at)}</td>
                  <td>
                    {profile.id === identity ? (
                      <span className="text-xs text-muted-foreground">
                        Tài khoản hiện tại được bảo vệ
                      </span>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={update.isPending || !!editor}
                        onClick={() => {
                          update.reset();
                          setNotice("");
                          setEditor(profile);
                        }}
                      >
                        Quản lý
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination
            page={page}
            total={query.data.total}
            busy={query.isFetching || update.isPending || !!editor}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}

export function AdminNewsletters() {
  const confirm = useConfirm();
  const identity = useAdminIdentity();
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["admin", identity, "newsletters", page],
    queryFn: async () => {
      const { data, count, error } = await requireSupabase()
        .from("newsletter_subscriptions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Subscription[], total: count ?? 0 };
    },
  });
  const remove = useAdminMutation(
    async (subscription: Subscription) => {
      const { error } = await requireSupabase()
        .from("newsletter_subscriptions")
        .delete()
        .eq("id", subscription.id)
        .select("id")
        .single();
      if (error) throw error;
    },
    () => setNotice("Đã xóa đăng ký nhận bản tin. Không thay đổi tài khoản khách hàng."),
  );
  return (
    <section className="space-y-6">
      <SectionHeading
        title="Đăng ký bản tin"
        description="Danh sách email đã đăng ký nhận tin. Xóa đăng ký không xóa tài khoản và không gửi email tự động."
      />
      <ErrorNotice error={remove.error} />
      {notice && <Notice>{notice}</Notice>}
      <ListState
        pending={query.isPending}
        error={query.error}
        empty={!query.data?.rows.length}
        retry={() => void query.refetch()}
      />
      {query.data && !query.error && (
        <>
          {!!query.data.rows.length && (
            <Table caption="Đăng ký nhận bản tin" headings={["Email", "Ngày đăng ký", "Thao tác"]}>
              {query.data.rows.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="break-all font-medium">{subscription.email}</td>
                  <td>{dateLabel(subscription.created_at)}</td>
                  <td>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={remove.isPending}
                      onClick={async () => {
                        if (
                          await confirm({
                            title: "Xóa đăng ký bản tin",
                            description: `Xóa đăng ký nhận bản tin của ${subscription.email}? Thao tác không thể hoàn tác.`,
                            confirmText: "Xóa đăng ký",
                            cancelText: "Hủy",
                            variant: "destructive",
                          })
                        ) {
                          setNotice("");
                          remove.mutate(subscription);
                        }
                      }}
                    >
                      {remove.isPending && remove.variables?.id === subscription.id
                        ? "Đang xóa…"
                        : "Xóa đăng ký"}
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination
            page={page}
            total={query.data.total}
            busy={query.isFetching || remove.isPending}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}
