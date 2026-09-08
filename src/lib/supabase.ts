import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
export const isConfigured = Boolean(url && /^https?:\/\//.test(url) && key);
export const supabase = isConfigured
  ? createClient(url!, key!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function requireSupabase() {
  if (!supabase)
    throw new Error(
      "Chưa kết nối cửa hàng. Vui lòng cấu hình Supabase trong môi trường triển khai.",
    );
  return supabase;
}

export function siteUrl() {
  const configured = import.meta.env.VITE_SITE_URL?.trim();
  return (
    configured || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  ).replace(/\/$/, "");
}
