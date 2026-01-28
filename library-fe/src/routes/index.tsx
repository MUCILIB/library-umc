import { Routes, Route } from "react-router";

// Pages
import Home from "../pages/Home";
import About from "../pages/About";
import Login from "../pages/LoginPage";
import Register from "../pages/Register";
import HandleLogout from "../pages/Handlelogout";
import SuperAdminDashboard from "../pages/dashboard/SuperAdminDashboard";
import AddCollectionPage from "../pages/dashboard/AddCollectionPage";
import AddCategoryPage from "../pages/dashboard/AddCategoryPage";
import AddGuestPage from "../pages/dashboard/AddGuestPage";
import EditCollectionPage from "../pages/dashboard/EditCollectionPage";
import EditCategoryPage from "../pages/dashboard/EditCategoryPage";

// Components
import ProtectedRoute from "../components/ProtectedRoute";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
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
      <Route
        path="/dashboard/super-admin/collections/add"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <AddCollectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin/categories/add"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <AddCategoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/super-admin/guests/add"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <AddGuestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/collections/edit/:id"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <EditCollectionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/categories/edit/:id"
        element={
          <ProtectedRoute requiredRole="super_admin">
            <EditCategoryPage />
          </ProtectedRoute>
        }
      />

      {/* 404 Not Found */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-[#030304]">
            <div className="text-center">
              <h1 className="text-6xl font-heading font-bold gradient-text mb-4">
                404
              </h1>
              <p className="text-xl text-[#94A3B8] mb-8">Page not found</p>
              <a href="/" className="btn-primary inline-block">
                Go Home
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
};

export default AppRoutes;
