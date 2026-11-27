export type ItemStatusValue = "available" | "loaned" | "maintenance" | "damaged" | "lost";

export const ITEM_STATUS_OPTIONS: Array<{ value: ItemStatusValue; label: string }> = [
  { value: "available", label: "Tersedia" },
  { value: "loaned", label: "Dipinjam" },
  { value: "maintenance", label: "Sedang Diperbaiki" },
  { value: "damaged", label: "Rusak" },
  { value: "lost", label: "Hilang" },
];

export const ITEM_CREATE_STATUS_OPTIONS: Array<{ value: Exclude<ItemStatusValue, "loaned">; label: string }> = [
  { value: "available", label: "Tersedia" },
  { value: "maintenance", label: "Sedang Diperbaiki" },
  { value: "damaged", label: "Rusak" },
  { value: "lost", label: "Hilang" },
];

export function getItemStatusLabel(status?: string | null): string {
  switch (status) {
    case "available":
      return "Tersedia";
    case "loaned":
      return "Dipinjam";
    case "maintenance":
      return "Sedang Diperbaiki";
    case "damaged":
      return "Rusak";
    case "lost":
      return "Hilang";
    default:
      return status || "-";
  }
}

export function getItemStatusBadgeClass(status?: string | null): string {
  switch (status) {
    case "available":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800";
    case "loaned":
      return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800";
    case "maintenance":
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800";
    case "damaged":
      return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800";
    case "lost":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
