import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { Failure, Loading, SetupNotice } from "@/components/shop-feedback";
import { useProduct } from "@/lib/shop-api";
import { isConfigured } from "@/lib/supabase";
import { formatPrice, useCart } from "@/lib/cart-context";
import type { ShopProduct } from "@/lib/shop-types";
export const Route = createFileRoute("/product/$slug")({
  head: () => ({ meta: [{ title: "Chi tiết sản phẩm — Apex Velocity" }] }),
  component: ProductPage,
});
function ProductPage() {
  const { slug } = Route.useParams();
  const product = useProduct(slug);
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[65vh] max-w-[1540px] px-5 py-10 sm:px-8">
        {!isConfigured ? (
          <SetupNotice />
        ) : product.isLoading ? (
          <Loading />
        ) : product.error ? (
          <Failure error={product.error} retry={() => void product.refetch()} />
        ) : product.data ? (
          <ProductDetail key={product.data.id} product={product.data} />
        ) : (
          <div className="py-20 text-center">
            <h1 className="text-2xl font-bold">Sản phẩm không tồn tại hoặc đã ngừng bán</h1>
            <Link to="/shop" className="mt-5 inline-block text-primary underline">
              Khám phá bộ sưu tập
            </Link>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
function ProductDetail({ product }: { product: ShopProduct }) {
  const variants = product.product_variants.filter((variant) => variant.is_active);
  const [variantId, setVariantId] = useState(
    variants.find((variant) => variant.stock > 0)?.id || variants[0]?.id || "",
  );
  const [image, setImage] = useState(product.images[0] || "/images/category-running.jpg");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = variants.find((item) => item.id === variantId);
  const { addItem, items, isReady } = useCart();
  const navigate = useNavigate();
  const existing = items.find((item) => item.variantId === variantId)?.quantity ?? 0;
  const available = variant ? Math.max(0, Math.min(99, variant.stock) - existing) : 0;
  const canAdd =
    isReady && !!variant && quantity <= available && (existing > 0 || items.length < 50);
  function add(buyNow: boolean) {
    if (!canAdd || !variant) return;
    addItem(product, variant, quantity);
    setAdded(true);
    if (buyNow) void navigate({ to: "/checkout" });
  }
  return (
    <>
      <nav
        className="mb-8 flex flex-wrap gap-2 text-xs text-muted-foreground"
        aria-label="Đường dẫn"
      >
        <Link to="/">TRANG CHỦ</Link>
        <span>/</span>
        <Link to="/shop">BỘ SƯU TẬP</Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <div className="aspect-square overflow-hidden bg-product">
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {product.images.map((source, index) => (
              <button
                key={source + index}
                type="button"
                aria-label={"Xem ảnh " + (index + 1)}
                aria-pressed={image === source}
                onClick={() => setImage(source)}
                className={
                  "h-20 w-20 overflow-hidden border-2 " +
                  (image === source ? "border-primary" : "border-transparent")
                }
              >
                <img
                  src={source}
                  alt={product.name + " — ảnh " + (index + 1)}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-primary">
            {product.tagline || product.categories?.name}
          </p>
          <h1 className="mt-4 font-display text-4xl font-black italic sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-5 text-2xl font-semibold">
            {formatPrice(product.price)}{" "}
            {product.compare_at_price && product.compare_at_price > product.price ? (
              <del className="ml-3 text-base text-muted-foreground">
                {formatPrice(product.compare_at_price)}
              </del>
            ) : null}
          </p>
          <p className="mt-6 whitespace-pre-line leading-7 text-muted-foreground">
            {product.description}
          </p>
          <label htmlFor="variant" className="mb-3 mt-8 block text-xs font-bold tracking-widest">
            MÀU SẮC / KÍCH THƯỚC
          </label>
          <select
            id="variant"
            className="h-12 w-full border border-input bg-background px-3"
            value={variantId}
            onChange={(event) => {
              setVariantId(event.target.value);
              setQuantity(1);
              setAdded(false);
            }}
          >
            {variants.map((item) => (
              <option key={item.id} value={item.id} disabled={item.stock === 0}>
                {item.color} / {item.size}
                {item.stock === 0 ? " — Hết hàng" : " — Còn " + item.stock}
              </option>
            ))}
          </select>
          {variants.length === 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Sản phẩm hiện chưa có biến thể bán hàng.
            </p>
          )}
          <label htmlFor="quantity" className="mb-3 mt-6 block text-xs font-bold tracking-widest">
            SỐ LƯỢNG
          </label>
          <input
            id="quantity"
            type="number"
            className="h-12 w-24 border border-input bg-background px-3"
            min={1}
            max={Math.max(1, available)}
            value={quantity}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isInteger(value)) setQuantity(Math.max(1, Math.min(99, value)));
            }}
          />
          {existing > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Đã có {existing} sản phẩm cùng biến thể trong giỏ.
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="sport" size="xl" disabled={!canAdd} onClick={() => add(false)}>
              <ShoppingBag />
              THÊM VÀO GIỎ
            </Button>
            <Button variant="outline" size="xl" disabled={!canAdd} onClick={() => add(true)}>
              MUA NGAY
            </Button>
          </div>
          {!canAdd && isReady && (
            <p className="mt-3 text-sm text-muted-foreground">
              {items.length >= 50 && !existing
                ? "Giỏ hàng đã đạt giới hạn 50 sản phẩm."
                : available === 0
                  ? "Hết hàng hoặc đã đạt số lượng tối đa trong giỏ."
                  : "Số lượng vượt quá tồn kho hiện tại."}
            </p>
          )}
          {added && (
            <p role="status" className="mt-4 flex items-center gap-2 text-sm text-primary">
              <Check size={16} /> Đã thêm vào giỏ.{" "}
              <Link to="/cart" className="underline">
                Xem giỏ hàng
              </Link>
            </p>
          )}
          <p className="mt-6 flex gap-2 text-sm text-muted-foreground">
            <Truck size={18} />
            Miễn phí giao hàng từ 1.500.000₫; đơn khác 30.000₫.
          </p>
          <div className="mt-8 border-t border-border pt-6">
            <h2 className="text-xs font-bold tracking-widest">ĐIỂM NỔI BẬT</h2>
            <ul className="mt-4 space-y-3">
              {product.highlights.map((highlight, index) => (
                <li key={index} className="flex gap-3 text-muted-foreground">
                  <Check size={18} className="shrink-0 text-primary" />
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
