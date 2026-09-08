import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/shop-api";

export const PAGE_SIZE = 20;
export const inputClass =
  "w-full min-w-0 rounded-none border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";
export const panelClass = "border border-border bg-background p-4 sm:p-6";

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid content-start gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={checked}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}

export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <div
      role="alert"
      className="border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
    >
      {errorMessage(error)}
    </div>
  ) : null;
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="border-l-2 border-primary bg-muted p-3 text-sm">
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold uppercase tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function ListState({
  pending,
  error,
  empty,
  retry,
}: {
  pending: boolean;
  error: unknown;
  empty: boolean;
  retry: () => void;
}) {
  if (pending)
    return (
      <p role="status" className="p-8 text-center text-muted-foreground">
        Đang tải dữ liệu…
      </p>
    );
  if (error)
    return (
      <div className="space-y-3">
        <ErrorNotice error={error} />
        <Button variant="outline" onClick={retry}>
          Thử lại
        </Button>
      </div>
    );
  if (empty)
    return (
      <p className="border border-dashed p-8 text-center text-muted-foreground">
        Chưa có dữ liệu trong trang này.
      </p>
    );
  return null;
}

export function Pagination({
  page,
  total,
  busy,
  onChange,
}: {
  page: number;
  total: number;
  busy: boolean;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <nav
      aria-label="Phân trang"
      className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
    >
      <p className="text-sm text-muted-foreground">
        {total} bản ghi · Trang {page + 1} / {pages}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" disabled={busy || page === 0} onClick={() => onChange(page - 1)}>
          Trước
        </Button>
        <Button
          variant="outline"
          disabled={busy || page + 1 >= pages}
          onClick={() => onChange(page + 1)}
        >
          Sau
        </Button>
      </div>
    </nav>
  );
}

export function Table({
  headings,
  children,
  caption,
}: {
  headings: string[];
  children: ReactNode;
  caption: string;
}) {
  const captionId = useId();
  return (
    <div
      tabIndex={0}
      role="region"
      aria-labelledby={captionId}
      className="overflow-x-auto border focus-visible:outline-primary"
    >
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption id={captionId} className="sr-only">
          {caption}
        </caption>
        <thead className="bg-muted text-xs uppercase tracking-wider">
          <tr>
            {headings.map((heading) => (
              <th key={heading} scope="col" className="px-4 py-3 font-semibold">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y [&_td]:px-4 [&_td]:py-4 [&_td]:align-top">{children}</tbody>
      </table>
    </div>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2 py-1 text-xs font-semibold ${active ? "border-primary/40 bg-primary/10 text-foreground" : "text-muted-foreground"}`}
    >
      {active ? "Hoạt động" : "Đã ẩn / khóa"}
    </span>
  );
}
