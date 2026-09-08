import { Link } from "@tanstack/react-router";
import { Instagram, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const navItems = ["NEW ARRIVALS", "TRAINING", "FOOTWEAR", "SALE"];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto grid h-17 max-w-[1540px] grid-cols-[minmax(0,1fr)_auto] items-center gap-5 px-5 sm:flex sm:px-8">
        <Link to="/" className="font-display text-xl font-extrabold italic sm:text-2xl">
          APEX VELOCITY
        </Link>
        <nav className="mx-auto hidden items-center gap-10 lg:flex" aria-label="Điều hướng chính">
          <Link to="/" activeOptions={{ exact: true }} className="nav-link">HOME</Link>
          {navItems.map((item) => (
            <a key={item} className="nav-link" href={`#${item.toLowerCase().replace(" ", "-")}`}>{item}</a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" aria-label="Tìm kiếm" title="Tìm kiếm"><Search /></Button>
          <Button variant="ghost" asChild className="hidden px-2 sm:inline-flex">
            <Link to="/login"><UserRound /> ĐĂNG NHẬP</Link>
          </Button>
          <Button variant="ghost" size="icon" aria-label="Giỏ hàng" title="Giỏ hàng"><ShoppingBag /></Button>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen((value) => !value)} aria-label="Mở menu">
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border bg-background px-5 py-5 lg:hidden" aria-label="Điều hướng di động">
          <div className="flex flex-col gap-4 text-sm font-semibold">
            <Link to="/" onClick={() => setOpen(false)}>HOME</Link>
            {navItems.map((item) => <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`} onClick={() => setOpen(false)}>{item}</a>)}
            <Link to="/login" onClick={() => setOpen(false)}>ĐĂNG NHẬP</Link>
          </div>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const [sent, setSent] = useState(false);

  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="mx-auto max-w-[1540px] px-5 py-15 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-base text-footer-muted sm:text-lg">Tham gia cộng đồng Apex Velocity để nhận sớm các bộ sưu tập, nội dung tập luyện độc quyền và bí quyết hiệu suất chuyên nghiệp.</p>
          <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={(event) => { event.preventDefault(); setSent(true); }}>
            <input required type="email" aria-label="Email đăng ký" placeholder="NHẬP EMAIL CỦA BẠN" className="h-14 border border-footer-border bg-transparent px-5 text-sm text-footer-foreground outline-none placeholder:text-footer-muted focus:border-primary" />
            <Button variant="sport" size="xl" type="submit">ĐĂNG KÝ</Button>
          </form>
          <p className="mt-5 text-xs tracking-[0.16em] text-footer-muted">{sent ? "CẢM ƠN BẠN ĐÃ ĐĂNG KÝ!" : "KHI ĐĂNG KÝ, BẠN ĐỒNG Ý VỚI CHÍNH SÁCH BẢO MẬT"}</p>
        </div>
        <div className="mt-20 grid gap-10 border-b border-footer-border pb-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-extrabold italic text-footer-foreground">APEX VELOCITY</p>
            <p className="mt-5 max-w-xs leading-7 text-footer-muted">Dành cho những người không chấp nhận giới hạn. Trang phục hiệu suất cho vận động viên ưu tú.</p>
            <div className="mt-6 flex gap-4 text-footer-muted"><Instagram size={19} /><span className="font-bold">↗</span><span className="font-bold">@</span></div>
          </div>
          <FooterColumn title="MUA SẮM" links={["Hàng mới", "Bán chạy", "Đồ tập", "Đồ chạy"]} />
          <FooterColumn title="HỖ TRỢ" links={["Thông tin giao hàng", "Đổi trả", "Hướng dẫn kích cỡ", "Liên hệ"]} />
          <FooterColumn title="PHÁP LÝ" links={["Chính sách bảo mật", "Điều khoản dịch vụ"]} />
        </div>
        <p className="pt-6 text-center text-sm text-footer-muted">© 2026 Apex Velocity. All rights reserved.</p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return <div><p className="text-sm font-bold tracking-[0.15em]">{title}</p><ul className="mt-5 space-y-4 text-footer-muted">{links.map((link) => <li key={link}><a href="#" className="hover:text-footer-foreground">{link}</a></li>)}</ul></div>;
}