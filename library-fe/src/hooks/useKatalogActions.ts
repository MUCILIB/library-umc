import { useState } from "react";
import { useNavigate } from "react-router";
import loanService from "@/services/loanService";
import reservationService from "@/services/reservationService";
import { useToast } from "@/hooks/useToast";
import type { Bibliography, LibraryUser, LoanRequest } from "@/types";
import type { Reservation } from "@/services/reservationService";

interface UseKatalogActionsProps {
  bibliography: Bibliography | null;
  currentUser: LibraryUser | null;
  userLoans: LoanRequest[];
  pendingRequests: LoanRequest[];
  userReservation: Reservation | null;
  setUserReservation: React.Dispatch<React.SetStateAction<Reservation | null>>;
  setPendingRequests: React.Dispatch<React.SetStateAction<LoanRequest[]>>;
}

export function useKatalogActions({
  bibliography,
  currentUser,
  userLoans,
  pendingRequests,
  userReservation,
  setUserReservation,
  setPendingRequests,
}: UseKatalogActionsProps) {
  const navigate = useNavigate();
  const toast = useToast();

  const [showReservationList, setShowReservationList] = useState(false);
  const [borrowLoading, setBorrowLoading] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);

  const defaultLoanDate = new Date().toISOString().split("T")[0];
  const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const [loanFormData, setLoanFormData] = useState({
    loanDate: defaultLoanDate,
    dueDate: defaultDueDate,
    notes: "",
  });

  const getBookStatus = (): "available" | "borrowed" | "reserved" | "empty" => {
    if (bibliography?.items && bibliography.items.length > 0) {
      const availableItems = bibliography.items.filter(
        (i) => i.status === "available",
      );
      if (availableItems.length > 0) {
        return "available";
      }

      const loanedItems = bibliography.items.filter(
        (i) => i.status === "loaned",
      );
      if (loanedItems.length > 0) {
        return "borrowed";
      }

      return "empty";
    }

    if (typeof bibliography?.stock === "number") {
      return bibliography.stock > 0 ? "available" : "empty";
    }

    return "available";
  };

  const isUserBorrowing = (): boolean => userLoans.length > 0;
  const isUserPending = (): boolean => pendingRequests.length > 0;
  const isUserReserved = (): boolean => !!userReservation;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "loanDate") {
      const selectedDate = new Date(value);
      const calculatedDueDate = new Date(
        selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];
      setLoanFormData({
        ...loanFormData,
        loanDate: value,
        dueDate: calculatedDueDate,
      });
    } else {
      setLoanFormData({ ...loanFormData, [name]: value });
    }
  };

  const handleReserve = async () => {
    if (!currentUser || !bibliography?.id) return;

    setBorrowLoading(true);
    const bibliographyId = bibliography.id;
    const loadingId = toast.loading(
      "Memproses",
      "Mendaftarkan ke antrian reservasi...",
    );
    try {
      await reservationService.createReservation(bibliographyId);
      toast.removeToast(loadingId);
      toast.success(
        "Berhasil",
        "Anda telah masuk dalam antrian reservasi. Kami akan memberitahu Anda via email jika buku sudah tersedia.",
      );
      setShowReservationList(true);

      setUserReservation({
        id: "new",
        memberId: currentUser.memberId || "",
        bibliographyId: bibliographyId,
        status: "waiting",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      toast.removeToast(loadingId);
      toast.error(
        "Gagal",
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat reservasi",
      );
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleBorrow = () => {
    if (!currentUser) {
      toast.warning("Auth", "Silakan login terlebih dahulu untuk meminjam");
      return;
    }
    if (isUserBorrowing()) {
      toast.warning("Info Pinjaman", "Anda sedang meminjam buku ini");
      return;
    }
    if (isUserPending()) {
      toast.warning(
        "Info Pinjaman",
        "Anda sudah mengajukan peminjaman untuk buku ini",
      );
      return;
    }
    if (getBookStatus() === "empty" || getBookStatus() === "borrowed") {
      if (
        confirm("Buku sedang tidak tersedia. Ingin masuk antrian reservasi?")
      ) {
        handleReserve();
      }
      return;
    }
    setShowLoanForm(true);
  };

  const handleSubmitLoan = async () => {
    if (!currentUser) {
      toast.error("Auth", "Anda harus login terlebih dahulu");
      navigate("/login");
      return;
    }

    if (!currentUser.memberId) {
      toast.error(
        "Akses Ditolak",
        "ID member tidak ditemukan. Silakan login ulang.",
      );
      return;
    }

    if (!bibliography?.id) {
      toast.error("Error", "Data buku tidak ditemukan");
      return;
    }

    if (!loanFormData.loanDate || !loanFormData.dueDate) {
      toast.warning(
        "Form Belum Lengkap",
        "Pilih tanggal peminjaman dan pengembalian",
      );
      return;
    }

    const start = new Date(loanFormData.loanDate);
    const end = new Date(loanFormData.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      toast.warning(
        "Tanggal Tidak Valid",
        "Tanggal peminjaman tidak boleh kurang dari hari ini",
      );
      return;
    }

    if (end <= start) {
      toast.warning(
        "Tanggal Tidak Valid",
        "Tanggal pengembalian harus setelah tanggal peminjaman",
      );
      return;
    }

    const diffDays = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 3600 * 24),
    );
    if (diffDays > 14) {
      toast.warning("Melewati Batas", "Maksimal peminjaman 14 hari");
      return;
    }

    setBorrowLoading(true);
    const loadingId = toast.loading("Memproses", "Mengajukan peminjaman...");
    try {
      const loan = await loanService.requestLoan({
        memberId: currentUser.memberId,
        bibliographyId: bibliography.id,
        loanDate: loanFormData.loanDate,
        dueDate: loanFormData.dueDate,
        notes: loanFormData.notes,
      });

      toast.removeToast(loadingId);
      toast.success(
        "Berhasil",
        "Permintaan peminjaman berhasil dikirim! Menunggu persetujuan petugas.",
      );

      setPendingRequests((prev) => [...prev, loan as unknown as LoanRequest]);
      setShowLoanForm(false);

      setLoanFormData({
        loanDate: defaultLoanDate,
        dueDate: defaultDueDate,
        notes: "",
      });
    } catch (error) {
      toast.removeToast(loadingId);
      toast.error(
        "Gagal",
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengajukan peminjaman",
      );
    } finally {
      setBorrowLoading(false);
    }
  };

  const handleCheckLoans = () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }
    navigate("/profile?tab=riwayat-peminjaman");
  };

  return {
    showReservationList,
    setShowReservationList,
    borrowLoading,
    showLoanForm,
    setShowLoanForm,
    loanFormData,
    setLoanFormData,
    getBookStatus,
    isUserBorrowing,
    isUserPending,
    isUserReserved,
    handleInputChange,
    handleBorrow,
    handleReserve,
    handleSubmitLoan,
    handleCheckLoans,
  };
}
