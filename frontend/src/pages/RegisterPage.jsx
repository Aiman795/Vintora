import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" });
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
      const data = await register(form);
      navigate(data.user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="page-header-bar">
        <div>
          <h2>Register</h2>
          <p>Create your Vintora account to manage listings, bookings, and wardrobe data.</p>
        </div>
      </div>

      <section className="closet-body" style={{ maxWidth: "680px", margin: "0 auto" }}>
        <div className="data-card">
          <form onSubmit={handleSubmit}>
            <div className="filter-group">
              <div className="filter-group-title">Name</div>
              <input className="price-input" name="name" onChange={handleChange} required type="text" value={form.name} />
            </div>
            <div className="filter-group">
              <div className="filter-group-title">Email</div>
              <input className="price-input" name="email" onChange={handleChange} required type="email" value={form.email} />
            </div>
            <div className="filter-group">
              <div className="filter-group-title">Password</div>
              <input className="price-input" minLength="6" name="password" onChange={handleChange} required type="password" value={form.password} />
            </div>
            <div className="filter-group">
              <div className="filter-group-title">Account Type</div>
              <select
                className="price-input"
                name="role"
                onChange={handleChange}
                style={{ width: "100%" }}
                value={form.role}
              >
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </div>
            {error ? <p className="muted-note">{error}</p> : null}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button className="btn btn-primary" disabled={loading} type="submit">
                {loading ? "Creating..." : "Register"}
              </button>
              <Link className="btn btn-outline" to="/login">
                Already Have an Account
              </Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
