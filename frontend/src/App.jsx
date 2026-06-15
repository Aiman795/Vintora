import { Navigate, Route, Routes } from "react-router-dom";
import NavBar from "./components/NavBar.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import HomePage from "./pages/HomePage.jsx";
import BrowsePage from "./pages/BrowsePage.jsx";
import BuddyPage from "./pages/BuddyPage.jsx";
import ClosetPage from "./pages/ClosetPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import SellerProfilePage from "./pages/SellerProfilePage.jsx";
import TryOnPage from "./pages/TryOnPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import MessagesPage from "./pages/MessagesPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import WishlistPage from "./pages/WishlistPage.jsx";
import InfoPage from "./pages/InfoPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";

export default function App() {
  return (
    <div className="site-shell">
      <NavBar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/buddy" element={<BuddyPage />} />
        <Route
          path="/closet"
          element={
            <ProtectedRoute>
              <ClosetPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wishlist"
          element={
            <ProtectedRoute>
              <WishlistPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          }
        />

        <Route path="/tryon" element={<TryOnPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/seller/:id" element={<SellerProfilePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/help" element={<InfoPage />} />
        <Route path="/policies" element={<InfoPage />} />
        <Route path="/blog" element={<InfoPage />} />
        <Route path="/success-stories" element={<InfoPage />} />
        <Route path="/contact" element={<InfoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}
