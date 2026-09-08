import { useQuery } from "@tanstack/react-query";
import { requireSupabase, isConfigured } from "./supabase";
import type { Address, Category, CheckoutInput, Order, ShopProduct } from "./shop-types";

export function errorMessage(error: unknown): string {
  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String(error.message)
        : "Có lỗi xảy ra. Vui lòng thử lại.";
  if (/failed to fetch|network/i.test(message))
    return "Không thể kết nối máy chủ. Kiểm tra kết nối mạng và thử lại.";
  if (/invalid login credentials/i.test(message)) return "Email hoặc mật khẩu không đúng.";
  if (/email not confirmed/i.test(message)) return "Vui lòng xác nhận email trước khi đăng nhập.";
  if (/over_email_send_rate_limit/i.test(code) || /email rate limit/i.test(message))
    return "Hệ thống đã vượt quá giới hạn gửi email của Supabase (Email rate limit exceeded). Vui lòng cấu hình Custom SMTP hoặc tắt 'Confirm email' trong bảng điều khiển Supabase.";
  if (/user already registered/i.test(message))
    return "Email này đã được đăng ký. Vui lòng đăng nhập hoặc chọn Quên mật khẩu.";
  if (/rate limit|too many requests/i.test(message))
    return "Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.";
  if (/coupon is unavailable for this order|invalid coupon preview input/i.test(message))
    return "Mã giảm giá không hợp lệ, đã hết hạn hoặc chưa đạt giá trị đơn hàng tối thiểu.";
  if (/checkout total changed/i.test(message))
    return "Tổng tiền đơn hàng đã thay đổi. Vui lòng kiểm tra lại giá và mã giảm giá rồi thử lại.";
  if (/insufficient stock/i.test(message))
    return "Một hoặc nhiều sản phẩm trong giỏ hàng đã hết hoặc không đủ số lượng tồn kho.";
  if (/one or more variants are unavailable/i.test(message))
    return "Một hoặc nhiều sản phẩm trong giỏ hàng hiện không còn kinh doanh.";
  return message;
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    enabled: isConfigured,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Category[];
    },
  });
}

export function useCatalog(
  options: {
    search?: string;
    category?: string;
    sort?: string;
    page?: number;
    featured?: boolean;
  } = {},
) {
  return useQuery({
    queryKey: ["catalog", options],
    enabled: isConfigured,
    queryFn: async () => {
      let query = requireSupabase()
        .from("products")
        .select("*,categories(*),product_variants(*)", { count: "exact" })
        .eq("is_active", true);
      if (options.search)
        query = query.ilike(
          "name",
          "%" + options.search.replace(/[%_,()]/g, " ").slice(0, 100) + "%",
        );
      if (options.category) query = query.eq("category_id", options.category);
      if (options.featured) query = query.eq("featured", true);
      query =
        options.sort === "price-asc"
          ? query.order("price")
          : options.sort === "price-desc"
            ? query.order("price", { ascending: false })
            : query.order("created_at", { ascending: false });
      const offset = (options.page ?? 0) * 12;
      const { data, error, count } = await query.order("id").range(offset, offset + 11);
      if (error) throw error;
      return { products: data as ShopProduct[], count: count ?? 0 };
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    enabled: isConfigured,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from("products")
        .select("*,categories(*),product_variants(*)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as ShopProduct | null;
    },
  });
}

export async function placeOrder(input: CheckoutInput) {
  const { data, error } = await requireSupabase().rpc("checkout", input);
  if (error) throw error;
  return data as string;
}

export async function getAddresses(userId: string) {
  const { data, error } = await requireSupabase()
    .from("addresses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Address[];
}

export async function getOrders(userId: string, page = 0) {
  const { data, error, count } = await requireSupabase()
    .from("orders")
    .select("*,order_items(*)", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(page * 10, page * 10 + 9);
  if (error) throw error;
  return { orders: data as Order[], count: count ?? 0 };
}

export const orderLabels = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};
export const emptyAddress = {
  recipient: "",
  phone: "",
  line1: "",
  ward: "",
  district: "",
  city: "",
};
