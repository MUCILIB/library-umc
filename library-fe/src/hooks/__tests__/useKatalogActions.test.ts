import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { useKatalogActions } from "../useKatalogActions";
import loanService from "@/services/loanService";
import type { Bibliography, LibraryUser } from "@/types";

const warningToastMock = vi.fn();
const errorToastMock = vi.fn();
const successToastMock = vi.fn();

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: successToastMock,
    error: errorToastMock,
    warning: warningToastMock,
    info: vi.fn(),
    loading: vi.fn(() => "toast-load-1"),
    removeToast: vi.fn(),
  }),
}));

vi.mock("@/services/loanService", () => ({
  default: {
    requestLoan: vi.fn().mockResolvedValue({
      id: "loan-created-1",
      status: "pending",
    }),
  },
}));

vi.mock("@/services/reservationService", () => ({
  default: {
    createReservation: vi.fn().mockResolvedValue({}),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(MemoryRouter, null, children);

const mockBib: Bibliography = {
  id: "bib-1",
  title: "Struktur Data",
  author: "Penulis Uji",
  publisher: "UMC Press",
  publicationYear: "2026",
  type: "physical_book",
  image: null,
  stock: 1,
  items: [
    { id: "item-maint", itemCode: "S-2026-10001-c1", status: "maintenance" },
    { id: "item-avail", itemCode: "S-2026-10001-c2", status: "available" },
  ],
};

const mockUser: LibraryUser = {
  id: "usr-1",
  memberId: "mem-1",
  name: "Mahasiswa Uji",
  email: "mhs@umc.ac.id",
  role: "student",
};

describe("useKatalogActions - pemilihan kode eksemplar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("otomatis memilih eksemplar pertama berstatus available dan mengirim itemId saat submit", async () => {
    const { result } = renderHook(
      () =>
        useKatalogActions({
          bibliography: mockBib,
          currentUser: mockUser,
          userLoans: [],
          pendingRequests: [],
          userReservation: null,
          setUserReservation: vi.fn(),
          setPendingRequests: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleBorrow();
    });

    expect(result.current.showLoanForm).toBe(true);
    expect(result.current.loanFormData.itemId).toBe("item-avail");
    expect(result.current.isSelectedItemAvailable).toBe(true);

    await act(async () => {
      await result.current.handleSubmitLoan();
    });

    expect(loanService.requestLoan).toHaveBeenCalledWith(
      expect.objectContaining({
        bibliographyId: "bib-1",
        itemId: "item-avail",
      })
    );
  });

  it("menolak pengajuan jika user memilih kode eksemplar yang statusnya bukan tersedia", async () => {
    const { result } = renderHook(
      () =>
        useKatalogActions({
          bibliography: mockBib,
          currentUser: mockUser,
          userLoans: [],
          pendingRequests: [],
          userReservation: null,
          setUserReservation: vi.fn(),
          setPendingRequests: vi.fn(),
        }),
      { wrapper }
    );

    act(() => {
      result.current.handleBorrow();
      result.current.setLoanFormData((prev) => ({
        ...prev,
        itemId: "item-maint",
      }));
    });

    expect(result.current.isSelectedItemAvailable).toBe(false);

    await act(async () => {
      await result.current.handleSubmitLoan();
    });

    expect(loanService.requestLoan).not.toHaveBeenCalled();
    expect(warningToastMock).toHaveBeenCalledWith(
      "Eksemplar Tidak Tersedia",
      expect.stringContaining("Sedang Diperbaiki")
    );
  });

  it("menolak pengajuan jika tanggal peminjaman melebihi tanggal saat ini", async () => {
    const { result } = renderHook(
      () =>
        useKatalogActions({
          bibliography: mockBib,
          currentUser: mockUser,
          userLoans: [],
          pendingRequests: [],
          userReservation: null,
          setUserReservation: vi.fn(),
          setPendingRequests: vi.fn(),
        }),
      { wrapper }
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYmd = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;

    act(() => {
      result.current.handleBorrow();
      result.current.handleInputChange({
        target: { name: "loanDate", value: tomorrowYmd },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.handleSubmitLoan();
    });

    expect(loanService.requestLoan).not.toHaveBeenCalled();
    expect(warningToastMock).toHaveBeenCalledWith(
      "Tanggal Tidak Valid",
      "Tanggal peminjaman tidak boleh melebihi tanggal saat ini"
    );
  });
});
