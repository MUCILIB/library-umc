import { Calendar } from "lucide-react";

export type CardExpiryPreset = "6m" | "1y" | "2y" | "4y" | "custom";

export const CARD_EXPIRY_PRESETS: Array<{
  id: Exclude<CardExpiryPreset, "custom">;
  label: string;
  durationDays: number;
}> = [
  { id: "6m", label: "6 Bulan", durationDays: 180 },
  { id: "1y", label: "1 Tahun", durationDays: 365 },
  { id: "2y", label: "2 Tahun", durationDays: 730 },
  { id: "4y", label: "4 Tahun", durationDays: 1460 },
];

/** Menghitung tanggal kedaluwarsa preset dari hari ini dalam format YYYY-MM-DD. */
export function calculatePresetExpiryDate(
  type: Exclude<CardExpiryPreset, "custom">
): string {
  const d = new Date();
  if (type === "6m") {
    d.setMonth(d.getMonth() + 6);
  } else if (type === "1y") {
    d.setFullYear(d.getFullYear() + 1);
  } else if (type === "2y") {
    d.setFullYear(d.getFullYear() + 2);
  } else if (type === "4y") {
    d.setFullYear(d.getFullYear() + 4);
  }
  return d.toISOString().split("T")[0];
}

/** Mengambil durasi hari sesuai preset bila bukan tanggal kustom. */
export function getPresetDurationDays(type: CardExpiryPreset): number | undefined {
  return CARD_EXPIRY_PRESETS.find((p) => p.id === type)?.durationDays;
}

interface CardExpiryFieldsProps {
  preset: CardExpiryPreset;
  customDate: string;
  disabled?: boolean;
  minDate?: string;
  helperText?: string;
  onPresetChange: (preset: CardExpiryPreset) => void;
  onCustomDateChange: (date: string) => void;
}

export function CardExpiryFields({
  preset,
  customDate,
  disabled = false,
  minDate,
  helperText,
  onPresetChange,
  onCustomDateChange,
}: CardExpiryFieldsProps) {
  return (
    <>
      <div>
        <label className="block text-xs font-bold text-foreground mb-2">
          Pilihan Periode Masa Aktif
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CARD_EXPIRY_PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onPresetChange(item.id)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                preset === item.id
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background border-border text-foreground hover:bg-muted"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="card-expiry-date-input"
            className="text-xs font-bold text-foreground"
          >
            Berlaku Sampai Tanggal
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPresetChange("custom")}
            className={`text-[11px] font-medium transition-colors cursor-pointer ${
              preset === "custom"
                ? "text-primary font-bold underline"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pilih Tanggal Kustom
          </button>
        </div>

        <div className="relative">
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            id="card-expiry-date-input"
            type="date"
            required
            min={minDate}
            value={customDate}
            onChange={(e) => {
              onPresetChange("custom");
              onCustomDateChange(e.target.value);
            }}
            disabled={disabled}
            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-foreground"
          />
        </div>
        {helperText && (
          <p className="mt-1 text-[11px] text-muted-foreground">{helperText}</p>
        )}
      </div>
    </>
  );
}
