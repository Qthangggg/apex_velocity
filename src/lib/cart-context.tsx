import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  key: string;
  slug: string;
  name: string;
  price: string;
  priceValue: number;
  image: string;
  color: string;
  size: string;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addItem: (input: {
    slug: string;
    name: string;
    price: string;
    image: string;
    color: string;
    size: string;
    quantity?: number;
  }) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
  isReady: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "apex-cart";

export function parsePrice(price: string): number {
  const digits = price.replace(/\./g, "").replace(/₫/g, "").trim();
  const value = Number(digits);
  return Number.isNaN(value) ? 0 : value;
}

export function formatPrice(value: number): string {
  return `${value.toLocaleString("vi-VN")}₫`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // ignore malformed storage
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, isReady]);

  const addItem = useCallback(
    (input: {
      slug: string;
      name: string;
      price: string;
      image: string;
      color: string;
      size: string;
      quantity?: number;
    }) => {
      const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
      const key = `${input.slug}::${input.color}::${input.size}`;
      const priceValue = parsePrice(input.price);

      setItems((current) => {
        const existing = current.find((item) => item.key === key);
        if (existing) {
          return current.map((item) =>
            item.key === key ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item,
          );
        }
        return [
          ...current,
          {
            key,
            slug: input.slug,
            name: input.name,
            price: input.price,
            priceValue,
            image: input.image,
            color: input.color,
            size: input.size,
            quantity,
          },
        ];
      });
    },
    [],
  );

  const updateQuantity = useCallback((key: string, quantity: number) => {
    const next = Math.max(1, Math.min(99, Math.floor(quantity)));
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, quantity: next } : item)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.priceValue * item.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, addItem, updateQuantity, removeItem, clearCart, totalCount, totalPrice, isReady }),
    [items, addItem, updateQuantity, removeItem, clearCart, totalCount, totalPrice, isReady],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
