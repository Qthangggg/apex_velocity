import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { requireSupabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/cart-context";
import type { Order, OrderStatus } from "@/lib/shop-types";
import {
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
  orderStatusLabels,
  dateLabel,
  useAdminIdentity,
  useAdminMutation,
  validImageUrl,
} from "./admin-data";

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "shipping",
  shipping: "completed",
};

export function AdminOrders() {
  const identity = useAdminIdentity();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const query = useQuery({
    queryKey: ["admin", identity, "orders", page, filter],
    queryFn: async () => {
      let request = requireSupabase().from("orders").select("*,order_items(*)", { count: "exact" });
      if (filter !== "all") request = request.eq("status", filter);
      const { data, count, error } = await request
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Order[], total: count ?? 0 };
    },
  });
  const update = useAdminMutation(
    async ({
      order,
      status,
      paymentStatus,
    }: {
      order: Order;
      status: OrderStatus;
      paymentStatus: Order["payment_status"];
    }) => {
      if (status === "cancelled" || order.status === "cancelled")
        throw new Error(
          "Đơn đã hủy không thể chỉnh sửa. Hãy dùng nút Hủy đơn cho đơn đang chờ và chưa thanh toán.",
        );
      if (status !== order.status && status !== nextStatus[order.status])
        throw new Error("Chỉ được chuyển sang bước xử lý tiếp theo.");
      if (order.payment_status === "paid" && paymentStatus !== "paid")
        throw new Error("Không thể đảo ngược thanh toán đã ghi nhận.");
      if (
        (status === "completed" ||
          (order.payment_method === "bank_transfer" &&
            ["confirmed", "shipping"].includes(status))) &&
        paymentStatus !== "paid"
      )
        throw new Error("Cần xác minh đã nhận thanh toán trước khi chuyển sang trạng thái này.");
      const { error } = await requireSupabase().rpc("admin_update_order", {
        p_order_id: order.id,
        p_status: status,
        p_payment_status: paymentStatus,
      });
      if (error) throw error;
    },
    () => {
      setSelectedId(null);
      setNotice("Đã cập nhật đơn hàng.");
    },
  );
  const cancel = useAdminMutation(
    async (order: Order) => {
      if (order.status !== "pending" || order.payment_status !== "unpaid")
        throw new Error("Chỉ có thể hủy đơn chờ xác nhận và chưa thanh toán.");
      const { error } = await requireSupabase().rpc("cancel_order", { p_order_id: order.id });
      if (error) throw error;
    },
    () => {
      setSelectedId(null);
      setNotice("Đã hủy đơn. Máy chủ đã hoàn tồn kho; dữ liệu đơn hàng vẫn được giữ lại.");
    },
  );
  const busy = update.isPending || cancel.isPending;
  const selected = query.data?.rows.find((order) => order.id === selectedId);
  return (
    <section className="space-y-6">
      <SectionHeading
        title="Đơn hàng"
        description="Xử lý tuần tự: chờ xác nhận → xác nhận → giao hàng → hoàn tất. Không chỉnh sửa giá hoặc lịch sử đơn."
      />
      <div className="max-w-xs">
        <Field label="Lọc trạng thái">
          <select
            className={inputClass}
            value={filter}
            disabled={busy || !!selected}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(0);
              setSelectedId(null);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(orderStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {notice && <Notice>{notice}</Notice>}
      <ErrorNotice error={update.error || cancel.error} />
      {selected && (
        <OrderDetails
          key={selected.id + selected.status + selected.payment_status}
          order={selected}
          busy={busy}
          onClose={() => {
            if (window.confirm("Đóng chi tiết đơn? Thay đổi trạng thái chưa lưu sẽ bị bỏ qua."))
              setSelectedId(null);
          }}
          onSave={(status, paymentStatus) => {
            if (
              window.confirm(
                "Cập nhật đơn " +
                  selected.id.slice(0, 8) +
                  " thành “" +
                  orderStatusLabels[status] +
                  "” / “" +
                  (paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán") +
                  "”?" +
                  (paymentStatus === "paid" && selected.payment_status !== "paid"
                    ? " Chỉ xác nhận khi đã thực sự nhận đủ tiền. Thao tác ghi nhận thanh toán không thể đảo ngược."
                    : ""),
              )
            ) {
              cancel.reset();
              setNotice("");
              update.mutate({ order: selected, status, paymentStatus });
            }
          }}
          onCancel={() => {
            if (
              window.confirm(
                "Hủy đơn " +
                  selected.id.slice(0, 8) +
                  " và hoàn lại tồn kho? Thao tác không thể hoàn tác. Không xóa lịch sử đơn hàng.",
              )
            ) {
              update.reset();
              setNotice("");
              cancel.mutate(selected);
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
              caption="Danh sách đơn hàng"
              headings={[
                "Mã / Ngày",
                "Người nhận",
                "Trạng thái",
                "Thanh toán",
                "Tổng tiền",
                "Thao tác",
              ]}
            >
              {query.data.rows.map((order) => (
                <tr key={order.id}>
                  <td>
                    <p title={order.id} className="font-mono font-semibold">
                      {order.id.slice(0, 8)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {dateLabel(order.created_at)}
                    </p>
                  </td>
                  <td>
                    <p>{order.shipping_address.recipient}</p>
                    <p className="text-xs text-muted-foreground">{order.shipping_address.phone}</p>
                  </td>
                  <td>
                    <span className="inline-block whitespace-nowrap border px-2 py-1 text-xs font-semibold">
                      {orderStatusLabels[order.status]}
                    </span>
                  </td>
                  <td>
                    {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {order.payment_method === "cod" ? "COD" : "Chuyển khoản"}
                    </p>
                  </td>
                  <td className="whitespace-nowrap font-bold">{formatPrice(order.total)}</td>
                  <td>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || (!!selected && selected.id !== order.id)}
                      onClick={() => {
                        update.reset();
                        cancel.reset();
                        setNotice("");
                        setSelectedId(order.id);
                      }}
                    >
                      Chi tiết
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination
            page={page}
            total={query.data.total}
            busy={busy || query.isFetching || !!selected}
            onChange={(next) => {
              setSelectedId(null);
              setPage(next);
            }}
          />
        </>
      )}
    </section>
  );
}

function OrderDetails({
  order,
  busy,
  onClose,
  onSave,
  onCancel,
}: {
  order: Order;
  busy: boolean;
  onClose: () => void;
  onSave: (status: OrderStatus, payment: Order["payment_status"]) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [payment, setPayment] = useState<Order["payment_status"]>(order.payment_status);
  const followingStatus = nextStatus[order.status];
  const address = order.shipping_address;
  const needsPaid =
    status === "completed" ||
    (order.payment_method === "bank_transfer" && ["confirmed", "shipping"].includes(status));
  return (
    <article
      className={panelClass + " space-y-6 border-t-4 border-t-primary"}
      aria-label="Chi tiết đơn hàng"
    >
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold uppercase">Chi tiết đơn hàng</h3>
          <p className="mt-1 break-all font-mono text-xs">{order.id}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {dateLabel(order.created_at)} · Giờ Việt Nam
          </p>
        </div>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Đóng chi tiết
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="mb-2 font-bold">Giao đến</h4>
          <address className="space-y-1 break-words text-sm not-italic">
            <p>
              {address.recipient} · {address.phone}
            </p>
            <p>
              {[address.line1, address.ward, address.district, address.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          </address>
          <p className="mt-3 break-all text-xs text-muted-foreground">
            ID khách hàng: {order.user_id}
          </p>
        </div>
        <div>
          <h4 className="mb-2 font-bold">Thanh toán & ghi chú</h4>
          <p className="text-sm">
            {order.payment_method === "cod"
              ? "Thanh toán khi nhận hàng (COD)"
              : "Chuyển khoản ngân hàng"}
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
            {order.note || "Không có ghi chú."}
          </p>
          {order.coupon_code && (
            <p className="mt-2 text-sm">
              Mã giảm giá: <strong>{order.coupon_code}</strong>
            </p>
          )}
        </div>
      </div>
      <Table
        caption="Sản phẩm trong đơn hàng"
        headings={["Sản phẩm", "Phân loại", "Đơn giá", "Số lượng", "Thành tiền"]}
      >
        {order.order_items.map((item) => (
          <tr key={item.id}>
            <td>
              <div className="flex items-center gap-3">
                {validImageUrl(item.image) && (
                  <img
                    src={item.image}
                    alt=""
                    className="size-12 bg-muted object-cover"
                    loading="lazy"
                  />
                )}
                <span className="font-semibold">{item.product_name}</span>
              </div>
            </td>
            <td>
              {item.size} / {item.color}
            </td>
            <td>{formatPrice(item.unit_price)}</td>
            <td>{item.quantity}</td>
            <td>{formatPrice(item.unit_price * item.quantity)}</td>
          </tr>
        ))}
      </Table>
      <dl className="ml-auto grid max-w-sm grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt>Tạm tính</dt>
        <dd className="text-right">{formatPrice(order.subtotal)}</dd>
        <dt>Giảm giá</dt>
        <dd className="text-right">−{formatPrice(order.discount)}</dd>
        <dt>Phí giao hàng</dt>
        <dd className="text-right">{formatPrice(order.shipping_fee)}</dd>
        <dt className="border-t pt-3 font-bold">Tổng thanh toán</dt>
        <dd className="border-t pt-3 text-right font-bold">{formatPrice(order.total)}</dd>
      </dl>
      {order.status === "cancelled" ? (
        <Notice>Đơn đã hủy. Không thể mở lại hoặc chỉnh sửa thanh toán.</Notice>
      ) : (
        <form
          className="space-y-4 border-t pt-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSave(status, payment);
          }}
        >
          <fieldset disabled={busy} className="space-y-4">
            <legend className="sr-only">Cập nhật trạng thái đơn hàng</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Trạng thái đơn hàng">
                <select
                  className={inputClass}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as OrderStatus)}
                >
                  <option value={order.status}>{orderStatusLabels[order.status]}</option>
                  {followingStatus && (
                    <option value={followingStatus}>{orderStatusLabels[followingStatus]}</option>
                  )}
                </select>
              </Field>
              <Field label="Trạng thái thanh toán">
                <select
                  className={inputClass}
                  value={payment}
                  disabled={order.payment_status === "paid"}
                  onChange={(event) => setPayment(event.target.value as Order["payment_status"])}
                >
                  {order.payment_status !== "paid" && (
                    <option value="unpaid">Chưa thanh toán</option>
                  )}
                  <option value="paid">Đã thanh toán</option>
                </select>
              </Field>
            </div>
            <p className="text-sm text-muted-foreground">
              Chuyển khoản cần xác minh tiền trước khi xác nhận / giao hàng. Hoàn tất đơn yêu cầu đã
              thanh toán. Ghi nhận thanh toán không thực hiện thu tiền hoặc hoàn tiền tự động.
            </p>
            {needsPaid && payment !== "paid" && (
              <Notice>Hãy xác minh đã nhận đủ tiền rồi chọn Đã thanh toán để tiếp tục.</Notice>
            )}
            <div className="flex flex-wrap gap-3">
              <Button
                variant="sport"
                type="submit"
                disabled={
                  (status === order.status && payment === order.payment_status) ||
                  (needsPaid && payment !== "paid")
                }
              >
                {busy ? "Đang xử lý…" : "Lưu trạng thái"}
              </Button>
              <Button
                variant="destructive"
                type="button"
                disabled={order.status !== "pending" || order.payment_status !== "unpaid"}
                onClick={onCancel}
              >
                Hủy đơn & hoàn tồn kho
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Chỉ hủy được đơn chờ xác nhận, chưa thanh toán. Máy chủ kiểm tra lại điều kiện trước
              khi xử lý.
            </p>
          </fieldset>
        </form>
      )}
    </article>
  );
}
