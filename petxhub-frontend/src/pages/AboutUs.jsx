import Navbar from "../components/Navbar";

function AboutUs() {
  return (
    <>
      <Navbar />

      <div className="page-shell">
        <div className="container py-5">
          <div className="page-hero-card mb-4 dashboard-hero position-relative overflow-hidden">
            <div className="hero-grid" />
            <div className="hero-orb hero-orb-a" />
            <div className="hero-orb hero-orb-b" />
            <div className="position-relative">
              <span className="page-kicker">Who we are</span>
              <h2 className="mb-2 mt-2">Built for Better Pet Care</h2>
              <p className="text-muted mb-0">
                PetXHub is a unified platform that helps families, providers, and admins manage pet care
                with clarity, speed, and trust.
              </p>
              <div className="booking-meta-stack mt-3">
                <span className="booking-meta-chip">Health reminders</span>
                <span className="booking-meta-chip">Service bookings</span>
                <span className="booking-meta-chip">Adoption workflow</span>
                <span className="booking-meta-chip">AI assistance</span>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-8">
              <div className="surface-panel h-100">
                <h4 className="mb-3">Our mission</h4>
                <p className="text-muted mb-3">
                  We built PetXHub to reduce missed care events and simplify pet parenting with clear,
                  modern workflows. From reminders and records to bookings and adoption, everything is
                  designed to be reliable, secure, and easy to use.
                </p>
                <p className="text-muted mb-0">
                  Our goal is simple: help families give better, more consistent care to their pets,
                  while giving providers and admins better visibility and control.
                </p>
              </div>
            </div>

            <div className="col-lg-4">
              <div className="surface-panel h-100">
                <h5 className="mb-3">What PetXHub offers</h5>
                <ul className="mb-0 text-muted">
                  <li>Pet profile management</li>
                  <li>Vaccination and care reminders</li>
                  <li>Service and vet booking flows</li>
                  <li>Adoption request workflows</li>
                  <li>In-app and email notifications</li>
                  <li>AI pet care assistance</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="row g-4 mt-1">
            <div className="col-md-4">
              <div className="booking-summary-panel h-100">
                <p className="text-muted mb-1">Care consistency</p>
                <h4 className="mb-1">Reminder-first system</h4>
                <small className="text-muted">Reduce missed vaccination and follow-up dates.</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="booking-summary-panel h-100">
                <p className="text-muted mb-1">Operational speed</p>
                <h4 className="mb-1">Unified booking flow</h4>
                <small className="text-muted">Services, vet care, and tracking from one workspace.</small>
              </div>
            </div>
            <div className="col-md-4">
              <div className="booking-summary-panel h-100">
                <p className="text-muted mb-1">Trust and safety</p>
                <h4 className="mb-1">Secure account flow</h4>
                <small className="text-muted">Role-based access, OTP verification, and notifications.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AboutUs;
