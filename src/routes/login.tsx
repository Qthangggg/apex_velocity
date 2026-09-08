import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [
    { title: "Đăng nhập — Apex Velocity" },
    { name: "description", content: "Đăng nhập Apex Velocity để theo dõi đơn hàng và thanh toán nhanh hơn." },
    { property: "og:title", content: "Đăng nhập — Apex Velocity" },
    { property: "og:description", content: "Truy cập tài khoản mua sắm Apex Velocity của bạn." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: LoginPage,
});

function LoginPage() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <main className="min-h-screen bg-auth px-4 py-8 sm:py-12">
      <Link to="/" className="mx-auto block w-fit font-display text-2xl font-extrabold italic">APEX VELOCITY</Link>
      <section className="mx-auto mt-9 max-w-xl border border-border bg-card p-6 shadow-auth sm:p-10">
        <p className="text-sm font-semibold tracking-[0.16em] text-primary">CHÀO MỪNG TRỞ LẠI</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold italic">ĐĂNG NHẬP</h1>
        <p className="mt-2 text-muted-foreground">Theo dõi đơn hàng và thanh toán nhanh hơn.</p>
        <Button variant="outline" size="xl" className="mt-8 w-full" type="button"><span className="text-lg font-bold">G</span> Tiếp tục với Google</Button>
        <div className="my-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-xs tracking-[0.15em] text-muted-foreground"><span className="h-px bg-border" /><span>HOẶC</span><span className="h-px bg-border" /></div>
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
          <div className="space-y-2"><Label htmlFor="email">EMAIL</Label><Input id="email" type="email" required placeholder="you@example.com" /></div>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label htmlFor="password">MẬT KHẨU</Label><a href="#" className="text-sm text-primary">Quên mật khẩu?</a></div>
            <Input id="password" type="password" required placeholder="••••••••••" />
          </div>
          <Button variant="sport" size="xl" className="w-full" type="submit">Đăng nhập</Button>
          {submitted && <p role="status" className="text-center text-sm text-primary">Giao diện đăng nhập đã sẵn sàng để kết nối tài khoản.</p>}
        </form>
        <p className="mt-7 text-center text-muted-foreground">Chưa có tài khoản? <a href="#" className="font-semibold text-primary">Đăng ký ngay</a></p>
      </section>
    </main>
  );
}