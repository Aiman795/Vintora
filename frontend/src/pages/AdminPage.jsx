import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  approveListing,
  fetchAdminBookings,
  fetchAdminDisputes,
  fetchAdminDisputeEvidence,
  fetchAdminListings,
  fetchAdminSummary,
  fetchAdminUsers,
  rejectListing,
  resolveAdminDispute,
  updateAdminUserRole,
  updateAdminUserStatus,
  updateAdminUserVerification
} from "../services/api.js";

const sections = ["overview", "approvals", "bookings", "users", "disputes"];

function statusClass(status) {
  if (status === "Live" || status === "resolved" || status === "approved" || status === "completed") {
    return "confirmed";
  }

  if (status === "Pending Approval" || status === "open" || status === "reviewing" || status === "pending") {
    return "pending";
  }

  return "rented";
}

function statusLabel(status) {
  const map = {
    "Pending Approval": "Pending Seller Approval",
    Live: "Approved",
    Archived: "Cancelled",
    open: "Disputed",
    reviewing: "Disputed",
    resolved: "Resolved",
    cancelled: "Cancelled",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed"
  };

  return map[status] || status;
}

function formatDate(date) {
  return date ? new Date(date).toLocaleString() : "N/A";
}

export default function AdminPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [summary, setSummary] = useState({
    pendingListings: 0,
    liveListings: 0,
    archivedListings: 0,
    users: 0,
    openDisputes: 0,
    bookings: 0,
    reviews: 0
  });
  const [listingFilter, setListingFilter] = useState("Pending Approval");
  const [bookingFilter, setBookingFilter] = useState("all");
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [resolutionText, setResolutionText] = useState({});
  const [evidence, setEvidence] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.role === "admin";

  const openDisputes = useMemo(() => disputes.filter((dispute) => dispute.status !== "resolved"), [disputes]);

  const loadAdminData = async () => {
    const [summaryData, listingData, userData, disputeData, bookingData] = await Promise.all([
      fetchAdminSummary(),
      fetchAdminListings(listingFilter),
      fetchAdminUsers(),
      fetchAdminDisputes(),
      fetchAdminBookings(bookingFilter)
    ]);

    setSummary(summaryData);
    setListings(listingData);
    setUsers(userData);
    setDisputes(disputeData);
    setBookings(bookingData);
  };

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    setLoading(true);
    loadAdminData()
      .catch((error) => {
        setMessage(error.response?.data?.message || "Unable to load admin dashboard.");
      })
      .finally(() => setLoading(false));
  }, [isAdmin, listingFilter, bookingFilter]);

  if (!isAdmin) {
    return <Navigate replace to="/dashboard" />;
  }

  const refreshAfterAction = async (successMessage) => {
    await loadAdminData();
    setMessage(successMessage);
  };

  const handleApproveListing = async (id) => {
    setMessage("");
    try {
      await approveListing(id);
      await refreshAfterAction("Listing approved and published.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to approve listing.");
    }
  };

  const handleRejectListing = async (id) => {
    setMessage("");
    try {
      await rejectListing(id);
      await refreshAfterAction("Listing rejected and archived.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to reject listing.");
    }
  };

  const handleRoleChange = async (id, role) => {
    setMessage("");
    try {
      await updateAdminUserRole(id, role);
      await refreshAfterAction("User role updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update user role.");
    }
  };

  const handleStatusChange = async (id, accountStatus) => {
    setMessage("");
    try {
      await updateAdminUserStatus(id, accountStatus);
      await refreshAfterAction("User account status updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update user status.");
    }
  };

  const handleVerificationChange = async (id, verificationStatus) => {
    setMessage("");
    try {
      await updateAdminUserVerification(id, { verificationStatus });
      await refreshAfterAction("User verification updated.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to update verification.");
    }
  };

  const handleResolveDispute = async (id) => {
    setMessage("");
    try {
      await resolveAdminDispute(id, resolutionText[id] || "Resolved by admin.");
      setResolutionText((current) => ({ ...current, [id]: "" }));
      await refreshAfterAction("Dispute resolved.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to resolve dispute.");
    }
  };

  const handleViewEvidence = async (id) => {
    setMessage("");
    try {
      const evidenceData = await fetchAdminDisputeEvidence(id);
      setEvidence(evidenceData);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load dispute evidence.");
    }
  };

  return (
    <main className="dash-layout">
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">Admin</div>
        <div className="dash-nav">
          {sections.map((section) => (
            <button
              className={`dash-nav-item ${activeSection === section ? "active" : ""}`}
              key={section}
              onClick={() => setActiveSection(section)}
              type="button"
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>
      </aside>

      <section className="dash-main">
        <div className="page-header-bar">
          <div>
            <h2>Admin Dashboard</h2>
            <p>Review listings, manage users, and resolve marketplace disputes.</p>
          </div>
        </div>

        {message ? <p className="muted-note">{message}</p> : null}
        {loading ? <p className="muted-note">Loading admin data...</p> : null}

        {activeSection === "overview" ? (
          <div className="kpi-row">
            <button className="kpi-block kpi-clickable" onClick={() => setActiveSection("approvals")} type="button">
              <div className="klabel">Pending Listings</div>
              <div className="kval">{summary.pendingListings}</div>
              <div className="kpi-link">View approvals →</div>
            </button>
            <button className="kpi-block kpi-clickable" onClick={() => setActiveSection("disputes")} type="button">
              <div className="klabel">Open Disputes</div>
              <div className="kval">{summary.openDisputes}</div>
              <div className="kpi-link">View disputes →</div>
            </button>
            <button className="kpi-block kpi-clickable" onClick={() => setActiveSection("users")} type="button">
              <div className="klabel">Total Users</div>
              <div className="kval">{summary.users}</div>
              <div className="kpi-link">Manage users →</div>
            </button>
            <button className="kpi-block kpi-clickable" onClick={() => setActiveSection("bookings")} type="button">
              <div className="klabel">Total Bookings</div>
              <div className="kval">{summary.bookings}</div>
              <div className="kpi-link">View bookings →</div>
            </button>
            <div className="kpi-block">
              <div className="klabel">Total Reviews</div>
              <div className="kval">{summary.reviews}</div>
            </div>
          </div>
        ) : null}

        {activeSection === "approvals" ? (
          <div className="data-card">
            <div className="data-card-head">
              <h3>Listing Approval</h3>
              <select className="price-input" onChange={(event) => setListingFilter(event.target.value)} value={listingFilter}>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Live">Live</option>
                <option value="Archived">Archived</option>
                <option value="all">All Listings</option>
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Seller</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr key={listing._id}>
                    <td>
                      <strong>{listing.title}</strong>
                      <div className="muted-note">{listing.category} / {listing.occasion}</div>
                    </td>
                    <td>{listing.owner?.name || "Seller"}</td>
                    <td>Rs. {Number(listing.price || 0).toLocaleString()}</td>
                    <td>
                      <span className={`spill ${statusClass(listing.status)}`}>{statusLabel(listing.status)}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button className="btn btn-outline" onClick={() => handleApproveListing(listing._id)} type="button">
                          Approve
                        </button>
                        <button className="btn btn-gold" onClick={() => handleRejectListing(listing._id)} type="button">
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {listings.length === 0 ? (
                  <tr>
                    <td colSpan="5">No listings found for this filter.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeSection === "bookings" ? (
          <div className="data-card">
            <div className="data-card-head">
              <h3>All Bookings</h3>
              <select className="price-input" onChange={(event) => setBookingFilter(event.target.value)} value={bookingFilter}>
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking._id}>
                    <td>
                      <strong>{booking.listing?.title || "Listing removed"}</strong>
                      <div className="muted-note">{booking.listing?.category} / {booking.listing?.occasion}</div>
                    </td>
                    <td>
                      {booking.buyer?.name || "N/A"}
                      <div className="muted-note">{booking.buyer?.email}</div>
                    </td>
                    <td>
                      {booking.seller?.name || "N/A"}
                      <div className="muted-note">{booking.seller?.email}</div>
                    </td>
                    <td>{booking.type === "rent" ? "Rent" : "Buy"}</td>
                    <td>
                      {booking.startDate
                        ? `${new Date(booking.startDate).toLocaleDateString()} – ${new Date(booking.endDate).toLocaleDateString()}`
                        : "Direct purchase"}
                    </td>
                    <td>Rs. {Number(booking.totalAmount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`spill ${statusClass(booking.status)}`}>{statusLabel(booking.status)}</span>
                    </td>
                  </tr>
                ))}
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="7">
                      <div className="empty-state compact">
                        <h3>No bookings found</h3>
                        <p>Bookings will appear here once buyers start renting or purchasing.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeSection === "users" ? (
          <div className="data-card">
            <div className="data-card-head">
              <h3>User Management</h3>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Verification</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((account) => (
                  <tr key={account._id}>
                    <td>{account.name}</td>
                    <td>{account.email}</td>
                    <td>
                      <select
                        className="price-input"
                        disabled={account._id === (user?._id || user?.id)}
                        onChange={(event) => handleRoleChange(account._id, event.target.value)}
                        value={account.role}
                      >
                        <option value="buyer">Buyer</option>
                        <option value="seller">Seller</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="price-input"
                        disabled={account._id === (user?._id || user?.id)}
                        onChange={(event) => handleStatusChange(account._id, event.target.value)}
                        value={account.accountStatus || "Active"}
                      >
                        <option value="Active">Active</option>
                        <option value="Pending">Pending</option>
                        <option value="Blocked">Blocked</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="price-input"
                        onChange={(event) => handleVerificationChange(account._id, event.target.value)}
                        value={account.verificationStatus || "Unverified"}
                      >
                        <option value="Unverified">Unverified</option>
                        <option value="Pending">Pending</option>
                        <option value="Verified">Verified</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                    <td>{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activeSection === "disputes" ? (
          <div className="data-card">
            <div className="data-card-head">
              <h3>Dispute Mediation</h3>
              <span className="spill pending">{openDisputes.length} Open</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Reason</th>
                  <th>Raised By</th>
                  <th>Against</th>
                  <th>Status</th>
                  <th>Evidence</th>
                  <th>Resolution</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr key={dispute._id}>
                    <td>
                      <strong>{dispute.reason}</strong>
                      <div className="muted-note">{dispute.details || dispute.listing?.title || "No extra details"}</div>
                    </td>
                    <td>{dispute.raisedBy?.name || "User"}</td>
                    <td>{dispute.againstUser?.name || "N/A"}</td>
                    <td>
                      <span className={`spill ${statusClass(dispute.status)}`}>{statusLabel(dispute.status)}</span>
                    </td>
                    <td>
                      <button className="btn btn-outline" onClick={() => handleViewEvidence(dispute._id)} type="button">
                        View Evidence
                      </button>
                    </td>
                    <td>
                      {dispute.status === "resolved" ? (
                        <span>{dispute.resolution || "Resolved"}</span>
                      ) : (
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                          <input
                            className="price-input"
                            onChange={(event) => setResolutionText((current) => ({ ...current, [dispute._id]: event.target.value }))}
                            placeholder="Decision or refund note"
                            value={resolutionText[dispute._id] || ""}
                          />
                          <button className="btn btn-primary" onClick={() => handleResolveDispute(dispute._id)} type="button">
                            Resolve
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state compact">
                        <h3>No disputes filed</h3>
                        <p>Disputes filed by buyers or sellers will appear here.</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {evidence ? (
              <div className="evidence-panel">
                <div className="data-card-head">
                  <h3>Evidence: {evidence.dispute?.reason}</h3>
                  <button className="btn btn-outline" onClick={() => setEvidence(null)} type="button">Close</button>
                </div>
                <div className="evidence-grid">
                  <div>
                    <h4>Related Booking</h4>
                    <p className="muted-note">
                      Item: <strong>{evidence.booking?.listing?.title || evidence.dispute?.listing?.title || "N/A"}</strong><br />
                      Buyer: <strong>{evidence.booking?.buyer?.name || "N/A"}</strong><br />
                      Seller: <strong>{evidence.booking?.seller?.name || "N/A"}</strong><br />
                      Status: <strong>{statusLabel(evidence.booking?.status)}</strong><br />
                      Total: <strong>Rs. {Number(evidence.booking?.totalAmount || 0).toLocaleString()}</strong>
                    </p>
                  </div>
                  <div>
                    <h4>Dispute History</h4>
                    <p className="muted-note">
                      Raised by: <strong>{evidence.dispute?.raisedBy?.name || "User"}</strong><br />
                      Against: <strong>{evidence.dispute?.againstUser?.name || "N/A"}</strong><br />
                      Filed: <strong>{formatDate(evidence.dispute?.createdAt)}</strong><br />
                      Details: <strong>{evidence.dispute?.details || "No extra details"}</strong>
                    </p>
                  </div>
                </div>
                <div className="evidence-grid">
                  <div>
                    <h4>Messages</h4>
                    {evidence.messages?.length ? evidence.messages.slice(0, 6).map((item) => (
                      <p className="evidence-line" key={item._id}>
                        <strong>{item.sender?.name || "User"}:</strong> {item.text}
                        <span>{formatDate(item.createdAt)}</span>
                      </p>
                    )) : <p className="muted-note">No messages found between these users.</p>}
                  </div>
                  <div>
                    <h4>Reviews</h4>
                    {evidence.reviews?.length ? evidence.reviews.map((review) => (
                      <p className="evidence-line" key={review._id}>
                        <strong>{review.rating}.0 ★ by {review.reviewer?.name || "Buyer"}</strong> {review.comment || "No comment."}
                        <span>{formatDate(review.createdAt)}</span>
                      </p>
                    )) : <p className="muted-note">No related review found.</p>}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </main>
  );
}