import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ShopProduct, Variant } from "./shop-types";

export type CartItem = {
  key: string;
  variantId: string;
  slug: string;
  name: string;
  priceValue: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
};
type CartContextValue = {
  items: CartItem[];
  addItem: (product: ShopProduct, variant: Variant, quantity: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
  isReady: boolean;
};
const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "apex-cart-v2";
export function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}
export function parsePrice(price: string) {
  const value = Number(price.replace(/[^0-9]/g, ""));
  return Number.isFinite(value) ? value : 0;
}
function validItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const item = value as CartItem;
  return (
    [item.key, item.variantId, item.slug, item.name, item.image, item.color, item.size].every(
      (field) => typeof field === "string",
    ) &&
    /^[0-9a-f-]{36}$/i.test(item.variantId) &&
    item.key === item.variantId &&
    Number.isInteger(item.quantity) &&
    item.quantity >= 1 &&
    item.quantity <= 99 &&
    Number.isFinite(item.priceValue) &&
    item.priceValue >= 0
  );
}
export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        const unique = new Map(
          saved
            .filter(validItem)
            .slice(0, 50)
            .map((item) => [item.key, item]),
        );
        setItems([...unique.values()]);
      }
    } catch {
      setItems([]);
    }
    setIsReady(true);
  }, []);
  useEffect(() => {
    if (isReady) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch {
        return;
      }
    }
  }, [items, isReady]);
  const addItem = useCallback((product: ShopProduct, variant: Variant, quantity: number) => {
    if (!variant.is_active || variant.stock < 1 || !Number.isInteger(quantity) || quantity < 1)
      return;
    setItems((current) => {
      const existing = current.find((item) => item.key === variant.id);
      if (!existing && current.length >= 50) return current;
      const next: CartItem = {
        key: variant.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        priceValue: product.price,
        image: product.images[0] || "",
        color: variant.color,
        size: variant.size,
        quantity: Math.min(99, variant.stock, (existing?.quantity ?? 0) + quantity),
      };
      return existing
        ? current.map((item) => (item.key === variant.id ? next : item))
        : [...current, next];
    });
  }, []);
  const updateQuantity = useCallback((key: string, quantity: number) => {
    if (Number.isInteger(quantity) && quantity >= 1 && quantity <= 99)
      setItems((current) =>
        current.map((item) => (item.key === key ? { ...item, quantity } : item)),
      );
  }, []);
  const removeItem = useCallback(
    (key: string) => setItems((current) => current.filter((item) => item.key !== key)),
    [],
  );
  const clearCart = useCallback(() => setItems([]), []);
  const value = useMemo(
    () => ({
      items,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      isReady,
      totalCount: items.reduce((sum, item) => sum + item.quantity, 0),
      totalPrice: items.reduce((sum, item) => sum + item.quantity * item.priceValue, 0),
    }),
    [items, addItem, updateQuantity, removeItem, clearCart, isReady],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("CartProvider is required");
  return context;
}
