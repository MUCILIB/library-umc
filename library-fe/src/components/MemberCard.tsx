import {
  BadgeCheck,
  Clock3,
  Printer,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  UserRound
} from "lucide-react";
import { type MemberProfile } from "@/services/memberService";
import { getUserAvatar } from "@/lib/avatar";

interface MemberCardProps {
  profile: MemberProfile | null;
  requestLoading?: boolean;
  onRequestCard?: () => Promise<void> | void;
}

const statusConfig = {
  not_requested: {
    label: "Belum Diajukan",
    chipClass: "bg-slate-900 text-white",
    accentClass: "from-slate-950 via-slate-900 to-red-900",
    description:
      "Kartu member belum dibuat. Ajukan kartu ke petugas agar bisa diproses.",
    icon: ShieldAlert
  },
  pending: {
    label: "Menunggu Persetujuan",
    chipClass: "bg-amber-100 text-amber-800",
    accentClass: "from-amber-950 via-red-900 to-slate-900",
    description:
      "Pengajuan kartu sedang diperiksa admin. Status ini akan berubah setelah disetujui.",
    icon: Clock3
  },
  active: {
    label: "Aktif",
    chipClass: "bg-emerald-100 text-emerald-800",
    accentClass: "from-red-950 via-red-800 to-slate-900",
    description:
      "Kartu aktif dan siap digunakan untuk peminjaman buku di perpustakaan.",
    icon: BadgeCheck
  },
  rejected: {
    label: "Ditolak",
    chipClass: "bg-rose-100 text-rose-800",
    accentClass: "from-rose-950 via-red-900 to-slate-900",
    description:
      "Pengajuan kartu ditolak. Cek alasan penolakan atau ajukan ulang setelah data diperbaiki.",
    icon: ShieldAlert
  },
  expired: {
    label: "Kedaluwarsa",
    chipClass: "bg-orange-100 text-orange-800",
    accentClass: "from-orange-950 via-amber-900 to-slate-900",
    description:
      "Kartu perlu diperbarui sebelum bisa dipakai kembali untuk transaksi peminjaman.",
    icon: RefreshCcw
  }
} as const;

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

const MemberCard = ({
  profile,
  requestLoading,
  onRequestCard
}: MemberCardProps) => {
  if (!profile) return null;

  const user = profile.user;
  const status = statusConfig[profile.cardStatus] ?? statusConfig.not_requested;
  const StatusIcon = status.icon;

  const canRequest =
    profile.cardStatus === "not_requested" ||
    profile.cardStatus === "rejected" ||
    profile.cardStatus === "expired";

  return (
    <div className="w-full max-w-4xl space-y-6">
      <div className="relative overflow-hidden rounded-[32px] border border-white/60 bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${status.accentClass}`}
        />
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-12 left-0 h-40 w-40 rounded-full bg-red-400/20 blur-3xl" />

        <div className="relative p-6 sm:p-8 text-white">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-foreground shadow-sm">
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/70">
                    UMC Library
                  </p>
                  <p className="text-[11px] font-semibold text-white/60">
                    Member access card
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-white/65">
                  Kartu Member Digital
                </p>
                <h3 className="max-w-xl text-3xl font-black tracking-tight text-white sm:text-4xl">
                  {user?.name || "Nama Anggota"}
                </h3>
                {profile.isExternal && (
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-orange-500/80 to-amber-500/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-white/20">
                    <Sparkles size={12} className="opacity-80" />
                    <span>Bukan Mahasiswa UMC</span>
                  </div>
                )}
                <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                  {status.description}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] ${status.chipClass}`}
              >
                <StatusIcon size={12} />
                {status.label}
              </span>
              {profile.cardNumber ? (
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55">
                    Nomor Kartu
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold tracking-[0.24em] text-white sm:text-base">
                    {profile.cardNumber}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-right backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55">
                    Nomor Kartu
                  </p>
                  <p className="mt-1 text-sm font-bold text-white/75">
                    Belum tersedia
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/10 bg-white/10 text-2xl font-black text-white shadow-inner">
                  <img
                    src={getUserAvatar(user)}
                    alt={user?.name || "Member"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55">
                      Identitas
                    </p>
                    <h4 className="truncate text-xl font-black text-white">
                      {user?.name || "Nama belum tersedia"}
                    </h4>
                  </div>
                  <div className="space-y-1 text-sm text-white/75">
                    <p>{user?.email || "Email belum tersedia"}</p>
                    <p>{profile.nimNidn || "NIM/NIDN belum diisi"}</p>
                    <p>{profile.faculty || "Fakultas belum diisi"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55">
                    Diajukan
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {formatDate(profile.cardRequestedAt)}
                  </p>
                </div>
                <UserRound size={18} className="text-white/60" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55">
                    Disetujui
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {formatDate(profile.cardApprovedAt)}
                  </p>
                </div>
                <BadgeCheck size={18} className="text-emerald-200" />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/55">
                    Ditolak
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {formatDate(profile.cardRejectedAt)}
                  </p>
                </div>
                <ShieldAlert size={18} className="text-rose-200" />
              </div>
            </div>
          </div>

          {profile.cardRejectedReason ? (
            <div className="mt-5 rounded-[22px] border border-rose-200/30 bg-rose-500/10 px-5 py-4 text-sm text-rose-50">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-100/80">
                Alasan Penolakan
              </p>
              <p className="mt-1 font-medium leading-6">
                {profile.cardRejectedReason}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">
              Tunjukkan kartu ini kepada petugas saat peminjaman.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/20"
              >
                <Printer size={14} />
                Cetak
              </button>
              {canRequest && onRequestCard ? (
                <button
                  type="button"
                  onClick={() => void onRequestCard()}
                  disabled={requestLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-card px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-foreground transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-white/50"
                >
                  {requestLoading ? "Mengajukan..." : "Ajukan Kartu"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberCard;
