import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

function linkClass({ isActive }) {
  return isActive ? "active" : "";
}

export default function NavBar() {
  const { isAuthenticated, logout, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isSeller = user?.role === "seller";
  const isBuyer = user?.role === "buyer";
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <nav>
      <NavLink className="nav-brand" to="/">
        <div className="nav-logo">
          Vint<span>ora</span>
        </div>
        <div className="nav-tagline">Sustainable Fashion</div>
      </NavLink>

      <div className="nav-links">
        <NavLink className={linkClass} to="/">
          Home
        </NavLink>
        <NavLink className={linkClass} to="/browse">
          Browse
        </NavLink>

        {!isAdmin && !isSeller ? (
          <>
            <NavLink className={linkClass} to="/buddy">
              AI Buddy
            </NavLink>
            <NavLink className={linkClass} to="/closet">
              Smart Closet
            </NavLink>
            <NavLink className={linkClass} to="/tryon">
              Virtual Try-On
            </NavLink>
          </>
        ) : null}

        {!isAdmin ? (
          <NavLink className={linkClass} to="/dashboard">
            Dashboard
          </NavLink>
        ) : null}

        {isAuthenticated && isBuyer ? (
          <NavLink className={linkClass} to="/wishlist">
            Saved
          </NavLink>
        ) : null}

        {isAdmin ? (
          <NavLink className={linkClass} to="/admin">
            Admin
          </NavLink>
        ) : null}
      </div>

      <div className="nav-actions">
        {isAuthenticated ? (
          <>
            <NotificationBell />
            <NavLink className="btn btn-outline" to="/profile">
              Profile
            </NavLink>
            <button className="btn btn-primary" onClick={handleLogout} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <NavLink className="btn btn-outline" to="/login">
              Login
            </NavLink>
            <NavLink className="btn btn-primary" to="/register">
              Register
            </NavLink>
          </>
        )}
      </div>
    </nav>
  );
}