import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Profile from "../Profile";

// Mocks
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams("tab=edit-profil"), vi.fn()],
  };
});

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

const mockSessionData = {
  user: { id: "u1", name: "Baji", email: "baji@gmail.com", role: "member" },
};

const mockRequestPasswordReset = vi.fn();
vi.mock("@/utils/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: mockSessionData,
      isPending: false,
    }),
    requestPasswordReset: (...args: any[]) => mockRequestPasswordReset(...args),
  },
}));

const mockGetMyProfile = vi.fn();
const mockUpdateMyProfile = vi.fn();
vi.mock("@/services/memberService", () => ({
  default: {
    getMyProfile: () => mockGetMyProfile(),
    updateMyProfile: (...args: any[]) => mockUpdateMyProfile(...args),
    uploadMyAvatar: vi.fn(),
    requestMyMemberCard: vi.fn(),
    requestCardRenewal: vi.fn(),
  },
}));

vi.mock("@/services/loanService", () => ({
  default: {
    getMyLoanHistory: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/services/fineService", () => ({
  default: {
    getMyFines: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/utils/bookmarks", () => ({
  getSavedBookIds: vi.fn().mockReturnValue([]),
  syncBookmarksFromDb: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/hooks/useSiteSettings", () => ({
  useSiteSettings: () => ({
    settings: {
      branding: { siteTitle: "Perpus", siteTagline: "", faviconUrl: "", logoUrl: "", metaDescription: "" },
      banner: { isActive: false, badgeText: "", message: "", linkText: "", linkUrl: "", dismissible: false },
      hero: { title: "", subtitle: "", backgroundImage: "", searchPlaceholder: "", quickChips: [] },
      location: { embedUrl: "", directUrl: "", building: "", operationalHours: "", phone: "", email: "" },
      footer: { motto: "", socialMedia: { instagram: "https://www.instagram.com/perpusumc" }, campuses: [], campusLinks: [] },
    },
    loading: false,
  }),
}));

vi.mock("@/components/ui/navbar", () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock("@/components/Footer", () => ({
  default: () => <div data-testid="footer" />,
}));

vi.mock("@/components/RiwayatPeminjaman", () => ({
  default: () => <div data-testid="riwayat-peminjaman" />,
}));

vi.mock("@/components/FinesList", () => ({
  default: () => <div data-testid="fines-list" />,
}));

vi.mock("@/components/MemberCard", () => ({
  default: () => <div data-testid="member-card" />,
}));

vi.mock("@/components/SavedBooksTab", () => ({
  default: () => <div data-testid="saved-books-tab" />,
}));

vi.mock("@/components/LecturerRecommendationList", () => ({
  default: () => <div data-testid="lecturer-recommendations" />,
}));

describe("Profile Page - Text Limitation, Disallowed Characters Warning, and Gear Menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMyProfile.mockResolvedValue({
      user: { id: "u1", name: "Baji", email: "baji@gmail.com" },
      memberType: "external",
      isExternal: true,
      institution: "Universitas Muhammadiyah Cirebon",
      originRegion: "Cirebon",
      phone: "08123456789",
    });
  });

  it("menampilkan peringatan jika user menginput karakter terlarang / script tag", async () => {
    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Universitas / Instansi")).toBeInTheDocument();
    });

    const instInput = screen.getByPlaceholderText("Universitas / Instansi");

    // Input script tag
    fireEvent.change(instInput, { target: { value: "<script>alert(1);</script>" } });

    // Warning message should appear
    expect(
      screen.getByText('Karakter seperti <, >, ;, ", \\, {, } tidak diperbolehkan.')
    ).toBeInTheDocument();

    // Submit button should be disabled
    const submitBtn = screen.getByRole("button", { name: "Simpan Perubahan" });
    expect(submitBtn).toBeDisabled();
  });

  it("menerapkan batas maxLength pada input text", async () => {
    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Universitas / Instansi")).toBeInTheDocument();
    });

    const instInput = screen.getByPlaceholderText("Universitas / Instansi");
    expect(instInput).toHaveAttribute("maxLength", "100");

    const phoneInput = screen.getByPlaceholderText("081234567890");
    expect(phoneInput).toHaveAttribute("maxLength", "20");
  });

  it("tombol gir membuka menu pengaturan akun (kembalikan data, muat ulang, ubah kata sandi)", async () => {
    render(<Profile />);

    await waitFor(() => {
      expect(screen.getByLabelText("Opsi Pengaturan Akun")).toBeInTheDocument();
    });

    const gearBtn = screen.getByLabelText("Opsi Pengaturan Akun");
    fireEvent.pointerDown(gearBtn);

    expect(screen.getByText("Kembalikan Data Form")).toBeInTheDocument();
    expect(screen.getByText("Muat Ulang Profil")).toBeInTheDocument();
    expect(screen.getByText("Ubah Kata Sandi")).toBeInTheDocument();
  });
});
