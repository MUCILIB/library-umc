export const formatRupiah = (amount: number | string): string => {
  const num = Number(amount) || 0;
  return `Rp. ${num.toLocaleString("id-ID")}`;
};

export const calcLateDays = (dueDate: string): number => {
  if (!dueDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = today.getTime() - due.getTime();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
};

export const isOverdue = (dueDate: string): boolean => {
  return calcLateDays(dueDate) > 0;
};

export const formatDateID = (dateStr: string): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const cleanIsbn = (isbn?: string | null): string => {
  if (!isbn) return "";
  return isbn.replace(/^ISBN[:\s]*/i, "").trim();
};


export function generateColorFromSeed(seed: string): string {
  const colors = [
    "bg-red-500", "bg-blue-500", "bg-violet-500", "bg-teal-500",
    "bg-orange-500", "bg-pink-500", "bg-cyan-500", "bg-lime-500",
    "bg-indigo-500", "bg-fuchsia-500", "bg-emerald-500", "bg-rose-500",
    "bg-sky-500", "bg-purple-500", "bg-yellow-500", "bg-green-500",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return colors[hash % colors.length];
}