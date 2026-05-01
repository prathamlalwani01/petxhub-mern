import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { formatCurrency } from "../utils/bookingPricing";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const StatCard = ({ title, value, subtext, toneClass, delay = 0 }) => (
  <div className="col-md-6 col-xl-3">
    <div className={`modern-metric ${toneClass} stagger-item-fast`} style={{ "--stagger": delay }}>
      <p className="mb-2">{title}</p>
      <h3 className="mb-1">{value}</h3>
      {subtext ? <small className="text-muted">{subtext}</small> : null}
    </div>
  </div>
);

function AdminAnalytics() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/analytics/admin/overview`, authConfig);
        setData(res.data);
      } catch (error) {
        console.error(error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === "admin") {
      fetchOverview();
    } else {
      setLoading(false);
    }
  }, [authConfig, user?.role]);

  if (user?.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="page-hero-card">
            <span className="page-kicker mb-3">Admin Intelligence</span>
            <h2 className="mb-2">Admin Analytics</h2>
            <p className="text-muted mb-0">This page is available for admins only.</p>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="surface-panel">
            <p className="text-muted mb-0">Loading analytics...</p>
          </div>
        </div>
      </>
    );
  }

  const summary = data?.summary || {};
  const bookingRows = [
    ["Pending", summary.bookings?.pending || 0, "warning"],
    ["Confirmed", summary.bookings?.confirmed || 0, "success"],
    ["Completed", summary.bookings?.completed || 0, "info"],
    ["Cancelled", summary.bookings?.cancelled || 0, "danger"],
  ];
  const reminderRows = [
    ["Overdue", summary.reminders?.overdue || 0, "danger"],
    ["Due soon", summary.reminders?.dueSoon || 0, "warning"],
    ["Scheduled", summary.reminders?.scheduled || 0, "info"],
    ["Completed", summary.reminders?.completed || 0, "success"],
  ];

  return (
    <>
      <Navbar />
      <div className="container py-4 py-lg-5 page-shell">
        <div className="page-hero-card mb-4 dashboard-hero">
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-a" />
          <div className="hero-orb hero-orb-b" />
          <div className="position-relative">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-end">
              <div>
                <span className="page-kicker mb-3">Admin Intelligence</span>
                <h2 className="mb-2">Admin Analytics</h2>
                <p className="text-muted mb-0">
                  A sharper command view across bookings, revenue, reminders, adoptions, and service supply.
                </p>
              </div>
              <div className="booking-meta-stack">
                <span className="booking-meta-chip">{summary.bookings?.total || 0} bookings</span>
                <span className="booking-meta-chip">{summary.users?.total || 0} users</span>
                <span className="booking-meta-chip">{formatCurrency(summary.bookings?.revenue || 0)} revenue</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <StatCard
            title="Total Users"
            value={summary.users?.total || 0}
            subtext={`${summary.users?.provider || 0} providers`}
            toneClass="metric-info"
            delay={0}
          />
          <StatCard
            title="Pets"
            value={summary.pets?.total || 0}
            subtext="Registered pets"
            toneClass="metric-success"
            delay={1}
          />
          <StatCard
            title="Bookings"
            value={summary.bookings?.total || 0}
            subtext={`${summary.bookings?.paid || 0} paid`}
            toneClass="metric-warning"
            delay={2}
          />
          <StatCard
            title="Revenue"
            value={formatCurrency(summary.bookings?.revenue || 0)}
            subtext={`${summary.bookings?.paidBookings || 0} paid bookings`}
            toneClass="metric-danger"
            delay={3}
          />
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 0 }}>
              <h4 className="mb-3">Booking Status</h4>
              {bookingRows.map(([label, count, tone]) => (
                <div key={label} className="mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>{label}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="dashboard-progress-shell rounded-pill">
                    <div
                      className={`dashboard-progress-bar h-100 bg-${tone}`}
                      style={{ width: `${Math.min(100, count * 10 || 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-lg-6">
            <div className="surface-panel h-100">
              <h4 className="mb-3">Reminder Health</h4>
              <div className="row g-3">
                {reminderRows.map(([label, count, tone]) => (
                  <div key={label} className="col-sm-6">
                    <div className="service-market-card h-100 stagger-item-fast" style={{ "--stagger": 1 }}>
                      <p className="text-muted mb-1">{label}</p>
                      <h4 className="mb-2">{count}</h4>
                      <span className={`status-pill status-pill-${tone}`}>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4 mb-4">
          <div className="col-lg-6">
            <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 1 }}>
              <h4 className="mb-3">Service Footprint</h4>
              <div className="row g-3">
                {[
                  ["PetXHub", summary.services?.petxhub || 0],
                  ["Partner", summary.services?.partner || 0],
                  ["In-store", summary.services?.inStore || 0],
                  ["Partner location", summary.services?.partnerLocation || 0],
                  ["At-home", summary.services?.atHome || 0],
                  ["Online", summary.services?.online || 0],
                ].map(([label, count]) => (
                  <div key={label} className="col-sm-6">
                    <div className="booking-summary-panel h-100 stagger-item-fast" style={{ "--stagger": 2 }}>
                      <p className="text-muted mb-1">{label}</p>
                      <h5 className="mb-0">{count}</h5>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 2 }}>
              <h4 className="mb-3">Adoption Funnel</h4>
              <div className="row g-3">
                {[
                  ["Total", summary.adoptions?.total || 0, "neutral"],
                  ["Pending", summary.adoptions?.pending || 0, "warning"],
                  ["Approved", summary.adoptions?.approved || 0, "success"],
                  ["Rejected", summary.adoptions?.rejected || 0, "danger"],
                ].map(([label, count, tone]) => (
                  <div key={label} className="col-sm-6">
                    <div className="service-market-card h-100 stagger-item-fast" style={{ "--stagger": 3 }}>
                      <p className="text-muted mb-1">{label}</p>
                      <h5 className="mb-2">{count}</h5>
                      <span className={`status-pill status-pill-${tone}`}>{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 3 }}>
              <h4 className="mb-3">Recent Bookings</h4>
              {data?.recentBookings?.length ? (
                <div className="d-flex flex-column gap-3">
                  {data.recentBookings.map((booking) => (
                    <div key={booking._id} className="record-card stagger-item-fast" style={{ "--stagger": 0 }}>
                      <div className="d-flex justify-content-between gap-2 align-items-start">
                        <div>
                          <h6 className="mb-1">{booking.pet?.name || "Pet"}</h6>
                          <p className="text-muted mb-1">{booking.bookingCategory}</p>
                          <small className="text-muted">
                            {new Date(booking.bookingDate).toDateString()}
                          </small>
                        </div>
                        <span className={`status-pill status-pill-${booking.status === "cancelled" ? "danger" : "warning"}`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">No recent bookings.</p>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 4 }}>
              <h4 className="mb-3">Recent Adoptions</h4>
              {data?.recentAdoptions?.length ? (
                <div className="d-flex flex-column gap-3">
                  {data.recentAdoptions.map((request) => (
                    <div key={request._id} className="record-card stagger-item-fast" style={{ "--stagger": 1 }}>
                      <div className="d-flex justify-content-between gap-2 align-items-start">
                        <div>
                          <h6 className="mb-1">{request.pet?.name || "Pet"}</h6>
                          <p className="text-muted mb-1">by {request.requester?.name || "Requester"}</p>
                        </div>
                        <span className={`status-pill status-pill-${request.status === "approved" ? "success" : request.status === "rejected" ? "danger" : "warning"}`}>
                          {request.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">No recent adoptions.</p>
              )}
            </div>
          </div>

          <div className="col-lg-4">
            <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 5 }}>
              <h4 className="mb-3">Recent Services</h4>
              {data?.recentServices?.length ? (
                <div className="d-flex flex-column gap-3">
                  {data.recentServices.map((service) => (
                    <div key={service._id} className="record-card stagger-item-fast" style={{ "--stagger": 2 }}>
                      <h6 className="mb-1">{service.name}</h6>
                      <p className="text-muted mb-1">{service.provider?.name || "Provider"}</p>
                      <div className="booking-meta-stack">
                        <span className="booking-meta-chip">{formatCurrency(service.price)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted mb-0">No services yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminAnalytics;
