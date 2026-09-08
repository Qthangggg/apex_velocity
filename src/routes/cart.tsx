import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/shop-feedback";
import { formatPrice, useCart } from "@/lib/cart-context";
import { useConfirm } from "@/components/confirm-dialog";
export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Giỏ hàng — Apex Velocity" }] }),
  component: CartPage,
});
function CartPage() {
  const { items, totalPrice, totalCount, isReady, updateQuantity, removeItem, clearCart } =
    useCart();
  const confirm = useConfirm();
  const shipping = totalPrice >= 1500000 || !items.length ? 0 : 30000;
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[65vh] max-w-[1540px] px-5 py-12 sm:px-8">
        <h1 className="font-display text-4xl font-black italic sm:text-5xl">
          GIỎ HÀNG <span className="text-primary">({totalCount})</span>
        </h1>
        <div className="mb-10 mt-5 h-1 w-20 bg-primary" />
        {!isReady ? (
          <Loading />
        ) : !items.length ? (
          <div className="py-16 text-center">
            <ShoppingBag className="mx-auto mb-5 h-12 w-12 text-muted-foreground" />
            <p className="mb-6 text-muted-foreground">
              Giỏ hàng đang trống. Khám phá bộ sưu tập mới.
            </p>
            <Button variant="sport" asChild>
              <Link to="/shop">MUA SẮM NGAY</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <section className="space-y-6">
              {items.map((item) => (
                <article key={item.key} className="flex gap-4 border-b border-border pb-6 sm:gap-6">
                  <Link
                    to="/product/$slug"
                    params={{ slug: item.slug }}
                    className="h-24 w-24 shrink-0 bg-product sm:h-32 sm:w-32"
                  >
                    <img
                      src={item.image || "/images/category-running.jpg"}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="font-semibold"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.color} · {item.size}
                    </p>
                    <p className="mt-2 text-sm">{formatPrice(item.priceValue)}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center border border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={"Giảm " + item.name}
                          disabled={item.quantity <= 1}
                          onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        >
                          <Minus size={16} />
                        </Button>
                        <span className="w-8 text-center" aria-live="polite">
                          {item.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={"Tăng " + item.name}
                          disabled={item.quantity >= 99}
                          onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        >
                          <Plus size={16} />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={"Xóa " + item.name}
                        onClick={() => removeItem(item.key)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                  <p className="hidden font-semibold sm:block">
                    {formatPrice(item.priceValue * item.quantity)}
                  </p>
                </article>
              ))}
              <Button
                variant="outline"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Xóa giỏ hàng",
                      description: "Bạn có chắc muốn xóa toàn bộ sản phẩm trong giỏ hàng?",
                      confirmText: "Xóa toàn bộ",
                      cancelText: "Giữ lại",
                      variant: "destructive",
                    })
                  )
                    clearCart();
                }}
              >
                Xóa giỏ hàng
              </Button>
            </section>
            <aside className="h-fit border border-border p-6">
              <h2 className="text-sm font-bold tracking-widest">TÓM TẮT ĐƠN HÀNG</h2>
              <div className="my-6 space-y-3 text-sm">
                <p className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{formatPrice(totalPrice)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Giao hàng dự kiến</span>
                  <span>{shipping ? formatPrice(shipping) : "Miễn phí"}</span>
                </p>
              </div>
              <p className="flex justify-between border-t border-border pt-5 font-bold">
                <span>Dự kiến</span>
                <span>{formatPrice(totalPrice + shipping)}</span>
              </p>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">
                Giá và tồn kho sẽ được kiểm tra lại khi đặt hàng. Miễn phí giao hàng cho đơn từ
                1.500.000₫ trước giảm giá.
              </p>
              <Button variant="sport" size="xl" className="mt-6 w-full" asChild>
                <Link to="/checkout">THANH TOÁN</Link>
              </Button>
              <Button variant="outline" className="mt-3 w-full" asChild>
                <Link to="/shop">TIẾP TỤC MUA SẮM</Link>
              </Button>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
