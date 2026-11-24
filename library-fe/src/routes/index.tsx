import { Routes, Route, Navigate, useParams } from "react-router";

// Pages
import Home from "../pages/Home";
import Katalog from "../pages/Katalog";
import DetailKatalog from "../pages/KatalogDetail";
import Login from "../pages/LoginPage";
import Register from "../pages/Register";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import HandleLogout from "../pages/Handlelogout";
import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";
import ReturnConfirmationPage from "../pages/dashboard/ReturnConfirmationPage";
import Profile from "../pages/Profile";
import RepositoryDetailPage from "../pages/RepositoryDetailPage";
import RepositoriPage from "../pages/RepositoriPage";
import LecturerRecommendationsPage from "../pages/LecturerRecommendationsPage";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "../components/ProtectedRoute";
import NonAdminRoute from "./NonAdminRoute"; 
import PublicRoute from "./PublicRoute"; // Komponen baru untuk memblokir akses login saat sudah masuk
import TentangPage from "../pages/TentangPage";
import BeritaPage from "../pages/BeritaPage";
import BeritaDetailPage from "../pages/BeritaDetailPage";
import WebTrafficTracker from "@/components/WebTrafficTracker";
import AbsensiPage from "../pages/Absensi";
import { MandatoryContactModal } from "@/components/common/MandatoryContactModal";

const NewsEditRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/super-admin?tab=cms-news&action=edit&id=${id}`} replace />;
};

const EbookEditRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/super-admin?tab=ebooks&action=edit&id=${id}`} replace />;
};

const RepositoryEditRedirect = () => {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/dashboard/super-admin?tab=repository&action=edit&id=${id}`} replace />;
};

const AppRoutes = () => {
  return (
    <>
      <WebTrafficTracker />
      <MandatoryContactModal />
      <Routes>
        {/* Rute Publik (Akses terbatas untuk Admin) */}
        <Route path="/" element={<NonAdminRoute><Home /></NonAdminRoute>} />
        <Route path="/about" element={<Navigate to="/tentang" replace />} />
        <Route path="/katalog" element={<NonAdminRoute><Katalog /></NonAdminRoute>} />
        <Route path="/katalog/:id" element={<NonAdminRoute><DetailKatalog /></NonAdminRoute>} />
        <Route path="/repository/:id" element={<NonAdminRoute><RepositoryDetailPage /></NonAdminRoute>} />
        <Route path="/profile" element={<NonAdminRoute><Profile /></NonAdminRoute>} />
        <Route path="/repositori" element={<NonAdminRoute><RepositoriPage /></NonAdminRoute>} />
        <Route path="/e-resource" element={<Navigate to="/repositori" replace />} />
        <Route path="/tentang" element={<NonAdminRoute><TentangPage /></NonAdminRoute>} />
        <Route path="/lokasi" element={<NonAdminRoute><TentangPage /></NonAdminRoute>} />
        <Route path="/berita" element={<BeritaPage />} />
        <Route path="/berita/:slug" element={<BeritaDetailPage />} />
        <Route path="/absensi" element={<AbsensiPage />} />
        <Route path="/input-kunjungan" element={<AbsensiPage />} />
        <Route path="/buku-tamu" element={<AbsensiPage />} />
        <Route path="/repositori-saya" element={<Navigate to="/profile?tab=repositori-saya" replace />} />
        <Route path="/my-loans" element={<Navigate to="/profile?tab=peminjaman-aktif" replace />} />
        <Route path="/my-repository" element={<Navigate to="/profile?tab=repositori-saya" replace />} />

        {/* Fitur Khusus Dosen: Rekomendasi Buku */}
        <Route 
          path="/rekomendasi-buku" 
          element={
            <ProtectedRoute requiredRole={["lecturer", "dosen", "super_admin"]}>
              <LecturerRecommendationsPage />
            </ProtectedRoute>
          } 
        />
        <Route path="/usulan-buku" element={<Navigate to="/rekomendasi-buku" replace />} />

        {/* Auth Routes (Dibatasi agar tidak bisa diakses saat sudah login) */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/register" element={
          <PublicRoute><Register /></PublicRoute>
        } />
        <Route path="/forgot-password" element={
          <PublicRoute><ForgotPasswordPage /></PublicRoute>
        } />
        <Route path="/reset-password" element={
          <PublicRoute><ResetPasswordPage /></PublicRoute>
        } />
        <Route path="/handle" element={<HandleLogout />} />

        {/* Dashboard Routes - Protected */}
        <Route
          path="/dashboard/super-admin"
          element={
            <ProtectedRoute requiredRole={["super_admin", "staff"]}>
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/return-confirmation/:loanId"
          element={
            <ProtectedRoute requiredRole={["super_admin", "staff"]}>
              <ReturnConfirmationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/berita/baru"
          element={<Navigate to="/dashboard/super-admin?tab=cms-news&action=create" replace />}
        />
        <Route
          path="/dashboard/berita/create"
          element={<Navigate to="/dashboard/super-admin?tab=cms-news&action=create" replace />}
        />
        <Route
          path="/dashboard/berita/edit/:id"
          element={<NewsEditRedirect />}
        />
        <Route
          path="/dashboard/ebooks/baru"
          element={<Navigate to="/dashboard/super-admin?tab=ebooks&action=create" replace />}
        />
        <Route
          path="/dashboard/ebooks/create"
          element={<Navigate to="/dashboard/super-admin?tab=ebooks&action=create" replace />}
        />
        <Route
          path="/dashboard/ebooks/edit/:id"
          element={<EbookEditRedirect />}
        />
        <Route
          path="/dashboard/repository/baru"
          element={<Navigate to="/dashboard/super-admin?tab=repository&action=create" replace />}
        />
        <Route
          path="/dashboard/repository/upload"
          element={<Navigate to="/dashboard/super-admin?tab=repository&action=create" replace />}
        />
        <Route
          path="/dashboard/repository/create"
          element={<Navigate to="/dashboard/super-admin?tab=repository&action=create" replace />}
        />
        <Route
          path="/dashboard/repository/edit/:id"
          element={<RepositoryEditRedirect />}
        />
        <Route
          path="/return-confirmation/:loanId"
          element={
            <ProtectedRoute requiredRole={["super_admin", "staff"]}>
              <ReturnConfirmationPage />
            </ProtectedRoute>
          }
        />
        <Route path="/items" element={<Navigate to="/dashboard/super-admin?tab=items" replace />} />
        <Route path="/item" element={<Navigate to="/dashboard/super-admin?tab=items" replace />} />
        <Route path="/exemplar" element={<Navigate to="/dashboard/super-admin?tab=items" replace />} />
        <Route path="/eksemplar" element={<Navigate to="/dashboard/super-admin?tab=items" replace />} />
        <Route path="/dashboard" element={<Navigate to="/dashboard/super-admin" replace />} />
        <Route path="/dashboard/loans" element={<Navigate to="/dashboard/super-admin?tab=loans" replace />} />
        <Route path="/dashboard/return-approvals" element={<Navigate to="/dashboard/super-admin?tab=return-approvals" replace />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
