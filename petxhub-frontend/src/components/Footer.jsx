import { Link, useLocation } from "react-router-dom";

function Footer() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const isAdmin = user?.role === "admin";
  const isAuthPage = location.pathname === "/" || location.pathname === "/register";
  const year = new Date().getFullYear();

  return (
    <footer className={`petx-footer ${isAuthPage ? "petx-footer-auth" : ""}`}>
      <div className="container">
        <div className="petx-footer-shell">
          <div className="row g-4 align-items-start">
            <div className="col-lg-5">
              <div className="petx-footer-brand">
                {/* <div className="petx-footer-mark">P</div> */}
                <div>
                  <h5 className="mb-1">PetXHub</h5>
                  <p className="text-muted mb-0">
                    A modern care platform for pets, providers, reminders, bookings, and better day-to-day operations.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-sm-6 col-lg-3">
              <p className="petx-footer-title">Explore</p>
              <div className="petx-footer-links">
                {isAdmin ? (
                  <>
                    <Link to="/admin-dashboard">Dashboard</Link>
                    <Link to="/admin-users">Users</Link>
                    <Link to="/admin-analytics">Analytics</Link>
                    <Link to="/admin-contact-messages">Contact Inbox</Link>
                  </>
                ) : (
                  <>
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/services">Services</Link>
                    <Link to="/vet-booking">Vet Booking</Link>
                    <Link to="/grooming">Grooming</Link>
                  </>
                )}
              </div>
            </div>

            <div className="col-sm-6 col-lg-2">
              <p className="petx-footer-title">Care</p>
              <div className="petx-footer-links">
                {isAdmin ? (
                  <>
                    <Link to="/booking-settings">Booking Settings</Link>
                    <Link to="/manage-bookings">Manage Bookings</Link>
                    <Link to="/adoption-requests">Adoption Requests</Link>
                  </>
                ) : (
                  <>
                    <Link to="/health-records">Health Records</Link>
                    <Link to="/notifications">Notifications</Link>
                    <Link to="/ai-pet-assistant">AI Assistant</Link>
                  </>
                )}
              </div>
            </div>

            <div className="col-lg-2">
              <p className="petx-footer-title">Account</p>
              <div className="petx-footer-links">
                {isAdmin ? (
                  <>
                    <Link to="/profile">Admin Profile</Link>
                    <Link to="/notifications">Notifications</Link>
                    <Link to="/about-us">Platform Info</Link>
                  </>
                ) : (
                  <>
                    <Link to="/profile">Profile</Link>
                    <Link to="/my-bookings">My Bookings</Link>
                    <Link to="/adoptions">Adoptions</Link>
                    <Link to="/about-us">About Us</Link>
                    <Link to="/contact-us">Contact Us</Link>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="petx-footer-bottom">
            <span>PetXHub © {year}</span>
            <span>Designed for calmer pet care and cleaner workflows.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
