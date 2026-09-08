import { Link } from "@tanstack/react-router";
import { Heart, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useAuth } from "@/lib/auth-context";
import { requireSupabase, isConfigured } from "@/lib/supabase";
import { errorMessage } from "@/lib/shop-api";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { totalCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user, isAdmin } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-17 max-w-[1540px] items-center gap-3 px-4 sm:gap-5 sm:px-8">
        <Link to="/" className="shrink-0 font-display text-lg font-extrabold italic sm:text-2xl">
          APEX VELOCITY
        </Link>
        <nav className="mx-auto hidden items-center gap-8 lg:flex" aria-label="Điều hướng chính">
          <Link to="/" activeOptions={{ exact: true }} className="nav-link">
            TRANG CHỦ
          </Link>
          <Link to="/shop" className="nav-link">
            BỘ SƯU TẬP
          </Link>
          <a href="/#training" className="nav-link">
            NỔI BẬT
          </a>
          <Link to="/help" className="nav-link">
            HỖ TRỢ
          </Link>
          {isAdmin && (
            <Link to="/admin" className="nav-link">
              QUẢN TRỊ
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/shop" aria-label="Tìm kiếm" title="Tìm kiếm">
              <Search />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="relative"
            title="Danh sách yêu thích"
          >
            <Link
              to="/account"
              search={{ tab: "wishlist" } as never}
              aria-label={"Yêu thích, " + wishlistCount + " sản phẩm"}
            >
              <Heart className={wishlistCount > 0 ? "fill-primary text-primary" : ""} />
              {wishlistCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {wishlistCount > 9 ? "9+" : wishlistCount}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" asChild className="hidden px-2 sm:inline-flex">
            <Link to={user ? "/account" : "/login"}>
              <UserRound />
              {user ? "TÀI KHOẢN" : "ĐĂNG NHẬP"}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/cart" aria-label={"Giỏ hàng, " + totalCount + " sản phẩm"}>
              <ShoppingBag />
              {totalCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {totalCount > 9 ? "9+" : totalCount}
                </span>
              )}
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="border-t border-border bg-background px-5 py-5 lg:hidden"
          aria-label="Điều hướng di động"
        >
          <div className="flex flex-col gap-4 text-sm font-semibold">
            <Link to="/" onClick={() => setOpen(false)}>
              TRANG CHỦ
            </Link>
            <Link to="/shop" onClick={() => setOpen(false)}>
              BỘ SƯU TẬP
            </Link>
            <Link to="/help" onClick={() => setOpen(false)}>
              HỖ TRỢ
            </Link>
            <Link to={user ? "/account" : "/login"} onClick={() => setOpen(false)}>
              {user ? "TÀI KHOẢN" : "ĐĂNG NHẬP"}
            </Link>
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)}>
                QUẢN TRỊ
              </Link>
            )}
            <Link
              to="/account"
              search={{ tab: "wishlist" } as never}
              onClick={() => setOpen(false)}
            >
              YÊU THÍCH ({wishlistCount})
            </Link>
            <Link to="/cart" onClick={() => setOpen(false)}>
              GIỎ HÀNG ({totalCount})
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
export function SiteFooter() {
  const { user, profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function subscribe(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!user || !profile?.is_active) {
      setError("Vui lòng đăng nhập bằng tài khoản đang hoạt động để đăng ký nhận tin.");
      return;
    }
    const email = String(new FormData(event.currentTarget).get("newsletter_email")).trim();
    setBusy(true);
    try {
      const { error: failure } = await requireSupabase().rpc("subscribe_newsletter", {
        p_email: email,
      });
      if (failure) throw failure;
      setMessage("Đã lưu đăng ký nhận tin. Cảm ơn bạn!");
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <footer className="bg-footer text-footer-foreground">
      <div className="mx-auto max-w-[1540px] px-5 py-15 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-base text-footer-muted sm:text-lg">
            Tham gia cộng đồng Apex Velocity để nhận thông tin bộ sưu tập và cập nhật từ cửa hàng.
          </p>
          <form className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={subscribe}>
            <input
              required
              type="email"
              name="newsletter_email"
              aria-label="Email đăng ký nhận tin"
              placeholder="NHẬP EMAIL CỦA BẠN"
              maxLength={254}
              className="h-14 min-w-0 border border-footer-border bg-transparent px-5 text-sm text-footer-foreground outline-none placeholder:text-footer-muted focus:border-primary"
            />
            <Button variant="sport" size="xl" type="submit" disabled={busy || !isConfigured}>
              {busy ? "ĐANG LƯU…" : "ĐĂNG KÝ"}
            </Button>
          </form>
          {message && (
            <p role="status" className="mt-4 text-sm text-primary">
              {message}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm">
              {error}{" "}
              {!user && (
                <Link to="/login" className="underline">
                  Đăng nhập
                </Link>
              )}
            </p>
          )}
          <p className="mt-5 text-xs tracking-widest text-footer-muted">
            ĐĂNG KÝ TỰ NGUYỆN ·{" "}
            <Link to="/help" hash="privacy" className="underline">
              THÔNG TIN BẢO MẬT
            </Link>
          </p>
        </div>
        <div className="mt-20 grid gap-10 border-b border-footer-border pb-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-extrabold italic">APEX VELOCITY</p>
            <p className="mt-5 max-w-xs leading-7 text-footer-muted">
              Dành cho những người không chấp nhận giới hạn. Trang phục hiệu suất cho hành trình của
              bạn.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest">MUA SẮM</h2>
            <ul className="mt-5 space-y-4 text-footer-muted">
              <li>
                <Link to="/shop">Tất cả sản phẩm</Link>
              </li>
              <li>
                <a href="/#new-arrivals">Hàng mới</a>
              </li>
              <li>
                <Link to="/cart">Giỏ hàng</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest">TÀI KHOẢN</h2>
            <ul className="mt-5 space-y-4 text-footer-muted">
              <li>
                <Link to="/account">Đơn hàng của tôi</Link>
              </li>
              <li>
                <Link to="/account">Hồ sơ & địa chỉ</Link>
              </li>
              <li>
                <Link to="/login">Đăng nhập / Đăng ký</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-widest">HỖ TRỢ</h2>
            <ul className="mt-5 space-y-4 text-footer-muted">
              <li>
                <Link to="/help" hash="shipping">
                  Giao hàng & thanh toán
                </Link>
              </li>
              <li>
                <Link to="/help" hash="returns">
                  Hủy đơn & đổi trả
                </Link>
              </li>
              <li>
                <Link to="/help" hash="privacy">
                  Bảo mật & dữ liệu
                </Link>
              </li>
              <li>
                <Link to="/help" hash="contact">
                  Liên hệ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="pt-6 text-center text-sm text-footer-muted">
          © 2026 Apex Velocity. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
