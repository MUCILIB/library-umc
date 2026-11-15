import type { Loan as LoanData } from "@/services/loanService";

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

export function getLoanTitle(loan: LoanData): string {
  return (
    loan.item?.bibliography?.title ||
    loan.bibliographyTitle ||
    (loan as unknown as { title?: string }).title ||
    "Judul tidak tersedia"
  );
}

export function getLoanAuthor(loan: LoanData): string {
  const bib = loan.item?.bibliography;
  if (bib?.author) return bib.author;
  if (Array.isArray(bib?.authors) && bib.authors.length > 0) {
    return bib.authors
      .map((a: unknown) =>
        typeof a === "string" ? a : (a as { name?: string })?.name
      )
      .filter(Boolean)
      .join(", ");
  }
  if (
    Array.isArray(bib?.bibliographyAuthors) &&
    bib.bibliographyAuthors.length > 0
  ) {
    return bib.bibliographyAuthors
      .map((ba: unknown) => (ba as { author?: { name?: string } })?.author?.name)
      .filter(Boolean)
      .join(", ");
  }
  if (bib?.sor) return bib.sor;
  if (loan.bibliographyAuthor) return loan.bibliographyAuthor;
  return "Penulis tidak tersedia";
}
