import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { fetchProfile, updateProfile } from "../services/api.js";

export default function ProfilePage() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchProfile().then((data) => {
      setProfile(data);
      setName(data.name || "");
    });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setMessage(null);

    if (newPassword && newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    setSaving(true);
    try {
      const payload = { name };
      if (newPassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const updated = await updateProfile(payload);
      login(localStorage.getItem("vintora_token"), updated);
      setMessage({ type: "success", text: "Profile updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update profile." });
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <main className="page">
        <div className="empty-state" style={{ margin: "60px auto", maxWidth: 480 }}>
          <h3>Loading profile…</h3>
        </div>
      </main>
    );
  }

  const initials = profile.name?.slice(0, 2).toUpperCase() || "VT";
  const memberSince = new Date(profile.createdAt).toLocaleDateString("en-PK", { year: "numeric", month: "long" });

  const statusColor = {
    Active: { bg: "rgba(105,123,97,0.12)", color: "#4b6848" },
    Pending: { bg: "rgba(201,154,52,0.14)", color: "#866018" },
    Blocked: { bg: "rgba(180,88,72,0.12)", color: "#9c3f32" },
    Suspended: { bg: "rgba(180,88,72,0.12)", color: "#9c3f32" },
  };

  const verifyColor = {
    Verified: { bg: "rgba(105,123,97,0.12)", color: "#4b6848" },
    Unverified: { bg: "rgba(201,154,52,0.14)", color: "#866018" },
    Pending: { bg: "rgba(201,154,52,0.14)", color: "#866018" },
    Rejected: { bg: "rgba(180,88,72,0.12)", color: "#9c3f32" },
  };

  const acctStyle = statusColor[profile.accountStatus] || statusColor.Pending;
  const verifyStyle = verifyColor[profile.verificationStatus] || verifyColor.Unverified;

  return (
    <main className="page">
      {/* Header bar */}
      <div className="page-header-bar" style={{ paddingBottom: "28px" }}>
        <div>
          <div className="product-breadcrumb">Account</div>
          <h2 style={{ margin: "6px 0 0" }}>My Profile</h2>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        gap: "28px",
        padding: "0 clamp(18px, 4vw, 48px) 60px",
        alignItems: "start"
      }}>

        {/* ── Left identity card ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Avatar + name card */}
          <div className="data-card" style={{ textAlign: "center", padding: "36px 24px" }}>
            <div style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              background: "var(--gold-pale)",
              border: "1px solid var(--border)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-display)",
              fontSize: 32,
              color: "var(--ink)",
              margin: "0 auto 18px"
            }}>
              {initials}
            </div>

            <h3 style={{
              margin: "0 0 4px",
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 400,
              color: "var(--ink)"
            }}>
              {profile.name}
            </h3>
            <p className="muted-note" style={{ margin: "0 0 20px" }}>{profile.email}</p>

            {/* Status pills */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <span style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "rgba(90,48,40,0.1)",
                color: "var(--wine)"
              }}>
                {profile.role}
              </span>
              <span style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: acctStyle.bg,
                color: acctStyle.color
              }}>
                {profile.accountStatus}
              </span>
              <span style={{
                padding: "5px 14px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: verifyStyle.bg,
                color: verifyStyle.color
              }}>
                {profile.verificationStatus}
              </span>
            </div>
          </div>

          {/* Member since card */}
          <div className="kpi-block" style={{ borderLeft: "4px solid rgba(201,154,52,0.55)" }}>
            <div className="klabel">Member Since</div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              color: "var(--terracotta)",
              marginTop: 6
            }}>
              {memberSince}
            </div>
          </div>

          {/* Role info card */}
          <div className="data-card" style={{ padding: "20px 22px" }}>
            <p className="muted-note" style={{ margin: 0, lineHeight: 1.7, fontSize: 13 }}>
              {profile.role === "seller"
                ? "As a seller, you can list outfits for rent or sale. Keep your profile active to receive booking requests."
                : profile.role === "admin"
                ? "You have admin access to manage listings, users, and disputes on Vintora."
                : "As a buyer, you can browse listings, make bookings, and use AI features like Fashion Buddy and Virtual Try-On."}
            </p>
          </div>
        </div>

        {/* ── Right edit form ── */}
        <div className="data-card" style={{ padding: "32px 36px" }}>
          <div className="data-card-head" style={{ marginBottom: "28px" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 400 }}>
              Edit Profile
            </h3>
          </div>

          {message && (
            <div style={{
              marginBottom: "22px",
              padding: "12px 16px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              background: message.type === "success"
                ? "rgba(105,123,97,0.12)"
                : "rgba(180,88,72,0.1)",
              color: message.type === "success" ? "#4b6848" : "#9c3f32",
              border: `1px solid ${message.type === "success" ? "rgba(105,123,97,0.25)" : "rgba(180,88,72,0.22)"}`,
              letterSpacing: "0.02em"
            }}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Name */}
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--sepia-light)"
              }}>
                Full Name
              </label>
              <input
                className="price-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ padding: "12px 14px", width: "100%" }}
              />
            </div>

            {/* Email (read-only) */}
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--sepia-light)"
              }}>
                Email Address
              </label>
              <input
                className="price-input"
                type="email"
                value={profile.email}
                disabled
                style={{
                  padding: "12px 14px",
                  width: "100%",
                  opacity: 0.55,
                  cursor: "not-allowed"
                }}
              />
              <span className="muted-note" style={{ fontSize: 12 }}>
                Email address cannot be changed.
              </span>
            </div>

            {/* Divider */}
            <div style={{
              borderTop: "1px solid var(--border-light)",
              margin: "4px 0",
              paddingTop: "4px"
            }}>
              <p style={{
                margin: "0 0 4px",
                fontSize: 16,
                fontFamily: "var(--font-display)",
                fontWeight: 500,
                color: "var(--ink)"
              }}>
                Change Password
              </p>
              <p className="muted-note" style={{ margin: 0, fontSize: 13 }}>
                Leave blank to keep your current password.
              </p>
            </div>

            {/* Current password */}
            <div style={{ display: "grid", gap: 8 }}>
              <label style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--sepia-light)"
              }}>
                Current Password
              </label>
              <input
                className="price-input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={{ padding: "12px 14px", width: "100%" }}
              />
            </div>

            {/* New + confirm in a 2-col grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--sepia-light)"
                }}>
                  New Password
                </label>
                <input
                  className="price-input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  style={{ padding: "12px 14px" }}
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <label style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  color: "var(--sepia-light)"
                }}>
                  Confirm New Password
                </label>
                <input
                  className="price-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  style={{ padding: "12px 14px" }}
                />
              </div>
            </div>

            <div style={{ paddingTop: 8 }}>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={saving}
                style={{ padding: "13px 36px", fontSize: 12 }}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}