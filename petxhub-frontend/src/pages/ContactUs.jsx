import { useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function ContactUs() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitted(false);

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE_URL}/contact`,
        form,
        token
          ? {
              headers: { Authorization: `Bearer ${token}` },
            }
          : undefined
      );

      setSubmitted(true);
      setForm({ name: "", email: "", message: "" });
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Unable to submit message right now.");
    } finally {
      setSubmitting(false);
    }
  };

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
              <span className="page-kicker">Reach out</span>
              <h2 className="mb-2 mt-2">Let&apos;s Solve It Together</h2>
              <p className="text-muted mb-0">
                Share your query, suggestion, or issue. Our support team will review and respond as soon as possible.
              </p>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="surface-panel">
                <h4 className="mb-3">Send a message</h4>
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={form.name}
                      onChange={(event) => handleChange("name", event.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(event) => handleChange("email", event.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Message</label>
                    <textarea
                      className="form-control"
                      rows="5"
                      value={form.message}
                      onChange={(event) => handleChange("message", event.target.value)}
                      required
                    />
                  </div>

                  <button className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>

                {submitted ? <p className="text-success mt-3 mb-0">Thanks. Your message has been submitted.</p> : null}
                {error ? <p className="text-danger mt-3 mb-0">{error}</p> : null}
              </div>
            </div>

            <div className="col-lg-5">
              <div className="surface-panel h-100">
                <h5 className="mb-3">Support details</h5>
                <div className="booking-summary-panel mb-3">
                  <p className="mb-2"><strong>Email:</strong> support@petxhub.com</p>
                  <p className="mb-2"><strong>Phone:</strong> +91 99999 99999</p>
                  <p className="mb-0"><strong>Hours:</strong> Mon - Sat, 9:00 AM to 7:00 PM</p>
                </div>
                <div className="booking-summary-panel">
                  <p className="text-muted mb-2">What happens next?</p>
                  <ul className="mb-0 text-muted">
                    <li>Your message enters the admin inbox instantly.</li>
                    <li>Team marks it as new, in-progress, then resolved.</li>
                    <li>You get updates through platform notifications.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ContactUs;
