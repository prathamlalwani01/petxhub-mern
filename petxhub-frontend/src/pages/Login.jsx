import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const API_BASE_URL = "http://localhost:5000/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const modeTitle =
    mode === "login"
      ? "Welcome Back"
      : mode === "verify"
        ? "Verify Your Email"
        : mode === "forgot"
          ? "Recover Access"
          : "Reset Password";

  const modeDescription =
    mode === "login"
      ? "Sign in to manage bookings, pet care, reminders, and your full PetXHub workspace."
      : mode === "verify"
        ? "Enter the verification OTP to unlock your account and continue safely."
        : mode === "forgot"
          ? "We will send a password reset OTP to your email."
          : "Create a fresh password to get back into your account.";

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (error) {
      console.log(error);

      if (error.response?.data?.code === "EMAIL_NOT_VERIFIED") {
        setMode("verify");
        alert(error.response.data.message);
      } else {
        alert(error.response?.data?.message || "Invalid credentials");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyEmail = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      await axios.post(`${API_BASE_URL}/auth/verify-email`, { email, otp });
      alert("Email verified successfully. Please log in now.");
      setMode("login");
      setOtp("");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to verify email");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerificationOtp = async () => {
    try {
      setIsSubmitting(true);
      await axios.post(`${API_BASE_URL}/auth/resend-verification-otp`, { email });
      alert("Verification OTP sent successfully");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to resend OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
      setMode("reset");
      alert("Password reset OTP sent to your email");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to send password reset OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email,
        otp,
        password: newPassword,
      });
      alert("Password reset successfully. Please log in with your new password.");
      setMode("login");
      setOtp("");
      setNewPassword("");
      setPassword("");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to reset password");
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
                  Pet Care Platform
                </span> */}
                <h1 className="display-6 fw-bold mb-3">PetXHub keeps care, bookings, and pet life in one beautiful place.</h1>
                <p className="text-white-50 mb-0">
                  Multi-role, reminder-aware, payment-ready, and built for pet owners, providers, and admins who need one calm control center.
                </p>
              </div>

              <div className="d-grid gap-3 mt-4 position-relative">
                <div className="auth-prompt-card">
                  <small className="text-uppercase fw-bold text-white-50">Why teams use it</small>
                  <p className="mb-0 mt-2">Bookings, health records, AI help, notifications, receipts, and adoption flow all live together.</p>
                </div>
                <div className="auth-prompt-card">
                  <small className="text-uppercase fw-bold text-white-50">Today&apos;s focus</small>
                  <p className="mb-0 mt-2">Sign in and continue from your dashboard, provider workspace, or admin analytics command view.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="auth-panel">
              <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-4">
                <div>
                  <span className="page-kicker mb-3">Account Access</span>
                  <h2 className="mb-2">{modeTitle}</h2>
                  <p className="text-muted mb-0">{modeDescription}</p>
                </div>
                <Link to="/register" className="btn btn-outline-dark btn-sm">
                  Create Account
                </Link>
              </div>

              {mode === "login" ? (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-dark" disabled={isSubmitting}>
                      {isSubmitting ? "Logging In..." : "Login"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setMode("forgot")}
                    >
                      Forgot Password
                    </button>
                  </div>
                </form>
              ) : null}

              {mode === "verify" ? (
                <form onSubmit={handleVerifyEmail}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
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
                      onClick={handleResendVerificationOtp}
                    >
                      Resend OTP
                    </button>
                    <button type="button" className="btn btn-link" onClick={() => setMode("login")}>
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : null}

              {mode === "forgot" ? (
                <form onSubmit={handleForgotPassword}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-dark" disabled={isSubmitting}>
                      {isSubmitting ? "Sending OTP..." : "Send Reset OTP"}
                    </button>
                    <button type="button" className="btn btn-link" onClick={() => setMode("login")}>
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : null}

              {mode === "reset" ? (
                <form onSubmit={handleResetPassword}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Reset OTP</label>
                    <input
                      type="text"
                      className="form-control"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="d-flex gap-2 flex-wrap">
                    <button className="btn btn-dark" disabled={isSubmitting}>
                      {isSubmitting ? "Resetting..." : "Reset Password"}
                    </button>
                    <button type="button" className="btn btn-link" onClick={() => setMode("login")}>
                      Back to Login
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
