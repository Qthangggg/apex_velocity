import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Check, ShoppingBag, Truck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getProduct, products } from "@/lib/products";
import { useCart } from "@/lib/cart-context";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Không tìm thấy sản phẩm — Apex Velocity" }, { name: "robots", content: "noindex" }] };
    }
    const { name, tagline, description } = loaderData.product;
    const title = `${name} — Apex Velocity`;
    return {
      meta: [
        { title },
        { name: "description", content: description.slice(0, 155) },
        { property: "og:title", content: `${name} · ${tagline}` },
        { property: "og:description", content: description.slice(0, 155) },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [size, setSize] = useState(product.sizes[0]);
  const [color, setColor] = useState(product.colors[0]!.name);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const others = products.filter((item) => item.slug !== product.slug);

  return (
    <div className="bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-[1540px] px-5 py-8 sm:px-8 sm:py-12">
        <nav aria-label="Đường dẫn" className="text-xs tracking-[0.14em] text-muted-foreground">
          <Link to="/" className="hover:text-primary">TRANG CHỦ</Link> <span className="px-2">/</span>
          <span className="text-foreground">{product.name.toUpperCase()}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <div>
            <div className="relative aspect-square overflow-hidden bg-product">
              <img
                src={product.images[activeImage]!.src}
                alt={product.images[activeImage]!.alt}
                width={1200}
                height={1200}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <span className="absolute left-4 top-4 bg-primary px-3 py-1.5 text-[11px] font-bold tracking-[0.15em] text-primary-foreground">
                {product.tagline}
              </span>
            </div>
            {product.images.length > 1 && (
              <div className="mt-4 flex gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={image.src}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Xem ảnh ${index + 1}`}
                    aria-pressed={index === activeImage}
                    className={`relative h-20 w-20 overflow-hidden border sm:h-24 sm:w-24 ${index === activeImage ? "border-primary" : "border-border"}`}
                  >
                    <img src={image.src} alt={image.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="font-display text-4xl font-black italic sm:text-5xl">{product.name.toUpperCase()}</h1>
            <p className="mt-4 text-2xl font-semibold">{product.price}</p>
            <p className="mt-5 leading-7 text-muted-foreground">{product.description}</p>

            <div className="mt-9">
              <p className="text-xs font-bold tracking-[0.16em]">MÀU SẮC</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.colors.map((option) => (
                  <button
                    key={option.name}
                    type="button"
                    onClick={() => { setColor(option.name); setAdded(false); }}
                    aria-pressed={color === option.name}
                    className={`flex items-center gap-2 border px-3 py-2 text-sm ${color === option.name ? "border-primary text-primary" : "border-border"}`}
                  >
                    <span className="h-4 w-4 border border-border" style={{ background: option.swatch }} />
                    {option.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs font-bold tracking-[0.16em]">KÍCH CỠ</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {product.sizes.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => { setSize(option); setAdded(false); }}
                    aria-pressed={size === option}
                    className={`h-11 min-w-11 border px-3 text-sm font-semibold ${size === option ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-7">
              <p className="text-xs font-bold tracking-[0.16em]">SỐ LƯỢNG</p>
              <div className="mt-3 flex h-12 w-fit items-center border border-border">
                <button type="button" className="h-full w-12 text-lg" aria-label="Giảm số lượng" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <span aria-live="polite" className="w-12 text-center font-semibold">{quantity}</span>
                <button type="button" className="h-full w-12 text-lg" aria-label="Tăng số lượng" onClick={() => setQuantity((value) => Math.min(9, value + 1))}>+</button>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button
                variant="sport"
                size="xl"
                onClick={() => {
                  addItem({
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    image: product.images[0]!.src,
                    color,
                    size,
                    quantity,
                  });
                  setAdded(true);
                }}
              >
                <ShoppingBag /> THÊM VÀO GIỎ HÀNG
              </Button>
              <Button variant="sportOutline" size="xl" type="button">MUA NGAY</Button>
            </div>
            {added && (
              <p role="status" className="mt-4 flex items-center gap-2 text-sm text-primary">
                <Check size={16} /> Đã thêm {quantity} × {product.name} ({color} · {size}) vào giỏ hàng.
                <Link to="/cart" className="underline hover:text-primary/80">Xem giỏ hàng</Link>
              </p>
            )}

            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Truck size={16} /> Miễn phí giao hàng cho đơn từ 1.500.000₫ · Đổi trả trong 30 ngày
            </p>

            <div className="mt-9 border-t border-border pt-7">
              <p className="text-xs font-bold tracking-[0.16em]">ĐIỂM NỔI BẬT</p>
              <ul className="mt-4 space-y-3 text-muted-foreground">
                {product.highlights.map((item) => (
                  <li key={item} className="flex gap-3"><Check size={18} className="mt-0.5 shrink-0 text-primary" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <section className="mt-16 sm:mt-24" aria-label="Sản phẩm khác">
          <h2 className="font-display text-3xl font-black italic sm:text-4xl">SẢN PHẨM KHÁC</h2>
          <div className="mt-4 h-1 w-20 bg-primary" />
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <Link key={item.slug} to="/product/$slug" params={{ slug: item.slug }} className="group">
                <div className="relative aspect-square overflow-hidden bg-product">
                  <img src={item.images[0]!.src} alt={item.images[0]!.alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                </div>
                <h3 className="mt-4 font-semibold">{item.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.price}</p>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
