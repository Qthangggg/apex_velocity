import accessoriesImage from "@/assets/category-accessories.jpg";
import runningImage from "@/assets/category-running.jpg";
import trainingImage from "@/assets/category-training.jpg";
import packImage from "@/assets/endurance-pack.jpg";
import socksImage from "@/assets/elite-socks.jpg";
import tracksuitImage from "@/assets/velocity-tracksuit.jpg";
import strengthImage from "@/assets/strength-gear.jpg";

export type Product = {
  slug: string;
  name: string;
  price: string;
  tagline: string;
  description: string;
  highlights: string[];
  sizes: string[];
  colors: { name: string; swatch: string }[];
  images: { src: string; alt: string }[];
};

export const products: Product[] = [
  {
    slug: "velocity-runner-x1",
    name: "Velocity Runner X1",
    price: "2.890.000₫",
    tagline: "GIÀY CHẠY HIỆU SUẤT",
    description:
      "Velocity Runner X1 được tạo ra cho những cú bứt tốc quyết định. Đế giữa hoàn lực cao kết hợp thân giày dệt thoáng khí giúp bàn chân ổn định qua từng bước chạy dài.",
    highlights: [
      "Đế giữa hoàn lực, giảm mỏi trên quãng đường dài",
      "Thân giày dệt liền mạch, thoáng khí",
      "Đế ngoài bám tốt trên đường nhựa và sân tập",
      "Trọng lượng 238g (size 42)",
    ],
    sizes: ["39", "40", "41", "42", "43", "44"],
    colors: [
      { name: "Cam Apex", swatch: "hsl(20 95% 52%)" },
      { name: "Đen than", swatch: "hsl(0 0% 12%)" },
      { name: "Trắng ngà", swatch: "hsl(40 20% 92%)" },
    ],
    images: [
      { src: runningImage, alt: "Velocity Runner X1 nhìn từ bên cạnh" },
      { src: trainingImage, alt: "Velocity Runner X1 trong buổi tập" },
      { src: accessoriesImage, alt: "Chi tiết chất liệu Velocity Runner X1" },
    ],
  },
  {
    slug: "velocity-tracksuit",
    name: "Velocity Tracksuit",
    price: "2.490.000₫",
    tagline: "BỘ ĐỒ TẬP CAO CẤP",
    description:
      "Bộ Velocity Tracksuit giữ ấm khi khởi động và thoát ẩm nhanh khi vào nhịp. Đường cắt ôm nhẹ theo chuyển động, hoàn thiện bằng chi tiết phản quang.",
    highlights: [
      "Vải hai lớp thoát ẩm nhanh",
      "Đường may phẳng chống cọ xát",
      "Chi tiết phản quang cho buổi tập tối",
      "Túi có khoá kéo an toàn",
    ],
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { name: "Đen than", swatch: "hsl(0 0% 12%)" },
      { name: "Xám khói", swatch: "hsl(0 0% 45%)" },
    ],
    images: [
      { src: tracksuitImage, alt: "Velocity Tracksuit toàn bộ" },
      { src: strengthImage, alt: "Velocity Tracksuit khi tập sức mạnh" },
    ],
  },
  {
    slug: "endurance-pack",
    name: "Endurance Pack",
    price: "1.890.000₫",
    tagline: "TÚI TẬP BỀN BỈ",
    description:
      "Túi Endurance Pack đủ chỗ cho cả ngày tập: khoang giày riêng, ngăn ướt và dây đeo phân bổ lực đều trên vai.",
    highlights: [
      "Khoang giày riêng biệt",
      "Ngăn chống ẩm cho đồ tập",
      "Vải chống nước phủ TPU",
      "Thể tích 28L",
    ],
    sizes: ["28L"],
    colors: [
      { name: "Đen than", swatch: "hsl(0 0% 12%)" },
      { name: "Cam Apex", swatch: "hsl(20 95% 52%)" },
    ],
    images: [
      { src: packImage, alt: "Túi Endurance Pack" },
      { src: socksImage, alt: "Phụ kiện đi kèm Endurance Pack" },
    ],
  },
];

export function getProduct(slug: string) {
  return products.find((product) => product.slug === slug);
}
