import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import type { ShopProduct } from "@/lib/shop-types";
import { formatPrice } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";

export function ProductCard({ product }: { product: ShopProduct }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const wishlisted = isInWishlist(product.id);
  const available = product.product_variants.some(
    (variant) => variant.is_active && variant.stock > 0,
  );
  return (
    <div className="group relative block">
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
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
            <span className="absolute left-3 bottom-3 bg-primary px-3 py-2 text-xs font-bold text-primary-foreground">
              SALE
            </span>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggleWishlist(product);
        }}
        aria-label={wishlisted ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-transform hover:scale-110 active:scale-95"
      >
        <Heart
          size={18}
          className={
            wishlisted ? "fill-primary text-primary" : "text-muted-foreground hover:text-foreground"
          }
        />
      </button>
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
        <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
          {product.categories?.name || "Apex Velocity"}
        </p>
        <h3 className="mt-1 font-semibold">{product.name}</h3>
        <p className="mt-1 text-sm">
          {formatPrice(product.price)}{" "}
          {product.compare_at_price && product.compare_at_price > product.price ? (
            <del className="ml-2 text-muted-foreground">
              {formatPrice(product.compare_at_price)}
            </del>
          ) : null}
        </p>
      </Link>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="group relative block animate-pulse">
      <div className="relative aspect-square overflow-hidden rounded bg-muted/60" />
      <div className="mt-4 h-3 w-1/3 rounded bg-muted/60" />
      <div className="mt-2 h-4 w-3/4 rounded bg-muted/60" />
      <div className="mt-2 h-4 w-1/2 rounded bg-muted/60" />
    </div>
  );
}
