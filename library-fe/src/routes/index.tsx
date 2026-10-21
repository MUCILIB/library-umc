import { Routes, Route, Navigate } from "react-router";

// Pages
import Home from "../pages/Home";
import About from "../pages/About";
import Katalog from "../pages/Katalog";
import DetailKatalog from "../pages/KatalogDetail";
import Login from "../pages/LoginPage";
import Register from "../pages/Register";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import ResetPasswordPage from "../pages/ResetPasswordPage";
import HandleLogout from "../pages/Handlelogout";
import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";
import Profile from "../pages/Profile";
import RepositoryDetailPage from "../pages/RepositoryDetailPage";
import Eresource from "../pages/EResoucePage";
import MyLoans from "../pages/MyLoansPage";
import MyRepositoryPage from "../pages/MyRepositoryPage";
import LecturerRecommendationsPage from "../pages/LecturerRecommendationsPage";
import NotFound from "../pages/NotFound";
import ProtectedRoute from "../components/ProtectedRoute";
import NonAdminRoute from "./NonAdminRoute"; 
import PublicRoute from "./PublicRoute"; // Komponen baru untuk memblokir akses login saat sudah masuk
import TentangPage from "../pages/TentangPage";
import WebTrafficTracker from "@/components/WebTrafficTracker";
import AbsensiPage from "../pages/Absensi";

const AppRoutes = () => {
  return (
    <>
      <WebTrafficTracker />
      <Routes>
        {/* Rute Publik (Akses terbatas untuk Admin) */}
        <Route path="/" element={<NonAdminRoute><Home /></NonAdminRoute>} />
        <Route path="/about" element={<NonAdminRoute><About /></NonAdminRoute>} />
        <Route path="/katalog" element={<NonAdminRoute><Katalog /></NonAdminRoute>} />
        <Route path="/katalog/:id" element={<NonAdminRoute><DetailKatalog /></NonAdminRoute>} />
        <Route path="/repository/:id" element={<NonAdminRoute><RepositoryDetailPage /></NonAdminRoute>} />
        <Route path="/profile" element={<NonAdminRoute><Profile /></NonAdminRoute>} />
        <Route path="/e-resource" element={<NonAdminRoute><Eresource /></NonAdminRoute>} />
        <Route path="/tentang" element={<NonAdminRoute><TentangPage /></NonAdminRoute>} />
        <Route path="/lokasi" element={<NonAdminRoute><TentangPage /></NonAdminRoute>} />
        <Route path="/absensi" element={<NonAdminRoute><AbsensiPage /></NonAdminRoute>} />
        <Route path="/input-kunjungan" element={<NonAdminRoute><AbsensiPage /></NonAdminRoute>} />
        <Route path="/buku-tamu" element={<NonAdminRoute><AbsensiPage /></NonAdminRoute>} />
        <Route path="/repositori" element={<Navigate to="/e-resource" replace />} />
        <Route path="/repositori-saya" element={<Navigate to="/my-repository" replace />} />
        
        <Route 
          path="/my-loans" 
          element={
            <ProtectedRoute excludeRole={["super_admin", "staff"]}>
              <MyLoans />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/my-repository" 
          element={
            <ProtectedRoute excludeRole={["super_admin", "staff"]}>
              <MyRepositoryPage />
            </ProtectedRoute>
          } 
        />

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
            <ProtectedRoute requiredRole="super_admin">
              <SuperAdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default AppRoutes;
