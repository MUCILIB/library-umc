import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MandatoryContactModal from "../MandatoryContactModal";
import { authClient } from "@/utils/auth-client";
import memberService from "@/services/memberService";

// Mock authClient
vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
    signOut: vi.fn(),
  },
}));

// Mock memberService
vi.mock("@/services/memberService", () => ({
  default: {
    getMyProfile: vi.fn(),
    updateMyProfile: vi.fn(),
    requestPhoneOtp: vi.fn(),
    verifyPhoneOtp: vi.fn(),
  },
}));

// Mock useToast
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

describe("MandatoryContactModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/", href: "/" },
    });
  });

  it("tidak menampilkan modal jika pengguna belum login", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: null,
      isPending: false,
    } as any);

    render(<MandatoryContactModal />);

    expect(screen.queryByText("Konfirmasi Kontak & Identitas Mahasiswa")).not.toBeInTheDocument();
    expect(memberService.getMyProfile).not.toHaveBeenCalled();
  });

  it("tidak menampilkan modal jika role adalah super_admin (admin tidak perlu konfirmasi)", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "admin-1",
          name: "Super Administrator",
          role: "super_admin",
        },
      },
      isPending: false,
    } as any);

    render(<MandatoryContactModal />);

    expect(screen.queryByText("Konfirmasi Kontak & Identitas Mahasiswa")).not.toBeInTheDocument();
    expect(memberService.getMyProfile).not.toHaveBeenCalled();
  });

  it("tidak menampilkan modal jika role adalah staff perpustakaan", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "staff-1",
          name: "Pustakawan UMC",
          role: "staff",
        },
      },
      isPending: false,
    } as any);

    render(<MandatoryContactModal />);

    expect(screen.queryByText("Konfirmasi Kontak & Identitas Mahasiswa")).not.toBeInTheDocument();
    expect(memberService.getMyProfile).not.toHaveBeenCalled();
  });

  it("tidak menampilkan modal jika berada di rute dashboard admin", async () => {
    window.location.pathname = "/dashboard/super-admin";

    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "User",
          role: "student",
        },
      },
      isPending: false,
    } as any);

    render(<MandatoryContactModal />);

    expect(screen.queryByText("Konfirmasi Kontak & Identitas Mahasiswa")).not.toBeInTheDocument();
  });

  it("tidak menampilkan modal jika profil member bertipe staff/super_admin", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "staff-member-1",
          name: "Staf",
          role: "student",
        },
      },
      isPending: false,
    } as any);

    vi.mocked(memberService.getMyProfile).mockResolvedValue({
      id: "mem-1",
      userId: "staff-member-1",
      phone: null,
      memberType: "staff",
      user: { name: "Staf" },
    } as any);

    render(<MandatoryContactModal />);

    await waitFor(() => {
      expect(screen.queryByText("Konfirmasi Kontak & Identitas Mahasiswa")).not.toBeInTheDocument();
    });
  });

  it("tidak menampilkan modal jika mahasiswa sudah memiliki nama dan nomor telepon lengkap", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "mhs-1",
          name: "Fulan Mahasiswa",
          role: "student",
        },
      },
      isPending: false,
    } as any);

    vi.mocked(memberService.getMyProfile).mockResolvedValue({
      id: "mem-mhs-1",
      userId: "mhs-1",
      phone: "081234567890",
      memberType: "student",
      user: { name: "Fulan Mahasiswa" },
    } as any);

    render(<MandatoryContactModal />);

    await waitFor(() => {
      expect(screen.queryByText("Konfirmasi Kontak & Identitas Mahasiswa")).not.toBeInTheDocument();
    });
  });

  it("menampilkan modal jika mahasiswa baru belum mengisi nomor telepon", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "mhs-new",
          name: "Mahasiswa Baru",
          role: "student",
        },
      },
      isPending: false,
    } as any);

    vi.mocked(memberService.getMyProfile).mockResolvedValue({
      id: "mem-mhs-new",
      userId: "mhs-new",
      phone: "",
      memberType: "student",
      user: { name: "Mahasiswa Baru" },
    } as any);

    render(<MandatoryContactModal />);

    expect(await screen.findByText("Konfirmasi Kontak & Identitas Mahasiswa")).toBeInTheDocument();
    expect(screen.getByText("Lengkapi Data Kontak Pemustaka")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mahasiswa Baru")).toBeInTheDocument();
  });

  it("memvalidasi panjang nomor telepon sebelum mengirim OTP", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "mhs-new",
          name: "Budi",
          role: "student",
        },
      },
      isPending: false,
    } as any);

    vi.mocked(memberService.getMyProfile).mockResolvedValue({
      id: "mem-mhs-new",
      userId: "mhs-new",
      phone: null,
      memberType: "student",
      user: { name: "Budi" },
    } as any);

    render(<MandatoryContactModal />);

    const phoneInput = await screen.findByPlaceholderText("Contoh: 081234567890");
    fireEvent.change(phoneInput, { target: { value: "12345" } }); // kurang dari 9 digit

    const submitBtn = screen.getByRole("button", { name: /Kirim Kode OTP/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(
        "Nomor telepon/WhatsApp wajib diisi dengan format yang benar (9-15 digit angka)."
      )
    ).toBeInTheDocument();
    expect(memberService.requestPhoneOtp).not.toHaveBeenCalled();
  });

  it("mengirim kode OTP lalu memverifikasi OTP dan menyimpan profil mahasiswa baru", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "mhs-new",
          name: "Budi Santoso",
          role: "student",
        },
      },
      isPending: false,
    } as any);

    vi.mocked(memberService.getMyProfile).mockResolvedValue({
      id: "mem-mhs-new",
      userId: "mhs-new",
      phone: "",
      memberType: "student",
      user: { name: "Budi Santoso" },
    } as any);

    vi.mocked(memberService.requestPhoneOtp).mockResolvedValue({
      maskedPhone: "0812****7899",
      normalizedPhone: "6281234567899",
      expiresInSeconds: 300,
      cooldownSeconds: 60,
      provider: "simulation",
      devOtpCode: "654321",
    });

    vi.mocked(memberService.verifyPhoneOtp).mockResolvedValue({
      id: "mem-mhs-new",
      userId: "mhs-new",
      phone: "081234567899",
      phoneVerified: true,
    } as any);

    render(<MandatoryContactModal />);

    const phoneInput = await screen.findByPlaceholderText("Contoh: 081234567890");
    fireEvent.change(phoneInput, { target: { value: "081234567899" } });

    fireEvent.click(screen.getByRole("button", { name: /Kirim Kode OTP/i }));

    await waitFor(() => {
      expect(memberService.requestPhoneOtp).toHaveBeenCalledWith("081234567899");
      expect(screen.getByText("Verifikasi Kode OTP Nomor Telepon")).toBeInTheDocument();
      expect(screen.getByText("654321")).toBeInTheDocument();
    });

    const otpInput = screen.getByPlaceholderText("Masukkan 6 digit kode OTP");
    fireEvent.change(otpInput, { target: { value: "654321" } });

    fireEvent.click(screen.getByRole("button", { name: /Verifikasi & Simpan/i }));

    await waitFor(() => {
      expect(memberService.verifyPhoneOtp).toHaveBeenCalledWith({
        phone: "081234567899",
        code: "654321",
        name: "Budi Santoso",
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("Nomor Terverifikasi", expect.any(String));
      expect(screen.queryByText("Konfirmasi Kontak & Identitas Mahasiswa")).not.toBeInTheDocument();
    });
  });

  it("dapat keluar / logout jika memilih ganti akun", async () => {
    vi.mocked(authClient.useSession).mockReturnValue({
      data: {
        user: {
          id: "mhs-new",
          name: "Budi Santoso",
          role: "student",
        },
      },
      isPending: false,
    } as any);

    vi.mocked(memberService.getMyProfile).mockResolvedValue({
      id: "mem-mhs-new",
      userId: "mhs-new",
      phone: "",
      memberType: "student",
      user: { name: "Budi Santoso" },
    } as any);

    render(<MandatoryContactModal />);

    const logoutBtn = await screen.findByText("Ganti akun atau keluar");
    fireEvent.click(logoutBtn);

    expect(authClient.signOut).toHaveBeenCalled();
  });
});
