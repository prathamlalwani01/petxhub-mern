import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import {
  DEFAULT_GROOMING_BASE_PRICING,
  DEFAULT_GROOMING_SIZE_SURCHARGE,
  DEFAULT_VET_PRICING,
} from "../utils/bookingPricing";

const API_BASE_URL = "http://localhost:5000/api";

function AdminBookingSettings() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [form, setForm] = useState({
    vetPricing: DEFAULT_VET_PRICING,
    groomingBasePricing: DEFAULT_GROOMING_BASE_PRICING,
    groomingSizeSurcharge: DEFAULT_GROOMING_SIZE_SURCHARGE,
    unpaidBookingHoldMinutes: 15,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("booking_settings_visited", "true");

    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/booking-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setForm({
          vetPricing: { ...DEFAULT_VET_PRICING, ...res.data.settings.vetPricing },
          groomingBasePricing: {
            ...DEFAULT_GROOMING_BASE_PRICING,
            ...res.data.settings.groomingBasePricing,
          },
          groomingSizeSurcharge: {
            ...DEFAULT_GROOMING_SIZE_SURCHARGE,
            ...res.data.settings.groomingSizeSurcharge,
          },
          unpaidBookingHoldMinutes: res.data.settings.unpaidBookingHoldMinutes || 15,
        });
      } catch (error) {
        console.error(error);
        alert(error.response?.data?.message || "Unable to load booking settings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  const handleNestedChange = (section, key, value) => {
    setForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: Number(value),
      },
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();

    try {
      setIsSaving(true);

      await axios.put(`${API_BASE_URL}/booking-settings`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      alert("Booking settings updated successfully");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to update booking settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (user?.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="page-hero-card">
            <span className="page-kicker mb-3">Pricing Control</span>
            <h2 className="mb-2">Booking Settings</h2>
            <p className="text-muted mb-0">This page is available for admins only.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="container py-4 py-lg-5 page-shell">
        <div className="page-hero-card mb-4">
          <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-end">
            <div>
              <span className="page-kicker mb-3">Pricing Control</span>
              <h2 className="mb-2">Booking Settings</h2>
              <p className="text-muted mb-0">
                Configure vet pricing, grooming pricing, and unpaid hold timing from one admin control layer.
              </p>
            </div>
            <div className="booking-meta-stack">
              <span className="booking-meta-chip">admin only</span>
              <span className="booking-meta-chip">{form.unpaidBookingHoldMinutes} min hold</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="surface-panel">
            <p className="text-muted mb-0">Loading booking settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="row g-4">
              <div className="col-lg-4">
                <div className="surface-panel h-100">
                  <h4 className="mb-3">Vet Pricing</h4>
                  {Object.entries(form.vetPricing).map(([key, value]) => (
                    <div key={key} className="mb-3">
                      <label className="form-label text-capitalize fw-semibold">{key}</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={value}
                        onChange={(event) => handleNestedChange("vetPricing", key, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-lg-4">
                <div className="surface-panel h-100">
                  <h4 className="mb-3">Grooming Base Pricing</h4>
                  {Object.entries(form.groomingBasePricing).map(([key, value]) => (
                    <div key={key} className="mb-3">
                      <label className="form-label text-capitalize fw-semibold">{key}</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={value}
                        onChange={(event) => handleNestedChange("groomingBasePricing", key, event.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-lg-4">
                <div className="surface-panel h-100">
                  <h4 className="mb-3">Grooming Size Surcharge</h4>
                  {Object.entries(form.groomingSizeSurcharge).map(([key, value]) => (
                    <div key={key} className="mb-3">
                      <label className="form-label text-capitalize fw-semibold">{key}</label>
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        value={value}
                        onChange={(event) => handleNestedChange("groomingSizeSurcharge", key, event.target.value)}
                      />
                    </div>
                  ))}

                  <div className="booking-summary-panel mt-4">
                    <label className="form-label fw-semibold">Unpaid Hold Minutes</label>
                    <input
                      className="form-control"
                      type="number"
                      min="1"
                      max="120"
                      value={form.unpaidBookingHoldMinutes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          unpaidBookingHoldMinutes: Number(event.target.value),
                        }))
                      }
                    />
                    <small className="text-muted d-block mt-2">
                      Controls how long a payment-pending slot remains reserved before it is released.
                    </small>
                  </div>
                </div>
              </div>
            </div>

            <div className="surface-panel mt-4">
              <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                <div>
                  <h5 className="mb-1">Apply Booking Configuration</h5>
                  <p className="text-muted mb-0">These values update pricing and reservation behavior across the platform.</p>
                </div>
                <button className="btn btn-dark" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Booking Settings"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

export default AdminBookingSettings;
