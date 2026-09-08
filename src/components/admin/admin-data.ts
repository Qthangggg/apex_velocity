import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import type { OrderStatus } from "@/lib/shop-types";

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export function useAdminIdentity() {
  const { user } = useAuth();
  return user?.id;
}

export function useAdminMutation<Variables, Result>(
  action: (variables: Variables) => Promise<Result>,
  onSuccess?: (result: Result) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (result) => {
      void queryClient.invalidateQueries();
      onSuccess?.(result);
    },
  });
}

export function requiredText(form: FormData, key: string, label: string) {
  const value = String(form.get(key) ?? "").trim();
  if (!value) throw new Error(`${label} không được để trống.`);
  return value;
}

export function readNumber(
  form: FormData,
  key: string,
  label: string,
  minimum = 0,
  maximum = 1_000_000_000,
) {
  const value = Number(requiredText(form, key, label));
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum)
    throw new Error(`${label} phải là số nguyên từ ${minimum} đến ${maximum}.`);
  return value;
}

export function readSlug(form: FormData) {
  const slug = requiredText(form, "slug", "Đường dẫn");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    throw new Error("Đường dẫn chỉ gồm chữ thường không dấu, số và dấu gạch nối giữa các từ.");
  return slug;
}

export function dateLabel(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function validImageUrl(value: string) {
  if (/[\\\s]/.test(value)) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
