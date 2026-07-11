import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { resendVerification } from "../services/api.js";

export default function RegisterPage() {
  const { confirmEmail, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "buyer" });
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const data = await register(form);
      if (data.requiresVerification) {
        setPendingEmail(data.email || form.email);
        setNotice("We sent a 6-digit verification code to your email.");
      } else {
        navigate(data.user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    try {
      const data = await confirmEmail({ email: pendingEmail, code: verificationCode });
      navigate(data.user?.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to verify email.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setNotice("");
    try {
      const data = await resendVerification(pendingEmail);
      setNotice(data.message || "A new code has been sent.");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to resend code.");
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
          {pendingEmail ? (
          <form onSubmit={handleVerify}>
            <div className="filter-group">
              <div className="filter-group-title">Verification Code</div>
              <input
                className="price-input"
                maxLength="6"
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, ""))}
                placeholder="Enter 6-digit code"
                required
                type="text"
                value={verificationCode}
              />
            </div>
            <p className="muted-note">Code sent to {pendingEmail}. It expires in 15 minutes.</p>
            {notice ? <p className="muted-note">{notice}</p> : null}
            {error ? <p className="muted-note">{error}</p> : null}
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" disabled={loading || verificationCode.length !== 6} type="submit">
                {loading ? "Verifying..." : "Verify Email"}
              </button>
              <button className="btn btn-outline" onClick={handleResend} type="button">
                Resend Code
              </button>
            </div>
          </form>
          ) : (
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
            {notice ? <p className="muted-note">{notice}</p> : null}
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
          )}
        </div>
      </section>
    </main>
  );
}
