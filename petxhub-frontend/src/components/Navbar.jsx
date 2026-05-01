import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import notificationBellIcon from "../assets/notification-bell.png";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Navbar() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role || "user";
  const token = localStorage.getItem("token");
  const isAuthenticated = Boolean(token);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreMenuRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!token) {
        setUnreadCount(0);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/notifications/unread-count`, authConfig);
        setUnreadCount(res.data.unreadCount || 0);
      } catch (error) {
        if (error.response?.status === 401) {
          // Token is invalid/expired; clear auth to avoid repeated unauthorized polling.
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUnreadCount(0);
          return;
        }
        console.error("Unable to load notification count", error);
      }
    };

    fetchUnreadCount();

    const intervalId = window.setInterval(fetchUnreadCount, 15000);
    window.addEventListener("focus", fetchUnreadCount);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", fetchUnreadCount);
    };
  }, [authConfig, token]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const primaryNavItems =
    isAuthenticated && role === "admin"
      ? [
          { to: "/admin-dashboard", label: "Dashboard" },
          { to: "/admin-users", label: "Users" },
          { to: "/admin-analytics", label: "Analytics" },
          { to: "/admin-contact-messages", label: "Contact Inbox" },
          { to: "/booking-settings", label: "Settings" },
        ]
      : isAuthenticated
      ? [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/pets", label: "My Pets" },
          { to: "/services", label: "Services" },
          { to: "/my-bookings", label: "Bookings" },
        ]
      : [
          { to: "/dashboard", label: "Dashboard" },
          { to: "/services", label: "Services" },
          { to: "/vet-booking", label: "Vet" },
        ];

  const moreNavItems =
    isAuthenticated && role === "admin"
      ? [
          { to: "/manage-bookings", label: "Manage Bookings" },
        ]
      : [
          ...(isAuthenticated
            ? [{ to: "/vet-booking", label: "Vet Booking" }]
            : [
                { to: "/pets", label: "My Pets" },
                { to: "/my-bookings", label: "Bookings" },
              ]),
          { to: "/health-records", label: "Health Records" },
          { to: "/ai-pet-assistant", label: "AI Assistant" },
          { to: "/adoptions", label: "Adoption" },
          { to: "/adoption-requests", label: "Adoption Requests" },
          ...(isAuthenticated ? [{ to: "/profile", label: "Manage Profile" }] : []),
          ...(role === "provider" ? [{ to: "/manage-bookings", label: "Manage Bookings" }] : []),
          ...(role === "provider" ? [{ to: "/provider-workspace", label: "Workspace" }] : []),
          { to: "/about-us", label: "About Us" },
          { to: "/contact-us", label: "Contact Us" },
        ];

  const userInitial = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const isPathActive = (path) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);
  const isDashboardActive =
    location.pathname === "/" ||
    isPathActive("/dashboard") ||
    isPathActive("/admin-dashboard");
  const isMoreItemActive = moreNavItems.some((item) => isPathActive(item.to));

  return (
    <nav className="petx-nav">
      <div className="container-fluid px-3 px-lg-4">
        <div className="petx-nav-shell">
          <div className="petx-brand-block">
            <Link to="/dashboard" className="petx-brand">
              {/* <span className="petx-brand-mark">P</span> */}
              <span>
                <strong>PetXHub</strong>
                <small>Your pet care OS</small>
              </span>
            </Link>
            {isAuthenticated && user?.role ? <span className="petx-role-chip text-capitalize">{user.role}</span> : null}
          </div>

          <div className="petx-nav-links">
            {primaryNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `petx-nav-link ${
                    item.to === "/dashboard"
                      ? isDashboardActive
                        ? "petx-nav-link-active"
                        : ""
                      : isActive
                      ? "petx-nav-link-active"
                      : ""
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            {isAuthenticated && role === "admin" ? (
              <NavLink
                to="/manage-bookings"
                className={({ isActive }) => `petx-nav-link ${isActive ? "petx-nav-link-active" : ""}`}
              >
                Manage Bookings
              </NavLink>
            ) : (
              <div className="petx-more-menu" ref={moreMenuRef}>
                <button
                  type="button"
                  className={`petx-nav-link petx-more-trigger ${isMoreItemActive ? "petx-more-trigger-active" : ""}`}
                  onClick={() => setIsMoreOpen((current) => !current)}
                  aria-expanded={isMoreOpen}
                >
                  More
                </button>

                {isMoreOpen ? (
                  <div className="petx-more-dropdown">
                    {moreNavItems.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) => `petx-more-item ${isActive ? "petx-more-item-active" : ""}`}
                        onClick={() => setIsMoreOpen(false)}
                      >
                        {item.label}
                      </NavLink>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {isAuthenticated ? (
              <>
                <Link to="/notifications" className="petx-nav-link petx-icon-link petx-notification-link" aria-label="Notifications" title="Notifications">
                  <img src={notificationBellIcon} alt="" className="petx-icon-image" aria-hidden="true" />
                  {unreadCount > 0 ? (
                    <span className="petx-notification-badge">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>

                <Link to="/profile" className="petx-profile-link" aria-label="Profile" title="Profile">
                  <span className="petx-profile-avatar">{userInitial}</span>
                </Link>

                <button className="petx-logout-btn" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="petx-auth-link">
                  Login
                </Link>
                <Link to="/register" className="petx-auth-btn">
                  Signup
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
