import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Absensi from "../Absensi";
import { guestApi, studyProgramApi } from "@/api/client";

vi.mock("@/api/client", () => ({
  studyProgramApi: {
    list: vi.fn(),
  },
  guestApi: {
    scan: vi.fn(),
    createNonMember: vi.fn(),
  },
}));

vi.mock("@/components/dashboard/circulation/CameraScannerModal", () => ({
  CameraScannerModal: ({
    isOpen,
    onScanSuccess,
    onClose,
  }: {
    isOpen: boolean;
    onScanSuccess: (text: string) => void;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="mock-camera-modal">
        <button
          type="button"
          onClick={() => onScanSuccess("UMCLIB-20261128-ABCD1234")}
        >
          Simulasi Scan Kartu
        </button>
        <button type="button" onClick={onClose}>
          Tutup Kamera
        </button>
      </div>
    ) : null,
}));

describe("Absensi - Form Lama + Fitur Scan Kartu Cepat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(studyProgramApi.list).mockResolvedValue({
      success: true,
      message: "OK",
      data: [
        { id: 1, facultyId: 1, name: "Teknik Informatika" },
        { id: 2, facultyId: 1, name: "Sistem Informasi" },
      ],
    });
  });

  it("tetap menampilkan seluruh field form lama sekaligus menyediakan tombol Scan Kamera", () => {
    render(<Absensi />);

    expect(
      screen.getByPlaceholderText(/Scan kartu anggota \/ ketik NIM/i)
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ahmad Rizky Pratama/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Scan Kamera/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Masuk$/i })).toBeInTheDocument();
  });

  it("berhasil presensi hanya dengan nomor kartu/NIM dan klik Masuk tanpa mengisi Nama & Prodi", async () => {
    vi.mocked(guestApi.scan).mockResolvedValue({
      success: true,
      message: "OK",
      data: {
        id: "log-1",
        memberId: "mem-1",
        name: "Siti Aminah",
        prodi: "Teknik Informatika",
        faculty: "Fakultas Teknik",
        timestamp: new Date().toISOString(),
        cardNumber: "UMCLIB-20261128-ABCD1234",
        nim: "230511001",
        alreadyCheckedIn: false,
      },
    });

    render(<Absensi />);

    const input = screen.getByPlaceholderText(/Scan kartu anggota \/ ketik NIM/i);
    fireEvent.change(input, { target: { value: "UMCLIB-20261128-ABCD1234" } });
    fireEvent.click(screen.getByRole("button", { name: /^Masuk$/i }));

    await waitFor(() => {
      expect(guestApi.scan).toHaveBeenCalledWith("UMCLIB-20261128-ABCD1234");
    });

    expect(await screen.findByText("Siti Aminah")).toBeInTheDocument();
    expect(screen.getByText(/Kartu: UMCLIB-20261128-ABCD1234/i)).toBeInTheDocument();
    expect(screen.getByText(/NIM: 230511001/i)).toBeInTheDocument();
  });

  it("berhasil presensi instan saat scanner mengirim Enter di input kartu", async () => {
    vi.mocked(guestApi.scan).mockResolvedValue({
      success: true,
      message: "OK",
      data: {
        id: "log-2",
        memberId: "mem-2",
        name: "Budi Santoso",
        prodi: "Sistem Informasi",
        faculty: "Fakultas Teknik",
        timestamp: new Date().toISOString(),
        cardNumber: "UMCLIB-20261128-11223344",
        nim: "230511002",
        alreadyCheckedIn: false,
      },
    });

    render(<Absensi />);

    const input = screen.getByPlaceholderText(/Scan kartu anggota \/ ketik NIM/i);
    fireEvent.change(input, { target: { value: "230511002" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(guestApi.scan).toHaveBeenCalledWith("230511002");
    });

    expect(await screen.findByText("Budi Santoso")).toBeInTheDocument();
  });

  it("berhasil presensi langsung melalui Scan Kamera tanpa isi form manual", async () => {
    vi.mocked(guestApi.scan).mockResolvedValue({
      success: true,
      message: "OK",
      data: {
        id: "log-3",
        memberId: "mem-3",
        name: "Dewi Lestari",
        prodi: "Manajemen",
        faculty: "Fakultas Ekonomi",
        timestamp: new Date().toISOString(),
        cardNumber: "UMCLIB-20261128-ABCD1234",
        nim: "230511003",
        alreadyCheckedIn: true,
      },
    });

    render(<Absensi />);

    fireEvent.click(screen.getByRole("button", { name: /Scan Kamera/i }));
    expect(screen.getByTestId("mock-camera-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Simulasi Scan Kartu/i }));

    await waitFor(() => {
      expect(guestApi.scan).toHaveBeenCalledWith("UMCLIB-20261128-ABCD1234");
    });

    expect(await screen.findByText("Dewi Lestari")).toBeInTheDocument();
    expect(screen.getByText(/Kehadiran Sudah Tercatat/i)).toBeInTheDocument();
  });

  it("mencatat sebagai non-member ketika form manual lengkap diisi dan data member tidak ditemukan", async () => {
    vi.mocked(guestApi.scan).mockRejectedValue(
      new Error("Data anggota tidak ditemukan. Silakan isi presensi tamu non-member.")
    );
    vi.mocked(guestApi.createNonMember).mockResolvedValue({
      success: true,
      message: "OK",
      data: { id: "guest-1" },
    });

    render(<Absensi />);

    const input = screen.getByPlaceholderText(/Scan kartu anggota \/ ketik NIM/i);
    fireEvent.change(input, { target: { value: "081234567890" } });

    const nameInput = screen.getByPlaceholderText(/Ahmad Rizky Pratama/i);
    fireEvent.change(nameInput, { target: { value: "Tamu Umum" } });

    await screen.findByRole("option", { name: "Teknik Informatika" });
    const selectEl = screen.getByRole("combobox");
    fireEvent.change(selectEl, { target: { value: "Teknik Informatika" } });

    fireEvent.click(screen.getByRole("button", { name: /^Masuk$/i }));

    await waitFor(() => {
      expect(guestApi.createNonMember).toHaveBeenCalledWith({
        fullName: "Tamu Umum",
        institution: "Universitas Muhammadiyah Cirebon",
        purpose: "Kunjungan Perpustakaan",
        phone: "081234567890",
        studyProgramId: 1,
      });
    });

    expect(await screen.findByText("Tamu Umum")).toBeInTheDocument();
    expect(screen.getByText("Non-Member")).toBeInTheDocument();
  });

  it("mengizinkan pengunjung umum absen hanya dengan Nama Lengkap tanpa wajib mengisi NIM", async () => {
    vi.mocked(guestApi.createNonMember).mockResolvedValue({
      success: true,
      message: "OK",
      data: { id: "guest-umum-1" },
    });

    render(<Absensi />);

    const nameInput = screen.getByPlaceholderText(/Ahmad Rizky Pratama/i);
    fireEvent.change(nameInput, { target: { value: "Pengunjung Luar" } });

    await screen.findByRole("option", { name: "Umum / Pengunjung Luar" });
    const selectEl = screen.getByRole("combobox");
    fireEvent.change(selectEl, {
      target: { value: "Umum / Pengunjung Luar" },
    });

    fireEvent.click(screen.getByRole("button", { name: /^Masuk$/i }));

    await waitFor(() => {
      expect(guestApi.scan).not.toHaveBeenCalled();
      expect(guestApi.createNonMember).toHaveBeenCalledWith({
        fullName: "Pengunjung Luar",
        institution: "Pengunjung Umum",
        purpose: "Kunjungan Perpustakaan",
        phone: "",
        studyProgramId: null,
      });
    });

    expect(await screen.findByText("Pengunjung Luar")).toBeInTheDocument();
    expect(screen.getByText("Non-Member")).toBeInTheDocument();
  });
});
