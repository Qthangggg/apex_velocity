import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const { user, isAdmin, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading && !busy) {
      void navigate({ to: isAdmin ? "/admin" : "/account", replace: true });
    }
  }, [user, isAdmin, authLoading, busy, navigate]);

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
        if (data.session) {
          await refreshProfile(data.user);
          let destination: "/admin" | "/account" = "/account";
          if (data.user) {
            const { data: profile } = await client
              .from("profiles")
              .select("role,is_active")
              .eq("id", data.user.id)
              .maybeSingle();
            if (profile?.role === "admin" && profile.is_active) {
              destination = "/admin";
            }
          }
          await navigate({ to: destination, replace: true });
        } else {
          setMessage(
            "Vui lòng kiểm tra email để xác nhận đăng ký. Nếu đã có tài khoản, hãy đăng nhập hoặc đặt lại mật khẩu.",
          );
        }
      } else {
        const { data, error: failure } = await client.auth.signInWithPassword({ email, password });
        if (failure) throw failure;
        await refreshProfile(data.user);
        let destination: "/admin" | "/account" = "/account";
        if (data.user) {
          const { data: profile } = await client
            .from("profiles")
            .select("role,is_active")
            .eq("id", data.user.id)
            .maybeSingle();
          if (profile?.role === "admin" && profile.is_active) {
            destination = "/admin";
          }
        }
        await navigate({ to: destination, replace: true });
      }
    } catch (failure) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setBusy(true);
    setError(null);
    setMessage("");
    try {
      const client = requireSupabase();
      const { error: failure } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: siteUrl() + "/account",
        },
      });
      if (failure) throw failure;
    } catch (failure) {
      setError(failure);
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
            <Link to={isAdmin ? "/admin" : "/account"} className="text-primary underline">
              {isAdmin ? "Mở trang quản trị" : "Mở tài khoản"}
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

        {mode !== "forgot" && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-border" />
              <span className="absolute bg-card px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hoặc
              </span>
            </div>
            <button
              type="button"
              disabled={busy || !isConfigured}
              onClick={handleGoogleLogin}
              className="mt-6 flex w-full items-center justify-center gap-3 border border-border bg-background py-3.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              Đăng nhập bằng Google
            </button>
          </div>
        )}

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
