import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { requireSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Failure, Loading } from "@/components/shop-feedback";
export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Đặt lại mật khẩu — Apex Velocity" }] }),
  component: ResetPassword,
});
function ResetPassword() {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== form.get("confirm")) {
      setError(new Error("Mật khẩu không khớp."));
      return;
    }
    setBusy(true);
    try {
      const { error: failure } = await requireSupabase().auth.updateUser({ password });
      if (failure) throw failure;
      setDone(true);
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-lg px-5 py-16">
      <Link to="/" className="font-display text-2xl font-bold italic">
        APEX VELOCITY
      </Link>
      <h1 className="my-8 font-display text-3xl font-black italic">ĐẶT LẠI MẬT KHẨU</h1>
      {loading ? (
        <Loading />
      ) : done ? (
        <p role="status">
          Đã đổi mật khẩu.{" "}
          <Link className="text-primary underline" to="/account">
            Mở tài khoản
          </Link>
        </p>
      ) : !user ? (
        <p>
          Liên kết không hợp lệ hoặc đã hết hạn.{" "}
          <Link to="/login" className="text-primary underline">
            Yêu cầu liên kết mới
          </Link>
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <Label htmlFor="password">Mật khẩu mới</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          <Label htmlFor="confirm">Nhập lại mật khẩu</Label>
          <Input
            id="confirm"
            name="confirm"
            type="password"
            minLength={8}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          {error != null && <Failure error={error} />}
          <Button variant="sport" disabled={busy}>
            {busy ? "Đang lưu…" : "Lưu mật khẩu"}
          </Button>
        </form>
      )}
    </main>
  );
}
