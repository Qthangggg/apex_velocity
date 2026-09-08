import { useState, type FormEvent } from "react";
import { useIsMutating, useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { requireSupabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/cart-context";
import type { Category, ShopProduct } from "@/lib/shop-types";
import { VariantEditor } from "./variants";
import {
  ActiveBadge,
  Check,
  ErrorNotice,
  Field,
  inputClass,
  ListState,
  Notice,
  PAGE_SIZE,
  Pagination,
  panelClass,
  SectionHeading,
  Table,
} from "./admin-shared";
import {
  readNumber,
  readSlug,
  requiredText,
  useAdminIdentity,
  useAdminMutation,
  validImageUrl,
} from "./admin-data";

export function AdminProducts() {
  const identity = useAdminIdentity();
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [editor, setEditor] = useState<ShopProduct | "new" | null>(null);
  const [notice, setNotice] = useState("");
  const products = useQuery({
    queryKey: ["admin", identity, "products", page, filter],
    queryFn: async () => {
      let request = requireSupabase()
        .from("products")
        .select("*,categories(*),product_variants(*)", { count: "exact" });
      if (filter !== "all") request = request.eq("is_active", filter === "active");
      const { data, count, error } = await request
        .order("created_at", { ascending: false })
        .order("id")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as ShopProduct[], total: count ?? 0 };
    },
  });
  const remove = useAdminMutation(
    async (product: ShopProduct) => {
      const client = requireSupabase();
      const deleted = await client
        .from("products")
        .delete()
        .eq("id", product.id)
        .select("id")
        .single();
      if (!deleted.error)
        return "Đã xóa sản phẩm. Ảnh trong kho lưu trữ không bị xóa để bảo toàn liên kết lịch sử.";
      if (deleted.error.code !== "23503") throw deleted.error;
      if (
        !window.confirm(
          "Không thể xóa sản phẩm khi còn biến thể hoặc dữ liệu liên quan, kể cả chưa có đơn hàng. Để xóa vĩnh viễn, hãy xóa từng biến thể chưa liên kết với đơn hàng trước rồi thử lại; biến thể có lịch sử đơn hàng không thể xóa. Bạn muốn lưu trữ bằng cách ẩn sản phẩm thay thế? Lịch sử và tồn kho sẽ được giữ nguyên.",
        )
      )
        return "Chưa xóa hoặc lưu trữ sản phẩm. Mở Sửa để xóa từng biến thể chưa có lịch sử đơn hàng rồi thử xóa sản phẩm lại, hoặc tắt trạng thái hoạt động để lưu trữ.";
      const archived = await client
        .from("products")
        .update({ is_active: false })
        .eq("id", product.id)
        .select("id")
        .single();
      if (archived.error) throw archived.error;
      return "Đã lưu trữ sản phẩm (ngừng hiển thị). Lịch sử đơn hàng, biến thể và tồn kho được giữ nguyên.";
    },
    (message) => {
      setNotice(message);
      setEditor(null);
    },
  );

  if (editor)
    return (
      <div className="space-y-5">
        {notice && <Notice>{notice}</Notice>}
        <ProductEditor
          key={editor === "new" ? "new" : editor.id}
          product={editor === "new" ? null : editor}
          onClose={() => {
            if (window.confirm("Đóng trình chỉnh sửa? Thay đổi chưa lưu sẽ bị bỏ qua."))
              setEditor(null);
          }}
          onSaved={(product) => {
            setEditor(product);
            setNotice("Đã lưu thông tin sản phẩm. Biến thể và tồn kho có nút lưu riêng bên dưới.");
          }}
        />
      </div>
    );

  return (
    <section className="space-y-6">
      <SectionHeading
        title="Sản phẩm"
        description="Quản lý danh mục hàng hóa, hình ảnh và tồn kho theo biến thể."
      >
        <Button
          variant="sport"
          disabled={remove.isPending}
          onClick={() => {
            setNotice("");
            setEditor("new");
          }}
        >
          Thêm sản phẩm
        </Button>
      </SectionHeading>
      <div className="max-w-xs">
        <Field label="Lọc hiển thị">
          <select
            className={inputClass}
            value={filter}
            disabled={remove.isPending}
            onChange={(event) => {
              setFilter(event.target.value);
              setPage(0);
            }}
          >
            <option value="all">Tất cả sản phẩm</option>
            <option value="active">Đang hoạt động</option>
            <option value="hidden">Đã ẩn / lưu trữ</option>
          </select>
        </Field>
      </div>
      {notice && <Notice>{notice}</Notice>}
      <ErrorNotice error={remove.error} />
      <ListState
        pending={products.isPending}
        error={products.error}
        empty={!products.data?.rows.length}
        retry={() => void products.refetch()}
      />
      {products.data && !products.error && (
        <>
          {!!products.data.rows.length && (
            <Table
              caption="Danh sách sản phẩm"
              headings={["Sản phẩm", "Danh mục", "Giá / Tồn kho", "Hiển thị", "Thao tác"]}
            >
              {products.data.rows.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="flex items-start gap-3">
                      {product.images[0] && validImageUrl(product.images[0]) && (
                        <img
                          src={product.images[0]}
                          alt=""
                          className="size-14 shrink-0 bg-muted object-cover"
                          loading="lazy"
                        />
                      )}
                      <div>
                        <p className="max-w-64 font-bold">{product.name}</p>
                        <p className="mt-1 max-w-64 break-all text-xs text-muted-foreground">
                          /{product.slug}
                        </p>
                        {product.featured && (
                          <p className="mt-1 text-xs font-semibold text-primary">Nổi bật</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{product.categories?.name || "Chưa phân loại"}</td>
                  <td>
                    <p className="font-semibold">{formatPrice(product.price)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.product_variants.reduce(
                        (total, variant) => total + (variant.is_active ? variant.stock : 0),
                        0,
                      )}{" "}
                      có thể bán · {product.product_variants.length} biến thể
                    </p>
                  </td>
                  <td>
                    <ActiveBadge active={product.is_active} />
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => setEditor(product)}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          if (
                            window.confirm(
                              'Xóa sản phẩm "' +
                                product.name +
                                '"? Sản phẩm còn biến thể hoặc dữ liệu liên quan sẽ không thể xóa, kể cả chưa có đơn hàng. Bạn sẽ được chọn lưu trữ thay thế.',
                            )
                          ) {
                            setNotice("");
                            remove.mutate(product);
                          }
                        }}
                      >
                        Xóa
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </Table>
          )}
          <Pagination
            page={page}
            total={products.data.total}
            busy={products.isFetching || remove.isPending}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}

function ProductEditor({
  product,
  onClose,
  onSaved,
}: {
  product: ShopProduct | null;
  onClose: () => void;
  onSaved: (product: ShopProduct) => void;
}) {
  const identity = useAdminIdentity();
  const mutations = useIsMutating();
  const [images, setImages] = useState(product?.images.join("\n") ?? "");
  const [notice, setNotice] = useState("");
  const categories = useQuery({
    queryKey: ["admin", identity, "category-options"],
    queryFn: async () => {
      const { data, count, error } = await requireSupabase()
        .from("categories")
        .select("*", { count: "exact" })
        .order("name")
        .order("id")
        .range(0, 999);
      if (error) throw error;
      return { rows: (data ?? []) as Category[], total: count ?? 0 };
    },
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (images.split(/\r?\n/).filter((image) => image.trim()).length >= 20)
        throw new Error("Đã đạt giới hạn 20 ảnh. Hãy bỏ một đường dẫn ảnh trước khi tải thêm.");
      const extensions: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/avif": "avif",
      };
      const extension = extensions[file.type];
      if (!extension || file.size === 0 || file.size > 5 * 1024 * 1024)
        throw new Error("Chọn ảnh JPEG, PNG, WebP hoặc AVIF, không rỗng và tối đa 5 MB.");
      const client = requireSupabase();
      const path = "products/" + crypto.randomUUID() + "." + extension;
      const { error } = await client.storage
        .from("product-images")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      return client.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    },
    onSuccess: (url) => {
      setImages((current) => (current.trim() ? current.trim() + "\n" + url : url));
      setNotice(
        "Ảnh đã tải lên. Bấm Lưu sản phẩm để gắn ảnh vào sản phẩm. Ảnh tải lên vẫn tồn tại nếu bạn đóng mà chưa lưu.",
      );
    },
  });
  const save = useAdminMutation(
    async (form: FormData) => {
      const price = readNumber(form, "price", "Giá bán");
      const compare = String(form.get("compare_at_price") ?? "").trim();
      const compareAtPrice = compare ? readNumber(form, "compare_at_price", "Giá gốc") : null;
      if (compareAtPrice !== null && compareAtPrice < price)
        throw new Error(
          "Giá gốc phải bằng hoặc lớn hơn giá bán, hoặc để trống nếu không giảm giá.",
        );
      const imageUrls = images
        .split(/\r?\n/)
        .map((image) => image.trim())
        .filter(Boolean);
      if (!imageUrls.length || imageUrls.some((url) => !validImageUrl(url)))
        throw new Error(
          "Cần ít nhất một ảnh. Mỗi dòng phải là URL HTTPS hoặc đường dẫn bắt đầu bằng / (không dùng //).",
        );
      if (imageUrls.length > 20) throw new Error("Mỗi sản phẩm có tối đa 20 ảnh.");
      const highlights = String(form.get("highlights") ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (highlights.length > 30) throw new Error("Mỗi sản phẩm có tối đa 30 đặc điểm nổi bật.");
      const payload = {
        name: requiredText(form, "name", "Tên sản phẩm"),
        slug: readSlug(form),
        category_id: String(form.get("category_id") || "") || null,
        price,
        compare_at_price: compareAtPrice,
        description: requiredText(form, "description", "Mô tả"),
        tagline: String(form.get("tagline") ?? "").trim(),
        highlights,
        images: imageUrls,
        is_active: form.get("is_active") === "on",
        featured: form.get("featured") === "on",
      };
      const client = requireSupabase();
      const request = product
        ? client.from("products").update(payload).eq("id", product.id)
        : client.from("products").insert(payload);
      const { data, error } = await request.select("*,categories(*),product_variants(*)").single();
      if (error) throw error;
      return data as ShopProduct;
    },
    (saved) => {
      setNotice("Đã lưu sản phẩm. Biến thể và tồn kho được lưu riêng ở bên dưới.");
      onSaved(saved);
    },
  );
  const busy = save.isPending || upload.isPending || mutations > 0;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    upload.reset();
    setNotice("");
    save.mutate(new FormData(event.currentTarget));
  }
  const choices = categories.data?.rows ?? [];
  const missingCategory =
    product?.categories && !choices.some((category) => category.id === product.category_id)
      ? product.categories
      : null;
  return (
    <section className="space-y-6">
      <SectionHeading
        title={product ? "Sửa sản phẩm" : "Sản phẩm mới"}
        description="Lưu thông tin sản phẩm trước, sau đó thêm biến thể với nút lưu riêng."
      >
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Về danh sách
        </Button>
      </SectionHeading>
      <form className={panelClass + " space-y-6"} onSubmit={submit}>
        <fieldset disabled={busy} className="space-y-6">
          <legend className="sr-only">Thông tin sản phẩm</legend>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Tên sản phẩm *">
              <input
                className={inputClass}
                name="name"
                required
                maxLength={160}
                defaultValue={product?.name ?? ""}
              />
            </Field>
            <Field label="Đường dẫn (slug) *" hint="Ví dụ: velocity-runner-x1">
              <input
                className={inputClass}
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={160}
                defaultValue={product?.slug ?? ""}
              />
            </Field>
            <Field label="Danh mục">
              <select
                className={inputClass}
                name="category_id"
                defaultValue={product?.category_id ?? ""}
                disabled={categories.isPending || !!categories.error}
              >
                <option value="">Chưa phân loại</option>
                {missingCategory && (
                  <option value={missingCategory.id}>{missingCategory.name}</option>
                )}
                {choices.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.is_active ? "" : " (đã ẩn)"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Thông điệp ngắn">
              <input
                className={inputClass}
                name="tagline"
                maxLength={250}
                defaultValue={product?.tagline ?? ""}
              />
            </Field>
            <Field label="Giá bán (VND) *">
              <input
                className={inputClass}
                name="price"
                type="number"
                required
                min="0"
                max="1000000000"
                step="1"
                defaultValue={product?.price ?? ""}
              />
            </Field>
            <Field
              label="Giá gốc (VND)"
              hint="Để trống nếu không giảm giá; không thấp hơn giá bán."
            >
              <input
                className={inputClass}
                name="compare_at_price"
                type="number"
                min="0"
                max="1000000000"
                step="1"
                defaultValue={product?.compare_at_price ?? ""}
              />
            </Field>
          </div>
          <Field label="Mô tả *">
            <textarea
              className={inputClass}
              name="description"
              required
              maxLength={20000}
              rows={5}
              defaultValue={product?.description ?? ""}
            />
          </Field>
          <Field label="Đặc điểm nổi bật" hint="Mỗi dòng là một đặc điểm; tối đa 30 dòng.">
            <textarea
              className={inputClass}
              name="highlights"
              rows={4}
              defaultValue={product?.highlights.join("\n") ?? ""}
            />
          </Field>
          <Field
            label="Đường dẫn hình ảnh *"
            hint="Tối đa 20 ảnh, mỗi dòng một URL HTTPS hoặc đường dẫn /images/… Ảnh đầu tiên là ảnh đại diện."
          >
            <textarea
              className={inputClass}
              name="images"
              required
              rows={4}
              value={images}
              onChange={(event) => setImages(event.target.value)}
            />
          </Field>
          <Field
            label="Tải ảnh lên"
            hint="JPEG / PNG / WebP / AVIF, tối đa 5 MB mỗi ảnh. Ảnh được lưu vào product-images."
          >
            <input
              className={inputClass}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  save.reset();
                  setNotice("");
                  upload.mutate(file);
                }
                event.target.value = "";
              }}
            />
          </Field>
          <div className="flex flex-wrap gap-3">
            {images
              .split(/\r?\n/)
              .map((image) => image.trim())
              .filter(validImageUrl)
              .slice(0, 8)
              .map((image, index) => (
                <img
                  key={index + image}
                  src={image}
                  alt={"Xem trước ảnh " + (index + 1)}
                  className="size-24 border bg-muted object-cover"
                  loading="lazy"
                />
              ))}
          </div>
          <div className="flex flex-wrap gap-6">
            <Check
              name="is_active"
              label="Hoạt động / hiển thị"
              checked={product?.is_active ?? false}
            />
            <Check name="featured" label="Sản phẩm nổi bật" checked={product?.featured ?? false} />
          </div>
          {!product && (
            <p className="text-sm text-muted-foreground">
              Sản phẩm mới mặc định ẩn. Thêm biến thể và tồn kho trước khi bật hiển thị.
            </p>
          )}
        </fieldset>
        {categories.isPending && (
          <p role="status" className="text-sm">
            Đang tải danh mục…
          </p>
        )}
        <ErrorNotice error={categories.error} />
        {categories.error && (
          <Button type="button" variant="outline" onClick={() => void categories.refetch()}>
            Tải lại danh mục
          </Button>
        )}
        {categories.data && categories.data.total > 1000 && (
          <Notice>
            Danh sách chọn giới hạn 1.000 danh mục đầu tiên theo tên. Danh mục hiện tại vẫn được
            giữ; quản lý các danh mục khác trong mục Danh mục.
          </Notice>
        )}
        <ErrorNotice error={save.error || upload.error} />
        {notice && <Notice>{notice}</Notice>}
        <Button
          variant="sport"
          type="submit"
          disabled={busy || categories.isPending || !!categories.error}
        >
          {upload.isPending ? "Đang tải ảnh…" : save.isPending ? "Đang lưu…" : "Lưu sản phẩm"}
        </Button>
      </form>
      {product ? (
        <VariantEditor productId={product.id} />
      ) : (
        <Notice>
          Sau khi lưu sản phẩm, phần quản lý kích cỡ, màu sắc, SKU và tồn kho sẽ xuất hiện tại đây.
        </Notice>
      )}
    </section>
  );
}
