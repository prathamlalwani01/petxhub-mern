import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import PetRecommendations from "../components/PetRecommendations";
import OnboardingChecklist from "../components/OnboardingChecklist";
import heroBanner1 from "../assets/heroBanner1.jpg";
import heroBanner2 from "../assets/heroBanner2.jpg";
import heroBanner3 from "../assets/heroBanner3.jpg";
import heroBanner4 from "../assets/heroBanner4.jpg";
import heroBanner5 from "../assets/heroBanner5.jpg";
import heroBanner6 from "../assets/heroBanner6.jpg";

const API_BASE_URL = "http://localhost:5000/api";
const HERO_BANNERS = [
  heroBanner1,
  heroBanner2,
  heroBanner3,
  heroBanner4,
  heroBanner5,
  heroBanner6,
];
const DASHBOARD_VISIBLE_SERVICES = [
  "At-Home Basic Care",
  "Vaccination Visit",
  "Spa & Skin Care",
  "Premium Grooming",
];

function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const isAuthenticated = Boolean(token);
  const [reminderData, setReminderData] = useState({
    reminders: [],
    summary: { overdue: 0, dueSoon: 0, scheduled: 0 }
  });
  const [onboardingStats, setOnboardingStats] = useState({
    hasPhone: false,
    petCount: 0,
    myBookingCount: 0,
    manageableBookingCount: 0,
    serviceCount: 0,
    usedAssistant: false,
    visitedSettings: false,
  });
  const [bannerIndex, setBannerIndex] = useState(0);
  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  if (user?.role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (user?.role === "provider") {
    return <Navigate to="/provider-workspace" replace />;
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setReminderData({
        reminders: [],
        summary: { overdue: 0, dueSoon: 0, scheduled: 0 }
      });
      return;
    }

    const fetchReminders = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/health/reminders/all`, authConfig);
        setReminderData(res.data);
      } catch (error) {
        console.error("Failed to fetch dashboard reminders", error);
      }
    };

    fetchReminders();
  }, [authConfig, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOnboardingStats({
        hasPhone: false,
        petCount: 0,
        myBookingCount: 0,
        manageableBookingCount: 0,
        serviceCount: 0,
        usedAssistant: false,
        visitedSettings: false,
      });
      return;
    }

    const fetchOnboardingStats = async () => {
      try {
        const requests = [
          axios.get(`${API_BASE_URL}/users/profile`, authConfig),
          axios.get(`${API_BASE_URL}/pets`, authConfig),
          axios.get(`${API_BASE_URL}/bookings/my`, authConfig),
        ];

        if (user?.role === "provider" || user?.role === "admin") {
          requests.push(axios.get(`${API_BASE_URL}/bookings/manage`, authConfig));
        } else {
          requests.push(Promise.resolve({ data: [] }));
        }

        if (user?.role === "provider") {
          requests.push(axios.get(`${API_BASE_URL}/services/my-services`, authConfig));
        } else {
          requests.push(Promise.resolve({ data: [] }));
        }

        const [profileRes, petsRes, myBookingsRes, manageableRes, servicesRes] = await Promise.all(requests);

        setOnboardingStats({
          hasPhone: Boolean(profileRes.data?.user?.phone),
          petCount: petsRes.data?.pets?.length || 0,
          myBookingCount: myBookingsRes.data?.length || 0,
          manageableBookingCount: manageableRes.data?.length || 0,
          serviceCount: servicesRes.data?.length || 0,
          usedAssistant: Boolean(localStorage.getItem("ai_assistant_used")),
          visitedSettings: Boolean(localStorage.getItem("booking_settings_visited")),
        });
      } catch (error) {
        console.error("Failed to fetch onboarding stats", error);
      }
    };

    fetchOnboardingStats();
  }, [authConfig, isAuthenticated, user?.role]);

  useEffect(() => {
    if (!HERO_BANNERS.length) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % HERO_BANNERS.length);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   localStorage.removeItem("user");
  //   navigate("/");
  // };

  const handleProtectedNavigation = (path) => {
    navigate(path);
  };

  const quickActions = [
    { title: "Open Services", text: "Browse and book regular pet services.", onClick: () => handleProtectedNavigation("/services"), tone: "primary", label: "Care" },
    { title: "Book Vet Care", text: "Schedule consultations, vaccinations, and diagnostics.", onClick: () => handleProtectedNavigation("/vet-booking"), tone: "dark", label: "Health" },
    { title: "Book Grooming", text: "Plan a bath, spa, or coat care visit.", onClick: () => handleProtectedNavigation("/services"), tone: "success", label: "Routine" },
    { title: "My Bookings", text: "Track appointments, receipts, and payment status.", onClick: () => handleProtectedNavigation("/my-bookings"), tone: "outline-primary", label: "Tracking" },
    { title: "Health Records", text: "Manage reminders, notes, and pet health history.", onClick: () => handleProtectedNavigation("/health-records"), tone: "outline-primary", label: "Records" },
    { title: "AI Assistant", text: "Ask pet care questions with context-aware help.", onClick: () => handleProtectedNavigation("/ai-pet-assistant"), tone: "outline-success", label: "Assistant" },
  ];
  // const checklistProgress = Math.min(100, [
  //   onboardingStats.hasPhone,
  //   onboardingStats.petCount > 0,
  //   onboardingStats.myBookingCount > 0,
  //   onboardingStats.usedAssistant,
  //   onboardingStats.visitedSettings
  // ].filter(Boolean).length * 20);

  return (
    <>
      <Navbar />

      <div className="dashboard-page">
        <div className="dashboard-hero">
          <div className="hero-orb hero-orb-a" />
          <div className="hero-orb hero-orb-b" />
          <div className="hero-grid" />
          <div className="container py-5 position-relative">
            <div className="petx-hero-carousel mb-4">
              <img
                src={HERO_BANNERS[bannerIndex]}
                alt={`PetXHub banner ${bannerIndex + 1}`}
                className="petx-hero-carousel-image"
              />
            </div>

            <div className="row align-items-center g-4">
              <div className="col-lg-7">
                <span className="dashboard-kicker">PetXHub control center</span>
                <h1 className="display-5 fw-bold mt-3 mb-3">
                  Hello, {isAuthenticated ? user?.name || "Pet Owner" : "Pet Owner"}
                </h1>
                <p className="lead text-muted mb-4">
                  {isAuthenticated
                    ? "Manage pets, bookings, reminders, adoption requests, and platform activity from one calm, modern workspace."
                    : "Explore PetXHub first. Sign in when you are ready to unlock bookings, reminders, adoptions, and full workspace access."}
                </p>
                <p className="hero-date mb-4">{todayLabel}</p>
                <div className="d-flex gap-2 flex-wrap">
                  {isAuthenticated ? (
                    <>
                      <button className="btn btn-dark btn-lg px-4" onClick={() => navigate("/my-bookings")}>
                        View Bookings
                      </button>
                      <button className="btn btn-outline-light btn-lg px-4 text-dark border-dark" onClick={() => navigate("/health-records")}>
                        Open Health Records
                      </button>
                      <button className="btn btn-success btn-lg px-4" onClick={() => navigate("/ai-pet-assistant")}>
                        Ask AI Assistant
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-dark btn-lg px-4" onClick={() => navigate("/login")}>
                        Login
                      </button>
                      <button className="btn btn-outline-light btn-lg px-4 text-dark border-dark" onClick={() => navigate("/register")}>
                        Signup
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="col-lg-5">
                <div className="glass-panel p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <p className="text-uppercase text-muted small mb-1">Today&apos;s focus</p>
                      <h4 className="mb-0">Care and bookings</h4>
                    </div>
                    <span className="badge rounded-pill text-bg-light text-dark">{user?.role || "user"}</span>
                  </div>
                  <div className="row g-3">
                    <div className="col-4">
                      <div className="mini-stat">
                        <span>Overdue</span>
                        <strong>{reminderData.summary?.overdue || 0}</strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="mini-stat">
                        <span>Due soon</span>
                        <strong>{reminderData.summary?.dueSoon || 0}</strong>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="mini-stat">
                        <span>Scheduled</span>
                        <strong>{reminderData.summary?.scheduled || 0}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 rounded-4 bg-white shadow-sm">
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Pets registered</span>
                      <strong>{onboardingStats.petCount}</strong>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <span className="text-muted">Bookings</span>
                      <strong>{onboardingStats.myBookingCount}</strong>
                    </div>
                    {/* <div className="d-flex justify-content-between">
                      <span className="text-muted">Checklist progress</span>
                      <strong>{checklistProgress}%</strong>
                    </div> */}
                    {/* <div className="progress mt-2 dashboard-progress-shell">
                      <div className="progress-bar dashboard-progress-bar" style={{ width: `${checklistProgress}%` }} />
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
            <div className="section-card mb-5">
              <PetRecommendations visibleServiceNames={DASHBOARD_VISIBLE_SERVICES} />
            </div>
          ) : null}

        <div className="container mt-4">
          <div className="section-card">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
              <div>
                <h3 className="mb-1">Care reminders</h3>
                <p className="text-muted mb-0">Stay ahead of vaccinations, follow-ups, and routine care dates across all pets.</p>
              </div>
              <button className="btn btn-outline-primary align-self-start" onClick={() => handleProtectedNavigation("/health-records")}>
                Manage Reminders
              </button>
            </div>

            <div className="row g-3">
              <div className="col-md-4">
                <div className="modern-metric metric-danger stagger-item-fast" style={{ "--stagger": 0 }}>
                  <p className="mb-1">Overdue</p>
                  <h3 className="mb-0">{reminderData.summary?.overdue || 0}</h3>
                </div>
              </div>
              <div className="col-md-4">
                <div className="modern-metric metric-warning stagger-item-fast" style={{ "--stagger": 1 }}>
                  <p className="mb-1">Due in 7 days</p>
                  <h3 className="mb-0">{reminderData.summary?.dueSoon || 0}</h3>
                </div>
              </div>
              <div className="col-md-4">
                <div className="modern-metric metric-info stagger-item-fast" style={{ "--stagger": 2 }}>
                  <p className="mb-1">Scheduled later</p>
                  <h3 className="mb-0">{reminderData.summary?.scheduled || 0}</h3>
                </div>
              </div>
            </div>

            {reminderData.reminders?.length ? (
              <div className="mt-4">
                {reminderData.reminders.slice(0, 3).map((reminder) => (
                  <div key={reminder._id} className="reminder-row stagger-item-fast" style={{ "--stagger": 3 }}>
                    <div>
                      <h6 className="mb-1">{reminder.title}</h6>
                      <p className="text-muted mb-0">
                        {reminder.petName} - {new Date(reminder.reminderDate).toDateString()}
                      </p>
                    </div>
                    <span className={`badge rounded-pill ${reminder.reminderStatus === "overdue" ? "bg-danger" : reminder.reminderStatus === "due-soon" ? "bg-warning text-dark" : "bg-info text-dark"}`}>
                      {reminder.reminderStatus === "overdue"
                        ? "Overdue"
                        : reminder.reminderStatus === "due-soon"
                          ? "Due soon"
                          : "Scheduled"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted mb-0 mt-4">
                {isAuthenticated
                  ? "No active reminders yet. Add one from Health Records."
                  : "Sign in to add pet reminders, vaccination schedules, and care follow-ups."}
              </p>
            )}
          </div>

          {/* {isAuthenticated ? (
            <div className="section-card mb-5">
              <PetRecommendations visibleServiceNames={DASHBOARD_VISIBLE_SERVICES} />
            </div>
          ) : null} */}

          <div className="section-card mb-4">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
              <div>
                <h3 className="mb-1">Today&apos;s Action Plan</h3>
                <p className="text-muted mb-0">A quick view of what needs your attention right now.</p>
              </div>
              <span className="booking-meta-chip">{todayLabel}</span>
            </div>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Priority Alerts</p>
                  <h4 className="mb-1">{reminderData.summary?.overdue || 0}</h4>
                  <small className="text-muted">Overdue reminders to resolve first</small>
                </div>
              </div>
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Upcoming This Week</p>
                  <h4 className="mb-1">{reminderData.summary?.dueSoon || 0}</h4>
                  <small className="text-muted">Due-soon care items to schedule</small>
                </div>
              </div>
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">My Booking Load</p>
                  <h4 className="mb-1">{onboardingStats.myBookingCount || 0}</h4>
                  <small className="text-muted">Total bookings you can track now</small>
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap mt-4">
              {quickActions.slice(0, 4).map((action) => (
                <button
                  key={action.title}
                  className={`btn btn-${action.tone}`}
                  onClick={action.onClick}
                >
                  {action.title}
                </button>
              ))}
            </div>
          </div>

          {isAuthenticated ? <OnboardingChecklist role={user?.role || "user"} stats={onboardingStats} /> : null}

          {/* <div className="section-card mb-4">
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="info-tile stagger-item" style={{ "--stagger": 0 }}>
                  <h5 className="mb-2">Services</h5>
                  <p className="text-muted mb-3">Browse regular pet services and make bookings.</p>
                  <button className="btn btn-primary" onClick={() => handleProtectedNavigation("/services")}>Open Services</button>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="info-tile stagger-item" style={{ "--stagger": 1 }}>
                  <h5 className="mb-2">Vet Booking</h5>
                  <p className="text-muted mb-3">Book consultations, vaccinations, diagnostics, and urgent care.</p>
                  <button className="btn btn-primary" onClick={() => handleProtectedNavigation("/vet-booking")}>Book Vet Care</button>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="info-tile stagger-item" style={{ "--stagger": 2 }}>
                  <h5 className="mb-2">Grooming</h5>
                  <p className="text-muted mb-3">Schedule grooming, bath, spa, and coat care appointments.</p>
                  <button className="btn btn-success" onClick={() => handleProtectedNavigation("/grooming")}>Book Grooming</button>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="info-tile stagger-item" style={{ "--stagger": 3 }}>
                  <h5 className="mb-2">My Bookings</h5>
                  <p className="text-muted mb-3">Track upcoming appointments and cancel if plans change.</p>
                  <button className="btn btn-outline-primary" onClick={() => handleProtectedNavigation("/my-bookings")}>View Bookings</button>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="info-tile stagger-item" style={{ "--stagger": 4 }}>
                  <h5 className="mb-2">Health Records</h5>
                  <p className="text-muted mb-3">Store vaccination notes, medications, and visit history.</p>
                  <button className="btn btn-outline-primary" onClick={() => handleProtectedNavigation("/health-records")}>Open Records</button>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="info-tile stagger-item" style={{ "--stagger": 5 }}>
                  <h5 className="mb-2">AI Pet Assistant</h5>
                  <p className="text-muted mb-3">Ask pet care questions with context from your pet profiles, records, and bookings.</p>
                  <button className="btn btn-outline-success" onClick={() => handleProtectedNavigation("/ai-pet-assistant")}>Open Assistant</button>
                </div>
              </div>

              {isAuthenticated && (user?.role === "provider" || user?.role === "admin") && (
                <div className="col-lg-4">
                  <div className="info-tile stagger-item" style={{ "--stagger": 6 }}>
                    <h5 className="mb-2">Manage Bookings</h5>
                    <p className="text-muted mb-3">Confirm, complete, and manage bookings assigned to your role.</p>
                    <button className="btn btn-dark" onClick={() => navigate("/manage-bookings")}>Open Manager</button>
                  </div>
                </div>
              )}

              {isAuthenticated && (user?.role === "provider" || user?.role === "admin") && (
                <div className="col-lg-4">
                  <div className="info-tile stagger-item" style={{ "--stagger": 7 }}>
                    <h5 className="mb-2">Provider Workspace</h5>
                    <p className="text-muted mb-3">Create, update, and manage your own services with booking oversight.</p>
                    <button className="btn btn-outline-dark" onClick={() => navigate("/provider-workspace")}>Open Workspace</button>
                  </div>
                </div>
              )}

              {isAuthenticated && user?.role === "admin" && (
                <div className="col-lg-4">
                  <div className="info-tile stagger-item" style={{ "--stagger": 8 }}>
                    <h5 className="mb-2">Booking Settings</h5>
                    <p className="text-muted mb-3">Control vet pricing, grooming pricing, and unpaid payment hold timing.</p>
                    <button className="btn btn-outline-dark" onClick={() => navigate("/booking-settings")}>Open Settings</button>
                  </div>
                </div>
              )}

              {isAuthenticated && user?.role === "admin" && (
                <div className="col-lg-4">
                  <div className="info-tile stagger-item" style={{ "--stagger": 9 }}>
                    <h5 className="mb-2">Analytics</h5>
                    <p className="text-muted mb-3">Track bookings, revenue, reminders, and adoption activity.</p>
                    <button className="btn btn-outline-primary" onClick={() => navigate("/admin-analytics")}>Open Analytics</button>
                  </div>
                </div>
              )}
            </div>
          </div> */}

          {/* {isAuthenticated ? (
            <div className="section-card mb-5">
              <PetRecommendations />
            </div>
          ) : null} */}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
