import {
  ArrowLeft,
  Package,
  Pencil,
  Trash2,
  Users,
  Tag,
  Loader2,
} from "lucide-react";
import type { Bibliography } from "@/api/client";
import { cleanIsbn } from "@/utils/format";

export function MetaField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
    </div>
  );
}

export interface BibliographyDetailProps {
  bib: Bibliography;
  loading: boolean;
  onBack: () => void;
  onEdit: (bib: Bibliography) => void;
  onDelete: (bib: Bibliography) => void;
  onViewItems?: (bib: Bibliography) => void;
}

export function BibliographyDetail({
  bib,
  loading,
  onBack,
  onEdit,
  onDelete,
  onViewItems,
}: BibliographyDetailProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-muted-foreground cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Kembali ke daftar
        </button>
        <div className="flex gap-2">
          {onViewItems && (
            <button
              onClick={() => onViewItems(bib)}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              <Package className="size-4" />
              Kelola Eksemplar
            </button>
          )}
          <button
            onClick={() => onEdit(bib)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 cursor-pointer"
          >
            <Pencil className="size-4" />
            Edit
          </button>
          <button
            onClick={() => onDelete(bib)}
            className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 transition-colors cursor-pointer"
          >
            <Trash2 className="size-4" />
            Hapus
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{bib.title}</h2>
            {bib.sor && (
              <p className="mt-1 text-sm text-muted-foreground">{bib.sor}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950 px-3 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Package className="size-4" />
            {bib.availableItems}/{bib.totalItems} tersedia
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bib.isbn && <MetaField label="ISBN" value={cleanIsbn(bib.isbn)} />}
          {bib.issn && <MetaField label="ISSN" value={bib.issn} />}
          {!bib.isbn && !bib.issn && (
            <MetaField label="ISBN/ISSN" value={cleanIsbn(bib.isbnIssn) || "-"} />
          )}
          <MetaField label="Edisi" value={bib.edition} />
          <MetaField label="Penerbit" value={bib.publisher?.name} />
          <MetaField label="Tahun Terbit" value={bib.publishYear?.toString()} />
          <MetaField label="Bahasa" value={bib.language?.name} />
          <MetaField label="GMD" value={bib.gmd?.name} />
          <MetaField label="Call Number" value={bib.callNumber} />
          <MetaField label="Klasifikasi" value={bib.classification} />
          <MetaField label="Deskripsi Fisik/Kolasi" value={bib.collation} />
          <MetaField label="Seri" value={bib.seriesTitle} />
          {bib.faculties && bib.faculties.length > 0 && (
            <MetaField label="Fakultas" value={bib.faculties.map((f: any) => f.name).join(", ")} />
          )}
          {bib.studyPrograms && bib.studyPrograms.length > 0 && (
            <MetaField label="Program Studi" value={bib.studyPrograms.map((sp: any) => sp.name).join(", ")} />
          )}
        </div>

        {/* Description */}
        {bib.description && (
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Deskripsi</h3>
            <p className="text-sm text-muted-foreground">{bib.description}</p>
          </div>
        )}

        {/* Notes */}
        {bib.notes && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Catatan</h3>
            <p className="text-sm text-muted-foreground">{bib.notes}</p>
          </div>
        )}
      </div>

      {/* Authors */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Users className="size-4" />
          Penulis
        </h3>
        {bib.authors && bib.authors.length > 0 ? (
          <div className="space-y-2">
            {bib.authors.map((author, idx) => (
              <div
                key={author.id || idx}
                className="flex items-center gap-3 rounded-lg bg-muted px-4 py-2"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                  {author.position}
                </span>
                <span className="font-medium text-foreground">{author.name}</span>
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {author.role}
                </span>
              </div>
            ))}
            {bib.unlistedAuthorsLabel && (
              <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-950 px-4 py-2">
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  + {bib.unlistedAuthorsLabel} (penulis lainnya)
                </span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Tidak ada penulis tercatat</p>
        )}
      </div>

      {/* Subjects */}
      {bib.subjects && bib.subjects.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Tag className="size-4" />
            Subjek
          </h3>
          <div className="flex flex-wrap gap-2">
            {bib.subjects.map((subject) => (
              <span
                key={subject.id}
                className="rounded-full bg-blue-50 dark:bg-blue-950 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-400"
              >
                {subject.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default BibliographyDetail;
