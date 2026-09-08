import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Failure, SetupNotice } from "@/components/shop-feedback";
import { isConfigured, requireSupabase, siteUrl } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Tài khoản — Apex Velocity" }] }),
  component: LoginPage,
});
function LoginPage() {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password") || "");
    try {
      const client = requireSupabase();
      if (mode === "forgot") {
        const { error: failure } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: siteUrl() + "/reset-password",
        });
        if (failure) throw failure;
        setMessage(
          "Nếu email đã đăng ký, bạn sẽ nhận được liên kết đặt lại mật khẩu. Kiểm tra cả thư rác.",
        );
      } else if (mode === "register") {
        if (password.length < 8) throw new Error("Mật khẩu cần ít nhất 8 ký tự.");
        if (password !== form.get("confirm")) throw new Error("Hai mật khẩu không khớp.");
        const { data, error: failure } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: String(form.get("name")).trim() },
            emailRedirectTo: siteUrl() + "/account",
          },
        });
        if (failure) throw failure;
        if (data.session) await navigate({ to: "/account" });
        else
          setMessage(
            "Vui lòng kiểm tra email để xác nhận đăng ký. Nếu đã có tài khoản, hãy đăng nhập hoặc đặt lại mật khẩu.",
          );
      } else {
        const { error: failure } = await client.auth.signInWithPassword({ email, password });
        if (failure) throw failure;
        await navigate({ to: "/account" });
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-auth px-4 py-10">
      <Link to="/" className="mx-auto block w-fit font-display text-2xl font-extrabold italic">
        APEX VELOCITY
      </Link>
      <section className="mx-auto mt-9 max-w-xl border border-border bg-card p-6 shadow-auth sm:p-10">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary">CHÀO MỪNG ĐẾN APEX</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold italic">
          {mode === "login" ? "ĐĂNG NHẬP" : mode === "register" ? "TẠO TÀI KHOẢN" : "QUÊN MẬT KHẨU"}
        </h1>
        <p className="mb-8 mt-3 text-muted-foreground">
          Theo dõi đơn hàng và thanh toán nhanh hơn.
        </p>
        {!isConfigured && <SetupNotice />}
        {user && (
          <p className="my-4 text-sm">
            Bạn đã đăng nhập.{" "}
            <Link to="/account" className="text-primary underline">
              Mở tài khoản
            </Link>
          </p>
        )}
        <form className="mt-6 space-y-5" onSubmit={submit}>
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="name">HỌ VÀ TÊN</Label>
              <Input id="name" name="name" autoComplete="name" required maxLength={100} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">EMAIL</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </div>
          {mode !== "forgot" && (
            <div className="space-y-2">
              <Label htmlFor="password">MẬT KHẨU</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={mode === "register" ? 8 : 1}
                maxLength={128}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>
          )}
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="confirm">NHẬP LẠI MẬT KHẨU</Label>
              <Input
                id="confirm"
                name="confirm"
                type="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </div>
          )}
          {error != null && <Failure error={error} />}
          {message && (
            <p role="status" className="border border-primary/30 bg-primary/5 p-4 text-sm">
              {message}
            </p>
          )}
          <Button
            variant="sport"
            size="xl"
            className="w-full"
            type="submit"
            disabled={busy || !isConfigured}
          >
            {busy
              ? "Đang xử lý…"
              : mode === "login"
                ? "Đăng nhập"
                : mode === "register"
                  ? "Đăng ký"
                  : "Gửi liên kết khôi phục"}
          </Button>
        </form>
        <div className="mt-6 flex flex-wrap justify-between gap-4 text-sm">
          {(["login", "register", "forgot"] as const)
            .filter((item) => item !== mode)
            .map((item) => (
              <button
                key={item}
                type="button"
                disabled={busy}
                className="text-primary underline underline-offset-4"
                onClick={() => {
                  setMode(item);
                  setMessage("");
                  setError(null);
                }}
              >
                {item === "login"
                  ? "Đăng nhập"
                  : item === "register"
                    ? "Tạo tài khoản"
                    : "Quên mật khẩu?"}
              </button>
            ))}
        </div>
        <Link to="/" className="mt-8 block text-center text-sm text-muted-foreground">
          ← Quay lại cửa hàng
        </Link>
      </section>
    </main>
  );
}
