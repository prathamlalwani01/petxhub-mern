import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const getStatusTone = (status) => {
  switch (status) {
    case "completed":
    case "confirmed":
    case "paid":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
};

function ManageBookings() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/bookings/manage`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBookings(res.data);
      } catch (error) {
        console.error(error);
        alert(error.response?.data?.message || "Unable to load bookings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [token]);

  const handleStatusUpdate = async (bookingId, status) => {
    try {
      setUpdatingId(bookingId);

      const res = await axios.patch(
        `${API_BASE_URL}/bookings/${bookingId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking._id === bookingId ? res.data.booking || { ...booking, status } : booking
        )
      );
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to update status");
    } finally {
      setUpdatingId("");
    }
  };

  const getBookingTitle = (booking) => {
    if (booking.bookingCategory === "grooming") {
      return `Grooming - ${booking.groomingPackage}`;
    }

    if (booking.bookingCategory === "vet") {
      return `Vet Care - ${booking.appointmentType}`;
    }

    return booking.service?.name || "Service Booking";
  };

  const getBookingMeta = (booking) => {
    if (booking.bookingCategory === "grooming") {
      return `Mode: ${booking.groomingMode === "at-home" ? "At-Home" : "In-Salon"} | Size: ${booking.petSize}`;
    }

    if (booking.bookingCategory === "vet") {
      return `Mode: ${booking.appointmentMode === "online" ? "Online" : "In-Clinic"}`;
    }

    return `Provider: ${booking.service?.provider?.name || "Not assigned"}`;
  };

  if (user?.role !== "provider" && user?.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="page-hero-card">
            <span className="page-kicker mb-3">Booking Control</span>
            <h2 className="mb-2">Manage Bookings</h2>
            <p className="text-muted mb-0">
              This page is available for providers and admins only.
            </p>
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
          <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-end">
            <div>
              <span className="page-kicker mb-3">Booking Control</span>
              <h2 className="mb-2">Manage Bookings</h2>
              <p className="text-muted mb-0">
                {user?.role === "admin"
                  ? "Review every platform booking, keep statuses moving, and stay ahead of payment and service operations."
                  : "Handle the bookings assigned to you with a cleaner control surface and faster status updates."}
              </p>
            </div>
            <div className="booking-meta-stack">
              <span className="booking-meta-chip">{bookings.length} active records</span>
              <span className="booking-meta-chip">
                {bookings.filter((booking) => booking.status === "pending").length} pending
              </span>
            </div>
          </div>
        </div>

        <div className="surface-panel">
          {isLoading ? (
            <p className="text-muted mb-0">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="text-muted mb-0">No bookings available to manage yet.</p>
          ) : (
            <div className="d-flex flex-column gap-3">
              {bookings.map((booking) => (
                <div key={booking._id} className="booking-card booking-card-modern">
                  <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                    <div className="flex-grow-1">
                      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                        <h5 className="mb-0">{getBookingTitle(booking)}</h5>
                        <span className={`status-pill status-pill-${getStatusTone(booking.status)}`}>
                          {booking.status}
                        </span>
                        <span className={`status-pill status-pill-${getStatusTone(booking.paymentStatus)}`}>
                          payment: {booking.paymentStatus}
                        </span>
                      </div>
                      <p className="text-muted mb-3">{getBookingMeta(booking)}</p>

                      <div className="row g-2">
                        <div className="col-md-6">
                          <div className="booking-summary-panel h-100">
                            <p className="mb-1"><strong>Customer:</strong> {booking.user?.name || "Unknown user"}</p>
                            <p className="mb-1"><strong>Pet:</strong> {booking.pet?.name || "Unknown pet"}</p>
                            <p className="mb-0"><strong>Date:</strong> {new Date(booking.bookingDate).toDateString()}</p>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="booking-summary-panel h-100">
                            <p className="mb-1"><strong>Time Slot:</strong> {booking.timeSlot}</p>
                            {booking.concern ? <p className="mb-1"><strong>Concern:</strong> {booking.concern}</p> : null}
                            {booking.notes ? <p className="mb-0"><strong>Notes:</strong> {booking.notes}</p> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ minWidth: "240px" }}>
                      <label className="form-label fw-semibold">Update Status</label>
                      <select
                        className="form-select"
                        value={booking.status}
                        disabled={updatingId === booking._id}
                        onChange={(event) => handleStatusUpdate(booking._id, event.target.value)}
                      >
                        {BOOKING_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ManageBookings;
