import { Link } from "@tanstack/react-router";
import type { ShopProduct } from "@/lib/shop-types";
import { formatPrice } from "@/lib/cart-context";
export function ProductCard({ product }: { product: ShopProduct }) {
  const available = product.product_variants.some(
    (variant) => variant.is_active && variant.stock > 0,
  );
  return (
    <Link to="/product/$slug" params={{ slug: product.slug }} className="group block">
      <div className="relative aspect-square overflow-hidden bg-product">
        <img
          src={product.images[0] || "/images/category-running.jpg"}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {!available && (
          <span className="absolute left-3 top-3 bg-background px-3 py-2 text-xs font-bold">
            HẾT HÀNG
          </span>
        )}
        {product.compare_at_price && product.compare_at_price > product.price && (
          <span className="absolute right-3 top-3 bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
            SALE
          </span>
        )}
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
        {product.categories?.name || "Apex Velocity"}
      </p>
      <h3 className="mt-1 font-semibold">{product.name}</h3>
      <p className="mt-1 text-sm">
        {formatPrice(product.price)}{" "}
        {product.compare_at_price && product.compare_at_price > product.price ? (
          <del className="ml-2 text-muted-foreground">{formatPrice(product.compare_at_price)}</del>
        ) : null}
      </p>
    </Link>
  );
}
