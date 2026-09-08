import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { formatPrice, useCart } from "@/lib/cart-context";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Giỏ hàng — Apex Velocity" },
      { name: "description", content: "Xem lại và điều chỉnh sản phẩm bạn đã chọn trước khi thanh toán." },
      { property: "og:title", content: "Giỏ hàng — Apex Velocity" },
      { property: "og:description", content: "Xem lại và điều chỉnh sản phẩm bạn đã chọn trước khi thanh toán." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, updateQuantity, removeItem, totalCount, totalPrice } = useCart();

  return (
    <div className="bg-background">
      <SiteHeader />
      <main className="mx-auto min-h-[60vh] max-w-[1540px] px-5 py-8 sm:px-8 sm:py-12">
        <nav aria-label="Đường dẫn" className="text-xs tracking-[0.14em] text-muted-foreground">
          <Link to="/" className="hover:text-primary">TRANG CHỦ</Link>
          <span className="px-2">/</span>
          <span className="text-foreground">GIỎ HÀNG</span>
        </nav>

        <h1 className="mt-8 font-display text-4xl font-black italic sm:text-5xl">GIỎ HÀNG</h1>
        <p className="mt-2 text-sm text-muted-foreground">{totalCount} sản phẩm</p>

        {items.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center gap-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center border border-border">
              <ShoppingBag size={32} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-semibold">Giỏ hàng của bạn đang trống</p>
            <p className="max-w-sm text-sm text-muted-foreground">Khám phá các sản phẩm mới và thêm vào giỏ hàng để bắt đầu.</p>
            <Button variant="sport" size="xl" asChild>
              <Link to="/">TIẾP TỤC MUA SẮM</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
            <section aria-label="Danh sách sản phẩm" className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.key}
                  className="grid gap-4 border border-border p-4 sm:grid-cols-[120px_1fr] sm:p-5"
                >
                  <Link to="/product/$slug" params={{ slug: item.slug }} className="relative aspect-square overflow-hidden bg-product">
                    <img src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover" />
                  </Link>
                  <div className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="font-semibold">
                            <Link to="/product/$slug" params={{ slug: item.slug }} className="hover:text-primary">
                              {item.name.toUpperCase()}
                            </Link>
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">Màu: {item.color} · Kích cỡ: {item.size}</p>
                        </div>
                        <p className="font-semibold whitespace-nowrap">{item.price}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4">
                      <div className="flex h-11 items-center border border-border">
                        <button
                          type="button"
                          className="h-full w-11 text-lg"
                          aria-label="Giảm số lượng"
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        >
                          <Minus size={16} className="mx-auto" />
                        </button>
                        <span aria-live="polite" className="w-12 text-center font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          className="h-full w-11 text-lg"
                          aria-label="Tăng số lượng"
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        >
                          <Plus size={16} className="mx-auto" />
                        </button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Xoá sản phẩm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeItem(item.key)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit border border-border p-6">
              <h2 className="text-sm font-bold tracking-[0.16em]">TÓM TẮT ĐƠN HÀNG</h2>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="font-semibold">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phí vận chuyển</span>
                  <span className="font-semibold">{totalPrice >= 1500000 ? "Miễn phí" : "Tính sau"}</span>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Truck size={14} /> Miễn phí giao hàng cho đơn từ 1.500.000₫
              </p>
              <div className="mt-6 border-t border-border pt-6">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Tổng cộng</span>
                  <span>{formatPrice(totalPrice)}</span>
                </div>
              </div>
              <Button variant="sport" size="xl" className="mt-6 w-full">
                THANH TOÁN
              </Button>
              <Button variant="outline" size="xl" className="mt-3 w-full rounded-none" asChild>
                <Link to="/">TIẾP TỤC MUA SẮM</Link>
              </Button>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
