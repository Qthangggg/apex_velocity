import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import accessoriesImage from "@/assets/category-accessories.jpg";
import runningImage from "@/assets/category-running.jpg";
import trainingImage from "@/assets/category-training.jpg";
import packImage from "@/assets/endurance-pack.jpg";
import socksImage from "@/assets/elite-socks.jpg";
import heroImage from "@/assets/apex-hero.jpg";
import { useCatalog } from "@/lib/shop-api";
import { isConfigured } from "@/lib/supabase";
import { ProductCard, ProductCardSkeleton } from "@/components/product-card";
import { Failure, SetupNotice } from "@/components/shop-feedback";
import strengthImage from "@/assets/strength-gear.jpg";
import tracksuitImage from "@/assets/velocity-tracksuit.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Apex Velocity — Trang phục thể thao hiệu suất cao" },
      {
        name: "description",
        content: "Khám phá giày chạy, đồ tập và phụ kiện hiệu suất mới nhất từ Apex Velocity.",
      },
      { property: "og:title", content: "Apex Velocity — Push Your Limits" },
      {
        property: "og:description",
        content: "Trang phục thể thao được thiết kế để bạn vượt qua mọi giới hạn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const categories = [
  { title: "RUNNING", image: runningImage },
  { title: "TRAINING", image: trainingImage },
  { title: "ACCESSORIES", image: accessoriesImage },
];

function HomePage() {
  const catalog = useCatalog({ limit: 4 });
  return (
    <div className="bg-background">
      <SiteHeader />
      <main>
        <section className="relative min-h-[520px] overflow-hidden sm:min-h-[650px]">
          <img
            src={heroImage}
            alt="Vận động viên xuất phát trên đường chạy"
            width={1920}
            height={840}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
          />
          <div className="absolute inset-0 bg-hero-overlay" />
          <div className="relative mx-auto flex min-h-[520px] max-w-[1540px] items-center px-5 sm:min-h-[650px] sm:px-8">
            <div className="max-w-3xl text-hero-foreground">
              <h1 className="font-display text-5xl font-black italic leading-[0.95] sm:text-7xl lg:text-8xl">
                PUSH YOUR
                <br />
                LIMITS
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-hero-muted sm:text-lg">
                Được tạo nên cho hiệu suất đỉnh cao. Trải nghiệm công nghệ thể thao thế hệ mới với
                Velocity Series.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="sport" size="xl" asChild>
                  <Link to="/shop">MUA NGAY</Link>
                </Button>
                <Button variant="sportOutline" size="xl" asChild>
                  <a href="#training">KHÁM PHÁ APEX</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="mx-auto grid max-w-[1540px] gap-5 px-5 py-14 sm:px-8 md:grid-cols-3"
          aria-label="Danh mục nổi bật"
        >
          {categories.map((category) => (
            <a
              key={category.title}
              href="/shop"
              className="group relative min-h-[330px] overflow-hidden"
            >
              <img
                src={category.image}
                alt={`Bộ sưu tập ${category.title.toLowerCase()}`}
                width={900}
                height={620}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-card-overlay" />
              <span className="absolute inset-x-0 bottom-0 p-6 text-hero-foreground">
                <strong className="block font-display text-3xl font-extrabold italic">
                  {category.title}
                </strong>
                <span className="mt-2 flex items-center gap-2 text-sm">
                  Xem bộ sưu tập <ArrowRight size={16} />
                </span>
              </span>
            </a>
          ))}
        </section>

        <section id="new-arrivals" className="mx-auto max-w-[1540px] px-5 py-12 sm:px-8 sm:py-20">
          <SectionTitle title="NEW ARRIVALS" action="XEM TẤT CẢ" />
          {!isConfigured ? (
            <div className="mt-8">
              <SetupNotice />
            </div>
          ) : catalog.isLoading ? (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : catalog.error ? (
            <Failure error={catalog.error} retry={() => void catalog.refetch()} />
          ) : (
            <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4 lg:gap-6">
              {catalog.data?.products.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
              {!catalog.data?.products.length && (
                <p className="col-span-full text-muted-foreground">
                  Bộ sưu tập mới đang được cập nhật.
                </p>
              )}
            </div>
          )}
        </section>

        <section id="training" className="mx-auto max-w-[1540px] px-5 py-12 sm:px-8 sm:py-20">
          <SectionTitle title="APEX COLLECTION" />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="relative min-h-[540px] overflow-hidden bg-footer">
              <img
                src={tracksuitImage}
                alt="Velocity Tracksuit"
                width={1000}
                height={900}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-feature-overlay" />
              <div className="absolute bottom-0 p-7 text-hero-foreground sm:p-10">
                <h3 className="font-display text-4xl font-black italic sm:text-5xl">
                  VELOCITY TRACKSUIT
                </h3>
                <Button variant="sport" size="xl" className="mt-6" asChild>
                  <Link to="/shop">KHÁM PHÁ BỘ SƯU TẬP</Link>
                </Button>
              </div>
            </article>
            <div className="grid gap-6 sm:grid-cols-2">
              <article className="relative min-h-[260px] overflow-hidden sm:col-span-2">
                <img
                  src={strengthImage}
                  alt="Dụng cụ tập sức mạnh"
                  width={1400}
                  height={620}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute right-6 top-7 text-right">
                  <h3 className="font-display text-3xl font-extrabold italic">STRENGTH GEAR</h3>
                  <p className="text-muted-foreground">Dành cho những buổi tập nặng</p>
                </div>
              </article>
              <FeatureProduct
                image={packImage}
                name="Endurance Pack"
                price="Khám phá phụ kiện"
                alt="Túi tập Endurance"
              />
              <FeatureProduct
                image={socksImage}
                name="Elite Socks"
                price="Cho mỗi buổi tập"
                alt="Vớ thể thao Elite"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-end justify-between gap-5">
      <div>
        <h2 className="font-display text-4xl font-black italic sm:text-5xl">{title}</h2>
        <div className="mt-4 h-1 w-20 bg-primary" />
      </div>
      {action && (
        <a href="/shop" className="pb-1 text-xs font-semibold tracking-[0.14em] text-primary">
          {action}
        </a>
      )}
    </div>
  );
}

function FeatureProduct({
  image,
  name,
  price,
  alt,
}: {
  image: string;
  name: string;
  price: string;
  alt: string;
}) {
  return (
    <a href="/shop" className="block relative min-h-[255px] overflow-hidden">
      <img
        src={image}
        alt={alt}
        width={850}
        height={600}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-feature-overlay" />
      <div className="absolute bottom-0 p-5 text-hero-foreground">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p>{price}</p>
      </div>
    </a>
  );
}
