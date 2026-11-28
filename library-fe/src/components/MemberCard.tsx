import { useRef } from "react";
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
import { encodeCode128SvgData } from "@/utils/code128";
import {
  OwlLibraryMascot,
  UmcSealEmblem
} from "@/components/member-card/MemberCardArtwork";
import { printMemberCardElement } from "@/components/member-card/printMemberCard";

interface MemberCardProps {
  profile: MemberProfile | null;
  requestLoading?: boolean;
  onRequestCard?: () => Promise<void> | void;
  renewalLoading?: boolean;
  onRequestRenewal?: () => Promise<void> | void;
}

const statusConfig = {
  not_requested: {
    label: "Belum Diajukan",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/70 dark:text-slate-200 dark:border-slate-700",
    icon: UserRound
  },
  pending: {
    label: "Menunggu ACC",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700/60",
    icon: Clock3
  },
  active: {
    label: "Kartu Aktif",
    badgeClass:
      "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-700/60",
    icon: BadgeCheck
  },
  rejected: {
    label: "Pengajuan Ditolak",
    badgeClass:
      "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-700/60",
    icon: ShieldAlert
  },
  expired: {
    label: "Masa Berlaku Habis",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700/60",
    icon: Sparkles
  }
} as const;

const formatDate = (value?: string | null) => {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

const getMemberCategoryLabel = (memberType?: string, isExternal?: boolean) => {
  if (isExternal || memberType === "external") return "Anggota Luar";
  if (memberType === "student") return "Mahasiswa";
  if (memberType === "lecturer") return "Dosen";
  if (memberType === "staff") return "Tenaga Kependidikan";
  return "Anggota";
};

const getIdentityLabel = (memberType?: string, isExternal?: boolean) => {
  if (memberType === "student") return "NIM";
  if (memberType === "lecturer") return "NIDN";
  if (memberType === "staff") return "NIP / NIK";
  if (isExternal || memberType === "external") return "No. ID";
  return "NIM / ID";
};

interface BackCardRowProps {
  label: string;
  value: string;
}

const BackCardRow = ({ label, value }: BackCardRowProps) => (
  <>
    <span className="font-semibold text-[#111827]">{label}</span>
    <span className="font-semibold text-[#111827]">:</span>
    <span className="font-semibold text-[#111827] break-words">{value}</span>
  </>
);

const MemberCard = ({
  profile,
  requestLoading,
  onRequestCard,
  renewalLoading,
  onRequestRenewal
}: MemberCardProps) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!profile) {
    return (
      <div className="w-full max-w-[480px] rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        Data profil kartu anggota belum tersedia.
      </div>
    );
  }

  const cardStatus = profile.cardStatus || "not_requested";
  const status = statusConfig[cardStatus] ?? statusConfig.not_requested;
  const StatusIcon = status.icon;

  const canRequest =
    cardStatus === "not_requested" || cardStatus === "rejected";
  const canRenew =
    cardStatus === "expired" && profile.cardRenewalStatus !== "pending";

  const avatarSrc = getUserAvatar(profile.user);
  const categoryLabel = getMemberCategoryLabel(
    profile.memberType,
    profile.isExternal
  );
  const identityLabel = getIdentityLabel(profile.memberType, profile.isExternal);

  const displayCardNumber = profile.cardNumber || "Belum diterbitkan";
  const barcodePayload = (
    profile.cardNumber ||
    profile.nimNidn ||
    profile.id ||
    "UMC-MEMBER"
  ).trim();
  const barcode = encodeCode128SvgData(barcodePayload, 8);

  return (
    <div className="w-full max-w-[490px] space-y-5">
      {/* Status & Actions Header */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${status.badgeClass}`}
          >
            <StatusIcon size={13} />
            {status.label}
          </span>
          {profile.cardNumber ? (
            <span className="hidden sm:inline font-mono text-xs font-semibold text-muted-foreground">
              {profile.cardNumber}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => printMemberCardElement(printAreaRef.current)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-foreground transition hover:bg-muted cursor-pointer"
          >
            <Printer size={14} />
            Cetak
          </button>

          {canRequest && onRequestCard ? (
            <button
              type="button"
              onClick={onRequestCard}
              disabled={requestLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-xs transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {requestLoading ? (
                <RefreshCcw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Ajukan Kartu
            </button>
          ) : null}

          {canRenew && onRequestRenewal ? (
            <button
              type="button"
              onClick={onRequestRenewal}
              disabled={renewalLoading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 shadow-xs transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {renewalLoading ? (
                <RefreshCcw size={14} className="animate-spin" />
              ) : (
                <RefreshCcw size={14} />
              )}
              Ajukan Perpanjangan Kartu
            </button>
          ) : null}
        </div>
      </div>

      {/* Notices */}
      {profile.cardRenewalStatus === "pending" ? (
        <div className="print:hidden rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
          Permintaan perpanjangan kartu sedang menunggu persetujuan admin.
        </div>
      ) : null}

      {profile.cardRejectedReason ? (
        <div className="print:hidden rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-900 dark:border-rose-700/50 dark:bg-rose-950/40 dark:text-rose-200">
          Alasan penolakan: {profile.cardRejectedReason}
        </div>
      ) : null}

      {/* Card Faces Wrapper */}
      <div ref={printAreaRef} className="space-y-5 print:space-y-4">
        {/* FRONT CARD (Tampak Depan) */}
        <article
          aria-label="Kartu Perpustakaan UMC Tampak Depan"
          className="relative overflow-hidden rounded-[18px] bg-[#49B097] px-6 py-5 sm:px-7 sm:py-6 text-[#111827] shadow-lg [print-color-adjust:exact] print:break-inside-avoid print:shadow-none min-h-[268px] sm:min-h-[290px] flex flex-col justify-between"
        >
          {/* Top Section: Title + Owl Illustration */}
          <div className="flex items-start justify-between gap-2">
            <div className="pt-1 z-10">
              <h2 className="text-[22px] sm:text-[26px] font-black uppercase leading-[0.98] tracking-tight text-[#111827]">
                KARTU
                <br />
                PERPUSTAKAAN
              </h2>
              <p className="mt-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] text-[#111827]">
                KARTU ANGGOTA RESMI
              </p>
            </div>

            <div className="-mt-1 -mr-2 sm:-mr-1 shrink-0">
              <OwlLibraryMascot className="h-36 w-36 sm:h-[164px] sm:w-[164px]" />
            </div>
          </div>

          {/* Bottom Section: Card Number + Code 128 Barcode + UMC Seal */}
          <div className="mt-2 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1.5 font-mono text-[11px] sm:text-xs font-bold tracking-wider text-[#111827]/75 truncate">
                {displayCardNumber}
              </p>
              <div className="inline-block rounded-[8px] bg-white px-2.5 py-2 shadow-xs w-[176px] sm:w-[196px]">
                <svg
                  viewBox={`0 0 ${barcode.totalModules} 40`}
                  preserveAspectRatio="none"
                  className="block h-9 w-full"
                  role="img"
                  aria-label={`Barcode anggota ${barcodePayload}`}
                >
                  <rect
                    x={0}
                    y={0}
                    width={barcode.totalModules}
                    height={40}
                    fill="#FFFFFF"
                  />
                  {barcode.bars.map((bar, idx) => (
                    <rect
                      key={`${bar.x}-${idx}`}
                      x={bar.x}
                      y={0}
                      width={bar.width}
                      height={40}
                      fill="#111827"
                    />
                  ))}
                </svg>
              </div>
            </div>

            <UmcSealEmblem className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 text-[#111827]" />
          </div>
        </article>

        {/* BACK CARD (Tampak Belakang) */}
        <article
          aria-label="Kartu Perpustakaan UMC Tampak Belakang"
          className="overflow-hidden rounded-[18px] shadow-lg [print-color-adjust:exact] print:break-inside-avoid print:shadow-none"
        >
          {/* Top Teal Header Band */}
          <div className="flex items-center justify-between gap-4 bg-[#49B097] px-6 py-4 sm:px-7 sm:py-5 text-[#111827]">
            <div>
              <h2 className="text-[20px] sm:text-[24px] font-black uppercase leading-none tracking-tight text-[#111827]">
                DATA ANGGOTA
              </h2>
              <p className="mt-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.06em] text-[#111827]">
                KARTU PERPUSTAKAAN
              </p>
            </div>

            <UmcSealEmblem className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 text-[#111827]" />
          </div>

          {/* Bottom Cream Data Body */}
          <div className="flex flex-row items-start gap-4 sm:gap-5 bg-[#F9ECC3] px-5 py-5 sm:px-7 sm:py-6 text-[#111827]">
            {/* Portrait Photo */}
            <div className="h-[112px] w-[92px] sm:h-[132px] sm:w-[108px] shrink-0 overflow-hidden rounded-[12px] border-[2px] border-[#111827] bg-white shadow-2xs">
              <img
                src={avatarSrc}
                alt={profile.user?.name || "Foto Anggota"}
                className="h-full w-full object-cover"
              />
            </div>

            {/* Aligned Colon-Separated Fields */}
            <div className="w-full min-w-0 grid grid-cols-[84px_10px_minmax(0,1fr)] gap-x-1 gap-y-1 text-[12px] sm:text-[13px] leading-snug">
              <BackCardRow label="Nama" value={profile.user?.name || "-"} />
              <BackCardRow
                label={identityLabel}
                value={profile.nimNidn || "-"}
              />
              <BackCardRow label="Kategori" value={categoryLabel} />
              <BackCardRow label="Fakultas" value={profile.faculty || "-"} />
              {profile.isExternal && profile.institution ? (
                <BackCardRow label="Institusi" value={profile.institution} />
              ) : null}
              <BackCardRow label="NO. Telp" value={profile.phone || "-"} />
              <BackCardRow
                label="Alamat"
                value={profile.originRegion || "-"}
              />
              <BackCardRow
                label="Masa Aktif"
                value={formatDate(profile.cardExpiresAt)}
              />
            </div>
          </div>
        </article>
      </div>

      {/* Footer note */}
      <p className="print:hidden text-center text-xs font-medium text-muted-foreground">
        Tunjukkan kartu ini (tampak depan &amp; belakang) kepada petugas saat peminjaman.
      </p>
    </div>
  );
};

export default MemberCard;
