import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { addToWishlist, getWishlist, removeFromWishlist } from "./shop-api";
import type { ShopProduct, WishlistItem } from "./shop-types";

type WishlistContextValue = {
  wishlistIds: string[];
  wishlistItems: WishlistItem[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: ShopProduct) => Promise<void>;
  count: number;
  loading: boolean;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);
const LOCAL_STORAGE_KEY = "apex-wishlist-ids-v1";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // 1. Tải từ localStorage lần đầu
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlistIds(parsed.filter((id) => typeof id === "string"));
        }
      }
    } catch {
      // Bỏ qua lỗi parse
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // 2. Lưu vào localStorage khi chưa đăng nhập
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(wishlistIds));
    } catch {
      // Bỏ qua lỗi storage
    }
  }, [wishlistIds, isHydrated]);

  // 3. Đồng bộ với Supabase khi user đăng nhập
  useEffect(() => {
    if (!user) {
      setWishlistItems([]);
      return;
    }
    const currentUserId = user.id;
    let cancelled = false;
    async function syncAndFetch() {
      setLoading(true);
      try {
        // Tải từ server
        const remoteItems = await getWishlist(currentUserId);
        if (cancelled) return;

        const remoteIdSet = new Set(remoteItems.map((item) => item.product_id));

        // Nếu có các ID lưu offline ở localStorage mà chưa có trên server -> đồng bộ lên
        const missingOnServer = wishlistIds.filter((id) => !remoteIdSet.has(id));
        if (missingOnServer.length > 0) {
          await Promise.allSettled(missingOnServer.map((id) => addToWishlist(currentUserId, id)));
          const refreshed = await getWishlist(currentUserId);
          if (cancelled) return;
          setWishlistItems(refreshed);
          setWishlistIds(refreshed.map((item) => item.product_id));
        } else {
          setWishlistItems(remoteItems);
          setWishlistIds(remoteItems.map((item) => item.product_id));
        }
      } catch (err) {
        console.error("Lỗi đồng bộ wishlist:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void syncAndFetch();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const isInWishlist = useCallback(
    (productId: string) => wishlistIds.includes(productId),
    [wishlistIds],
  );

  const toggleWishlist = useCallback(
    async (product: ShopProduct) => {
      const exists = wishlistIds.includes(product.id);
      const nextIds = exists
        ? wishlistIds.filter((id) => id !== product.id)
        : [...wishlistIds, product.id];

      setWishlistIds(nextIds);

      if (exists) {
        setWishlistItems((prev) => prev.filter((item) => item.product_id !== product.id));
      } else {
        // Optimistic item
        setWishlistItems((prev) => [
          {
            id: "temp-" + product.id,
            user_id: user?.id ?? "",
            product_id: product.id,
            created_at: new Date().toISOString(),
            products: product,
          },
          ...prev,
        ]);
      }

      if (user) {
        try {
          if (exists) {
            await removeFromWishlist(user.id, product.id);
          } else {
            await addToWishlist(user.id, product.id);
          }
        } catch (err) {
          console.error("Lỗi cập nhật wishlist server:", err);
        }
      }
    },
    [wishlistIds, user],
  );

  const value = useMemo(
    () => ({
      wishlistIds,
      wishlistItems,
      isInWishlist,
      toggleWishlist,
      count: wishlistIds.length,
      loading,
    }),
    [wishlistIds, wishlistItems, isInWishlist, toggleWishlist, loading],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
