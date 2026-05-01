import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { formatCurrency } from "../utils/bookingPricing";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  useEffect(() => {
    const fetchAdminData = async () => {
      if (user?.role !== "admin") {
        setLoading(false);
        return;
      }

      try {
        const [overviewResult] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/analytics/admin/overview`, {
            ...authConfig,
            timeout: 10000,
          }),
        ]);

        if (overviewResult.status === "fulfilled") {
          setOverview(overviewResult.value.data?.summary || null);
        } else {
          console.error("Admin analytics failed", overviewResult.reason);
          setLoadError("Some admin data could not be loaded. Please refresh.");
        }
      } catch (error) {
        console.error("Failed to load admin dashboard data", error);
        setLoadError("Unable to load admin dashboard right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [authConfig, user?.role]);

  if (user?.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="page-hero-card">
            <span className="page-kicker mb-3">Admin Control</span>
            <h2 className="mb-2">Admin Dashboard</h2>
            <p className="text-muted mb-0">This page is available for admins only.</p>
          </div>
        </div>
      </>
    );
  }

  const newContactCount = overview?.contactMessages?.new || 0;
  const inProgressContactCount = overview?.contactMessages?.inProgress || 0;

  const statItems = [
    {
      label: "Total Users",
      value: overview?.users?.total || 0,
      note: `${overview?.users?.provider || 0} providers`,
    },
    {
      label: "Active Bookings",
      value: (overview?.bookings?.pending || 0) + (overview?.bookings?.confirmed || 0),
      note: `${overview?.bookings?.total || 0} total`,
    },
    {
      label: "Revenue",
      value: formatCurrency(overview?.bookings?.revenue || 0),
      note: `${overview?.bookings?.paidBookings || 0} paid bookings`,
    },
    {
      label: "Contact Inbox",
      value: `${newContactCount} new`,
      note: `${inProgressContactCount} in progress`,
    },
  ];

  const totalBookings = overview?.bookings?.total || 0;
  const completedBookings = overview?.bookings?.completed || 0;
  const pendingBookings = overview?.bookings?.pending || 0;
  const confirmedBookings = overview?.bookings?.confirmed || 0;
  const cancelledBookings = overview?.bookings?.cancelled || 0;
  const paidBookings = overview?.bookings?.paid || 0;
  const paymentPending = overview?.bookings?.paymentPending || 0;

  const completionRate = totalBookings ? Math.round((completedBookings / totalBookings) * 100) : 0;
  const paymentSuccessRate = totalBookings ? Math.round((paidBookings / totalBookings) * 100) : 0;
  const contactResolvedRate = overview?.contactMessages?.total
    ? Math.round(((overview?.contactMessages?.resolved || 0) / overview.contactMessages.total) * 100)
    : 0;
  const pendingShare = totalBookings ? Math.round((pendingBookings / totalBookings) * 100) : 0;
  const confirmedShare = totalBookings ? Math.round((confirmedBookings / totalBookings) * 100) : 0;
  const cancelledShare = totalBookings ? Math.round((cancelledBookings / totalBookings) * 100) : 0;
  const paymentRiskRate = totalBookings ? Math.round((paymentPending / totalBookings) * 100) : 0;

  const signalItems = [
    {
      title: "Adoption Queue",
      value: overview?.adoptions?.pending || 0,
      status: (overview?.adoptions?.pending || 0) > 0 ? "Needs review" : "Healthy",
      tone: (overview?.adoptions?.pending || 0) > 0 ? "warning" : "success",
    },
    {
      title: "Overdue Care Alerts",
      value: overview?.reminders?.overdue || 0,
      status: (overview?.reminders?.overdue || 0) > 0 ? "Action needed" : "Healthy",
      tone: (overview?.reminders?.overdue || 0) > 0 ? "danger" : "success",
    },
    {
      title: "Payment Backlog",
      value: paymentPending,
      status: paymentPending > 0 ? "Follow-up pending" : "Healthy",
      tone: paymentPending > 0 ? "warning" : "success",
    },
  ];

  return (
    <>
      <Navbar />
      <div className="page-shell">
        <div className="container py-4 py-lg-5">
          <div className="admin-command-hero mb-4">
            <div className="admin-command-glow admin-command-glow-a" />
            <div className="admin-command-glow admin-command-glow-b" />
            <div className="position-relative">
              <span className="dashboard-kicker">Admin Control Center</span>
              <h2 className="mb-2 mt-2 text-white">Platform Operations Dashboard</h2>
              <p className="mb-0 text-white-50">
                Track platform health, act on pending operational tasks, and control key settings from one admin-first workspace.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="surface-panel">
              <p className="text-muted mb-0">Loading admin controls...</p>
            </div>
          ) : (
            <>
              {loadError ? (
                <div className="alert alert-warning mb-4">{loadError}</div>
              ) : null}

              <div className="row g-3 mb-4">
                {statItems.map((item) => (
                  <div key={item.label} className="col-md-6 col-xl-3">
                    <div className="admin-stat-card h-100">
                      <p className="mb-1">{item.label}</p>
                      <h3 className="mb-1">{item.value}</h3>
                      <small>{item.note}</small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-panel mb-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <h4 className="mb-0">Priority Queue</h4>
                </div>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="booking-summary-panel">
                      <p className="text-muted mb-1">Pending adoptions</p>
                      <h5 className="mb-0">{overview?.adoptions?.pending || 0}</h5>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="booking-summary-panel">
                      <p className="text-muted mb-1">Overdue reminders</p>
                      <h5 className="mb-0">{overview?.reminders?.overdue || 0}</h5>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="booking-summary-panel">
                      <p className="text-muted mb-1">Payment pending bookings</p>
                      <h5 className="mb-0">{overview?.bookings?.paymentPending || 0}</h5>
                    </div>
                  </div>
                </div>
              </div>

              <div className="row g-3 mb-4">
                {signalItems.map((item) => (
                  <div key={item.title} className="col-md-4">
                    <div className="record-card h-100">
                      <p className="text-muted mb-1">{item.title}</p>
                      <h4 className="mb-2">{item.value}</h4>
                      <span className={`status-pill status-pill-${item.tone}`}>{item.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="surface-panel mb-4">
                <h4 className="mb-3">Operational Performance</h4>
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="booking-summary-panel h-100">
                      <p className="text-muted mb-1">Booking completion rate</p>
                      <h4 className="mb-1">{completionRate}%</h4>
                      <small className="text-muted">{completedBookings} completed of {totalBookings}</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="booking-summary-panel h-100">
                      <p className="text-muted mb-1">Payment success rate</p>
                      <h4 className="mb-1">{paymentSuccessRate}%</h4>
                      <small className="text-muted">{paidBookings} paid of {totalBookings}</small>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="booking-summary-panel h-100">
                      <p className="text-muted mb-1">Contact resolution rate</p>
                      <h4 className="mb-1">{contactResolvedRate}%</h4>
                      <small className="text-muted">{overview?.contactMessages?.resolved || 0} resolved of {overview?.contactMessages?.total || 0}</small>
                    </div>
                  </div>
                </div>
              </div>

              <div className="surface-panel">
                <h4 className="mb-3">Operations Intelligence</h4>
                <div className="row g-3">
                  <div className="col-lg-6">
                    <div className="booking-summary-panel h-100">
                      <p className="text-muted mb-3">Booking pipeline mix</p>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Pending</small>
                          <small className="fw-semibold">{pendingBookings} ({pendingShare}%)</small>
                        </div>
                        <div className="progress">
                          <div className="progress-bar bg-warning" style={{ width: `${pendingShare}%` }} />
                        </div>
                      </div>
                      <div className="mb-3">
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Confirmed</small>
                          <small className="fw-semibold">{confirmedBookings} ({confirmedShare}%)</small>
                        </div>
                        <div className="progress">
                          <div className="progress-bar bg-info" style={{ width: `${confirmedShare}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="d-flex justify-content-between mb-1">
                          <small className="text-muted">Cancelled</small>
                          <small className="fw-semibold">{cancelledBookings} ({cancelledShare}%)</small>
                        </div>
                        <div className="progress">
                          <div className="progress-bar bg-danger" style={{ width: `${cancelledShare}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6">
                    <div className="booking-summary-panel h-100">
                      <p className="text-muted mb-3">Admin focus now</p>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Payment risk rate</span>
                        <span className={`status-pill ${paymentRiskRate > 20 ? "status-pill-danger" : paymentRiskRate > 10 ? "status-pill-warning" : "status-pill-success"}`}>
                          {paymentRiskRate}%
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>New contact messages</span>
                        <span className={`status-pill ${newContactCount > 0 ? "status-pill-warning" : "status-pill-success"}`}>
                          {newContactCount}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>In-progress contact cases</span>
                        <span className="status-pill status-pill-info">{inProgressContactCount}</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span>Overdue reminders</span>
                        <span className={`status-pill ${((overview?.reminders?.overdue || 0) > 0) ? "status-pill-danger" : "status-pill-success"}`}>
                          {overview?.reminders?.overdue || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default AdminDashboard;
