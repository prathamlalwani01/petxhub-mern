import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_BASE_URL = "http://localhost:5000/api";

function ProfileSettings() {
  const token = localStorage.getItem("token");
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [preferences, setPreferences] = useState({
    emailAlerts: true,
    browserAlerts: true,
    reminderDigest: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [passwordOtpSent, setPasswordOtpSent] = useState(false);
  const [passwordOtp, setPasswordOtp] = useState("");

  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/users/profile`, authConfig);
        setForm({
          name: res.data.user?.name || "",
          email: res.data.user?.email || "",
          phone: res.data.user?.phone || "",
          password: ""
        });

        const preferenceKey = `profile_preferences_${res.data.user?._id || storedUser?.id || "default"}`;
        const savedPreferences = localStorage.getItem(preferenceKey);

        if (savedPreferences) {
          setPreferences(JSON.parse(savedPreferences));
        }
      } catch (error) {
        alert(error.response?.data?.message || "Unable to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authConfig, storedUser?.id]);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const handlePreferenceToggle = (field) => {
    setPreferences((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const savePreferences = (userId) => {
    localStorage.setItem(`profile_preferences_${userId || "default"}`, JSON.stringify(preferences));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.password && !passwordOtp.trim()) {
      alert("Please enter the password OTP sent to your email");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password || undefined,
        passwordOtp: form.password ? passwordOtp.trim() : undefined
      };

      const res = await axios.put(`${API_BASE_URL}/users/profile`, payload, authConfig);

      localStorage.setItem("user", JSON.stringify(res.data.user));
      savePreferences(res.data.user?.id);
      setForm((currentForm) => ({
        ...currentForm,
        password: ""
      }));
      setPasswordOtp("");
      setPasswordOtpSent(false);

      alert("Profile updated successfully");
    } catch (error) {
      alert(error.response?.data?.message || "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordOtp = async () => {
    try {
      setSendingOtp(true);
      await axios.post(`${API_BASE_URL}/users/profile/password-otp`, {}, authConfig);
      setPasswordOtpSent(true);
      alert("OTP sent to your email");
    } catch (error) {
      alert(error.response?.data?.message || "Unable to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const roleLabel = storedUser?.role || "user";
  const initials = (form.name || storedUser?.name || "P")
    .trim()
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <>
      <Navbar />

      <div className="page-shell">
      <div className="container py-5">
        <div className="page-hero-card mb-4">
          <span className="page-kicker">Identity and preferences</span>
          <h2 className="mb-2">Profile Settings</h2>
          <p className="text-muted mb-0">Keep your account details clean, current, and ready for bookings, reminders, and notifications.</p>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="surface-panel h-100 text-center">
                <div className="profile-avatar mb-3">
                  {initials || "P"}
                </div>
                <h3 className="mb-1">{form.name || storedUser?.name || "Pet Owner"}</h3>
                <p className="text-muted mb-2">{form.email || storedUser?.email || "No email loaded"}</p>
                <span className="petx-role-chip text-capitalize mb-3 d-inline-flex">{roleLabel}</span>

                <div className="text-start border-top pt-3">
                  <p className="mb-1"><strong>Phone:</strong> {form.phone || "Not added yet"}</p>
                  <p className="mb-1"><strong>Email alerts:</strong> {preferences.emailAlerts ? "On" : "Off"}</p>
                  <p className="mb-1"><strong>Browser alerts:</strong> {preferences.browserAlerts ? "On" : "Off"}</p>
                  <p className="mb-0"><strong>Reminder digest:</strong> {preferences.reminderDigest ? "On" : "Off"}</p>
                </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="surface-panel">
                <p className="text-muted mb-4">Update your personal details, contact info, password, and notification preferences.</p>

                {loading ? (
                  <p className="text-muted mb-0">Loading profile...</p>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label">Name</label>
                        <input
                          className="form-control"
                          value={form.name}
                          onChange={(event) => handleChange("name", event.target.value)}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Email</label>
                        <input
                          type="email"
                          className="form-control"
                          value={form.email}
                          onChange={(event) => handleChange("email", event.target.value)}
                          required
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">Phone</label>
                        <input
                          className="form-control"
                          value={form.phone}
                          onChange={(event) => handleChange("phone", event.target.value)}
                        />
                      </div>

                      <div className="col-md-6">
                        <label className="form-label">New Password</label>
                        <input
                          type="password"
                          className="form-control"
                          placeholder="Leave blank to keep your current password"
                          value={form.password}
                          onChange={(event) => handleChange("password", event.target.value)}
                        />
                      </div>
                    </div>

                    {form.password ? (
                      <div className="row g-3 mt-1">
                        <div className="col-md-6">
                          <label className="form-label">Password OTP</label>
                          <input
                            className="form-control"
                            value={passwordOtp}
                            onChange={(event) => setPasswordOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                          />
                        </div>
                        <div className="col-md-6 d-flex align-items-end">
                          <button
                            type="button"
                            className="btn btn-outline-dark w-100"
                            onClick={handleSendPasswordOtp}
                            disabled={sendingOtp}
                          >
                            {sendingOtp ? "Sending OTP..." : passwordOtpSent ? "Resend OTP" : "Send OTP"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <h5 className="mb-3">Notification Preferences</h5>
                      <div className="row g-3">
                        {[
                          ["emailAlerts", "Email alerts"],
                          ["browserAlerts", "Browser alerts"],
                          ["reminderDigest", "Reminder digest"],
                        ].map(([key, label]) => (
                          <div key={key} className="col-md-4">
                            <button
                              type="button"
                              className={`btn w-100 ${preferences[key] ? "btn-outline-success" : "btn-outline-secondary"}`}
                              onClick={() => handlePreferenceToggle(key)}
                            >
                              {label}: {preferences[key] ? "On" : "Off"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="d-flex gap-2 flex-wrap mt-4">
                      <button className="btn btn-primary" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => {
                          setForm({
                            name: storedUser?.name || "",
                            email: storedUser?.email || "",
                            phone: storedUser?.phone || "",
                            password: ""
                          });
                        }}
                      >
                        Reset Form
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

export default ProfileSettings;
