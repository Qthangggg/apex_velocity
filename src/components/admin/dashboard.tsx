import { useQuery } from "@tanstack/react-query";
import { requireSupabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/cart-context";
import type { Order } from "@/lib/shop-types";
import { ListState, SectionHeading, Table } from "./admin-shared";
import { dateLabel, useAdminIdentity } from "./admin-data";
import { orderStatusLabels } from "./admin-data";

export function AdminDashboard() {
  const identity = useAdminIdentity();
  const query = useQuery({
    queryKey: ["admin", identity, "dashboard"],
    queryFn: async () => {
      const client = requireSupabase();
      const results = await Promise.all([
        client.from("products").select("id", { count: "exact", head: true }),
        client.from("orders").select("id", { count: "exact", head: true }),
        client.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
        client.from("profiles").select("id", { count: "exact", head: true }).eq("role", "user"),
        client.from("newsletter_subscriptions").select("id", { count: "exact", head: true }),
        client
          .from("orders")
          .select("*,order_items(*)")
          .order("created_at", { ascending: false })
          .order("id")
          .range(0, 4),
      ]);
      for (const result of results) if (result.error) throw result.error;
      return {
        counts: results.slice(0, 5).map((result) => result.count ?? 0),
        orders: (results[5].data ?? []) as unknown as Order[],
      };
    },
  });
  const labels = ["Sản phẩm", "Tổng đơn hàng", "Đơn chờ xử lý", "Khách hàng", "Đăng ký bản tin"];
  return (
    <section className="space-y-6">
      <SectionHeading
        title="Tổng quan"
        description="Số liệu trực tiếp từ cửa hàng. Chỉ thanh toán đã được xác minh mới được đánh dấu đã trả."
      />
      <ListState
        pending={query.isPending}
        error={query.error}
        empty={false}
        retry={() => void query.refetch()}
      />
      {query.data && !query.error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {labels.map((label, index) => (
              <div
                key={label}
                className={
                  "border p-5 " + (index === 2 ? "border-primary bg-primary/5" : "bg-muted/30")
                }
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-4 text-4xl font-black tabular-nums">
                  {(query.data.counts[index] ?? 0).toLocaleString("vi-VN")}
                </p>
              </div>
            ))}
          </div>
          <div className="pt-4">
            <h3 className="mb-4 text-lg font-bold uppercase">5 đơn hàng gần nhất</h3>
            {query.data.orders.length ? (
              <Table
                caption="Đơn hàng gần nhất"
                headings={["Mã / Ngày", "Người nhận", "Trạng thái", "Thanh toán", "Tổng tiền"]}
              >
                {query.data.orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="font-mono text-xs" title={order.id}>
                        {order.id.slice(0, 8)}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {dateLabel(order.created_at)}
                      </p>
                    </td>
                    <td>{order.shipping_address?.recipient || "—"}</td>
                    <td>{orderStatusLabels[order.status]}</td>
                    <td>{order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</td>
                    <td className="font-bold">{formatPrice(order.total)}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <p className="border border-dashed p-8 text-center text-muted-foreground">
                Chưa có đơn hàng.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
