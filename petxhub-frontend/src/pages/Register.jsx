import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE_URL = "http://localhost:5000/api";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");
  const [otp, setOtp] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [step, setStep] = useState("register");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanedPhone = phone.replace(/\D/g, "");

    if (cleanedPhone.length !== 10) {
      alert("Phone number must be exactly 10 digits");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await axios.post(`${API_BASE_URL}/auth/register`, {
        name,
        email,
        password,
        phone: cleanedPhone,
        role,
      });

      setPendingEmail(res.data.user.email);
      setStep("verify");
      alert("Registration successful. Please verify your email with the OTP sent to your inbox.");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);

      await axios.post(`${API_BASE_URL}/auth/verify-email`, {
        email: pendingEmail,
        otp,
      });

      alert("Email verified successfully. You can log in now.");
      navigate("/login");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to verify OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setIsSubmitting(true);

      await axios.post(`${API_BASE_URL}/auth/resend-verification-otp`, {
        email: pendingEmail,
      });

      alert("A new OTP has been sent to your email");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to resend OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="auth-shell auth-shell-with-nav">
        <div className="container">
          <div className="row g-4 align-items-stretch">
          <div className="col-lg-5">
            <div className="auth-brand-panel d-flex flex-column justify-content-between">
              <div className="position-relative">
                {/* <div className="auth-logo mb-4">P</div>
                <span className="page-kicker mb-3 text-white bg-white bg-opacity-10 border border-white border-opacity-10">
                  Join PetXHub
                </span> */}
                <h1 className="display-6 fw-bold mb-3">Create an account that grows with pet care, services, and operations.</h1>
                <p className="text-white-50 mb-0">
                  Start as a pet owner or service provider, then step into a cleaner, modern workspace with reminders, bookings, notifications, and AI support.
                </p>
              </div>

              <div className="d-grid gap-3 mt-4 position-relative">
                <div className="auth-prompt-card">
                  <small className="text-uppercase fw-bold text-white-50">What you unlock</small>
                  <p className="mb-0 mt-2">Adoption flow, care records, payments, receipts, notifications, and smart assistant support for your pets.</p>
                </div>
                <div className="auth-prompt-card">
                  <small className="text-uppercase fw-bold text-white-50">Verification</small>
                  <p className="mb-0 mt-2">We send a one-time OTP to keep account access trusted and prevent bad email setups from causing trouble later.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="auth-panel">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
                <div>
                  <span className="page-kicker mb-3">New Account</span>
                  <h2 className="mb-2">{step === "register" ? "Create Your Account" : "Verify Your Email"}</h2>
                  <p className="text-muted mb-0">
                    {step === "register"
                      ? "Set up your PetXHub identity and choose the role you want to start with."
                      : `Enter the OTP sent to ${pendingEmail} to activate your account.`}
                  </p>
                </div>
                <Link to="/login" className="btn btn-outline-dark btn-sm">
                  Back to Login
                </Link>
              </div>

              {step === "register" ? (
                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Name</label>
                      <input
                        type="text"
                        className="form-control"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Phone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={phone}
                        inputMode="numeric"
                        maxLength={10}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        placeholder="10-digit phone"
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Register As</label>
                      <select
                        className="form-select"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="user">User</option>
                        <option value="provider">Service Provider</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 d-flex gap-2 flex-wrap">
                    <button className="btn btn-dark" disabled={isSubmitting}>
                      {isSubmitting ? "Creating Account..." : "Create Account"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp}>
                  <div className="booking-summary-panel mb-4">
                    <p className="mb-0">
                      Your account is almost ready. Enter the 6-digit OTP sent to <strong>{pendingEmail}</strong>.
                    </p>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email OTP</label>
                    <input
                      type="text"
                      className="form-control"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-dark" disabled={isSubmitting}>
                      {isSubmitting ? "Verifying..." : "Verify Email"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={isSubmitting}
                      onClick={handleResendOtp}
                    >
                      Resend OTP
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Register;
