import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await login(form);
      const fallbackPath = data.user?.role === "admin" ? "/admin" : "/dashboard";
      navigate(location.state?.from?.pathname || fallbackPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="page-header-bar">
        <div>
          <h2>Login</h2>
          <p>Access your Vintora dashboard, listings, and account details.</p>
        </div>
      </div>

      <section className="closet-body" style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div className="data-card">
          <form onSubmit={handleSubmit}>
            <div className="filter-group">
              <div className="filter-group-title">Email</div>
              <input className="price-input" name="email" onChange={handleChange} required type="email" value={form.email} />
            </div>
            <div className="filter-group">
              <div className="filter-group-title">Password</div>
              <input className="price-input" name="password" onChange={handleChange} required type="password" value={form.password} />
            </div>
            {error ? <p className="muted-note">{error}</p> : null}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button className="btn btn-primary" disabled={loading} type="submit">
                {loading ? "Signing In..." : "Login"}
              </button>
              <Link className="btn btn-outline" to="/register">
                Create Account
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
