import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, MessageSquare, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { submitProductReview, useProductReviews } from "@/lib/shop-api";
import type { ShopProduct } from "@/lib/shop-types";

export function ProductReviewsSection({ product }: { product: ShopProduct }) {
  const { user } = useAuth();
  const reviewsQuery = useProductReviews(product.id);
  const reviews = reviewsQuery.data ?? [];

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  // Thống kê điểm trung bình
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
      : "5.0";

  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage:
      totalReviews > 0
        ? Math.round((reviews.filter((r) => r.rating === star).length / totalReviews) * 100)
        : 0,
  }));

  const filteredReviews = starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews;

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await submitProductReview({
        productId: product.id,
        rating,
        title: title.trim(),
        comment: comment.trim(),
      });
      setSuccess("Cảm ơn bạn! Đánh giá của bạn đã được ghi nhận.");
      setTitle("");
      setComment("");
      void reviewsQuery.refetch();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: unknown }).message)
            : "Có lỗi khi gửi đánh giá. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] text-primary">CẢM NHẬN KHÁCH HÀNG</p>
          <h2 className="mt-2 font-display text-3xl font-black italic sm:text-4xl">
            ĐÁNH GIÁ & NHẬN XÉT
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary" size={24} />
          <span className="font-bold">{totalReviews} đánh giá</span>
        </div>
      </div>

      {/* Thống kê tổng quan */}
      <div className="mt-8 grid gap-8 rounded-none border border-border bg-card p-6 sm:p-8 md:grid-cols-3">
        <div className="flex flex-col items-center justify-center border-b border-border pb-6 text-center md:border-b-0 md:border-r md:pb-0">
          <span className="font-display text-6xl font-black italic text-primary">{avgRating}</span>
          <div className="mt-3 flex items-center gap-1 text-primary">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={20}
                className={
                  s <= Math.round(Number(avgRating)) ? "fill-primary" : "text-muted-foreground"
                }
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Dựa trên {totalReviews} lượt đánh giá thực tế
          </p>
        </div>

        <div className="flex flex-col justify-center space-y-2 border-b border-border pb-6 md:border-b-0 md:border-r md:px-6 md:pb-0">
          {starCounts.map(({ star, count, percentage }) => (
            <button
              key={star}
              type="button"
              onClick={() => setStarFilter(starFilter === star ? null : star)}
              className={
                "flex items-center gap-3 text-xs font-semibold transition-colors hover:text-primary " +
                (starFilter === star ? "text-primary" : "text-muted-foreground")
              }
            >
              <span className="w-12 text-left">{star} sao</span>
              <div className="h-2 flex-1 overflow-hidden bg-muted">
                <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
              </div>
              <span className="w-10 text-right">{count}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center text-center">
          <h3 className="font-display font-extrabold uppercase italic">
            Chia sẻ trải nghiệm của bạn
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Đánh giá của bạn giúp cộng đồng yêu thể thao lựa chọn trang phục vừa vặn và ưng ý nhất.
          </p>
          {user ? (
            <a
              href="#write-review"
              className="mt-4 inline-block bg-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              Viết đánh giá
            </a>
          ) : (
            <Link
              to="/login"
              className="mt-4 inline-block border border-border px-6 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-muted"
            >
              Đăng nhập để đánh giá
            </Link>
          )}
        </div>
      </div>

      {/* Bộ lọc sao */}
      {starFilter && (
        <div className="mt-6 flex items-center gap-3 text-sm">
          <span>
            Đang lọc theo: <strong>{starFilter} sao</strong>
          </span>
          <button
            type="button"
            onClick={() => setStarFilter(null)}
            className="text-xs text-primary underline underline-offset-4"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Danh sách bình luận */}
      <div className="mt-8 space-y-4">
        {reviewsQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Đang tải đánh giá…</p>
        ) : filteredReviews.length === 0 ? (
          <div className="border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Chưa có đánh giá nào {starFilter ? `với ${starFilter} sao` : "cho sản phẩm này"}. Hãy là
            người đầu tiên chia sẻ cảm nhận!
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div key={rev.id} className="border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted font-bold text-foreground">
                    {(rev.profiles?.full_name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{rev.profiles?.full_name || "Khách hàng"}</span>
                      {rev.is_verified_purchase && (
                        <span className="flex items-center gap-1 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          <CheckCircle2 size={12} /> Đã mua hàng
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(rev.created_at).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex text-primary">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={16}
                      className={s <= rev.rating ? "fill-primary" : "text-muted-foreground/40"}
                    />
                  ))}
                </div>
              </div>

              {rev.title && <h4 className="mt-3 font-semibold text-foreground">{rev.title}</h4>}
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{rev.comment}</p>
            </div>
          ))
        )}
      </div>

      {/* Form viết đánh giá */}
      <div id="write-review" className="mt-12 border border-border bg-card p-6 sm:p-8">
        <h3 className="font-display text-2xl font-black italic">GỬI ĐÁNH GIÁ CỦA BẠN</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Bạn thấy chất liệu vải, độ ôm, và độ bền của {product.name} như thế nào?
        </p>

        {!user ? (
          <div className="mt-6 border border-primary/20 bg-primary/5 p-5 text-sm">
            Vui lòng{" "}
            <Link to="/login" className="font-bold text-primary underline">
              đăng nhập
            </Link>{" "}
            để gửi đánh giá và chia sẻ trải nghiệm với cộng đồng.
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} className="mt-6 space-y-4">
            <div>
              <Label className="block text-xs font-bold tracking-wider">
                CHỌN ĐÁNH GIÁ CỦA BẠN
              </Label>
              <div className="mt-2 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                    aria-label={`${star} sao`}
                  >
                    <Star
                      size={28}
                      className={
                        (hoverRating ? star <= hoverRating : star <= rating)
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-bold uppercase text-primary">
                  {["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Tuyệt vời"][hoverRating || rating]}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="review-title" className="block text-xs font-bold tracking-wider">
                TIÊU ĐỀ (TÙY CHỌN)
              </Label>
              <Input
                id="review-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="Ví dụ: Vải mặc rất thoáng, chạy bộ 10km rất êm"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="review-comment" className="block text-xs font-bold tracking-wider">
                NHẬN XÉT CHI TIẾT *
              </Label>
              <textarea
                id="review-comment"
                required
                minLength={3}
                maxLength={2000}
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Chia sẻ cảm nhận về kích cỡ, độ co giãn, thoáng khí..."
                className="mt-1.5 w-full border border-input bg-background p-3 text-sm focus-visible:outline-2 focus-visible:outline-primary"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
              >
                {success}
              </p>
            )}

            <Button
              type="submit"
              variant="sport"
              size="lg"
              disabled={submitting || !comment.trim()}
              className="mt-2"
            >
              {submitting ? "Đang gửi…" : "GỬI ĐÁNH GIÁ"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
