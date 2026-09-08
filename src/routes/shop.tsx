import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ProductCard } from "@/components/product-card";
import { Failure, Loading, SetupNotice } from "@/components/shop-feedback";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isConfigured } from "@/lib/supabase";
import { useCatalog, useCategories } from "@/lib/shop-api";
export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Bộ sưu tập — Apex Velocity" },
      {
        name: "description",
        content: "Khám phá giày chạy bộ, trang phục và phụ kiện thể thao Apex Velocity.",
      },
    ],
  }),
  component: ShopPage,
});
function ShopPage() {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(0);
  const catalog = useCatalog({ search, category, sort, page });
  const categories = useCategories();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[65vh] max-w-[1540px] px-5 py-12 sm:px-8">
        <p className="text-xs font-bold tracking-[0.2em] text-primary">HIỆU SUẤT KHÔNG GIỚI HẠN</p>
        <h1 className="mt-3 font-display text-4xl font-black italic sm:text-6xl">BỘ SƯU TẬP</h1>
        <div className="mb-10 mt-5 h-1 w-20 bg-primary" />
        {!isConfigured ? (
          <SetupNotice />
        ) : (
          <>
            <div className="mb-10 flex flex-wrap gap-3">
              <form
                className="flex min-w-60 flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearch(draft);
                  setPage(0);
                }}
              >
                <Input
                  aria-label="Tìm sản phẩm"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={100}
                  placeholder="Tìm giày, trang phục, phụ kiện…"
                />
                <Button type="submit" variant="sport">
                  Tìm kiếm
                </Button>
              </form>
              <select
                aria-label="Danh mục"
                className="h-10 border border-input bg-background px-3 text-sm"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setPage(0);
                }}
              >
                <option value="">Tất cả danh mục</option>
                {categories.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Sắp xếp"
                className="h-10 border border-input bg-background px-3 text-sm"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setPage(0);
                }}
              >
                <option value="newest">Mới nhất</option>
                <option value="price-asc">Giá tăng dần</option>
                <option value="price-desc">Giá giảm dần</option>
              </select>
            </div>
            {categories.error && (
              <Failure error={categories.error} retry={() => void categories.refetch()} />
            )}
            {catalog.isLoading ? (
              <Loading />
            ) : catalog.error ? (
              <Failure error={catalog.error} retry={() => void catalog.refetch()} />
            ) : (
              <>
                <p className="mb-6 text-sm text-muted-foreground">
                  {catalog.data?.count ?? 0} sản phẩm
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-6">
                  {catalog.data?.products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {!catalog.data?.products.length && (
                  <p className="py-16 text-center text-muted-foreground">
                    Không tìm thấy sản phẩm phù hợp. Thử từ khóa hoặc danh mục khác.
                  </p>
                )}
                <div className="mt-10 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Trang trước
                  </Button>
                  <span className="text-sm">Trang {page + 1}</span>
                  <Button
                    variant="outline"
                    disabled={(page + 1) * 12 >= (catalog.data?.count ?? 0)}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Trang sau
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
