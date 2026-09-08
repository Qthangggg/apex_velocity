import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { Address } from "@/lib/shop-types";
export type AddressValue = Omit<Address, "id" | "user_id" | "created_at">;
export function AddressFields({
  value,
  onChange,
  prefix = "address",
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  prefix?: string;
}) {
  const fields = [
    { key: "recipient", label: "Tên người nhận", autocomplete: "name", max: 100 },
    { key: "phone", label: "Số điện thoại", autocomplete: "tel", max: 20 },
    { key: "line1", label: "Số nhà, tên đường", autocomplete: "address-line1", max: 250 },
    { key: "ward", label: "Phường / Xã", autocomplete: "address-line2", max: 100 },
    { key: "district", label: "Quận / Huyện (nếu có)", autocomplete: "address-level2", max: 100 },
    { key: "city", label: "Tỉnh / Thành phố", autocomplete: "address-level1", max: 100 },
  ] as const;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div
          className={field.key === "line1" ? "space-y-2 sm:col-span-2" : "space-y-2"}
          key={field.key}
        >
          <Label htmlFor={prefix + field.key}>{field.label}</Label>
          <Input
            id={prefix + field.key}
            name={field.key}
            required={field.key !== "district"}
            value={value[field.key]}
            type={field.key === "phone" ? "tel" : "text"}
            pattern={field.key === "phone" ? "[+0-9 ()-]{8,20}" : undefined}
            autoComplete={field.autocomplete}
            maxLength={field.max}
            onChange={(event) => onChange({ ...value, [field.key]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
