import { Routes, Route } from "react-router";

// Pages
import Home from "../pages/Home";
import About from "../pages/About";
import Login from "../components/ui/login";
import Register from "../pages/Register";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 404 Not Found */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
              <p className="text-xl text-gray-600 mb-8">Page not found</p>
              <a
                href="/"
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors inline-block"
              >
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
