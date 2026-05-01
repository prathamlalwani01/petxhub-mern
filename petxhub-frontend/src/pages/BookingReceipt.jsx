import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { formatCurrency } from "../utils/bookingPricing";

const API_BASE_URL = "http://localhost:5000/api";

const getLocationText = (booking) => {
  if (booking.bookingCategory === "service") {
    if (booking.service?.fulfillmentMode === "at-home") {
      return "Provider visits your location";
    }

    if (booking.service?.fulfillmentMode === "online") {
      return "Online service";
    }

    return [
      booking.service?.locationName,
      booking.service?.address,
      booking.service?.city,
      booking.service?.state,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (booking.bookingCategory === "vet") {
    return booking.appointmentMode === "online" ? "Online consultation" : "In-clinic appointment";
  }

  if (booking.bookingCategory === "grooming") {
    return booking.groomingMode === "at-home" ? "At-home grooming" : "In-salon grooming";
  }

  return "";
};

function BookingReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [receipt, setReceipt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/bookings/${id}/receipt`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setReceipt(res.data);
      } catch (error) {
        console.error(error);
        alert(error.response?.data?.message || "Unable to load receipt");
        navigate("/my-bookings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceipt();
  }, [id, navigate, token]);

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="surface-panel">
            <p className="text-muted mb-0">Loading receipt...</p>
          </div>
        </div>
      </>
    );
  }

  if (!receipt) {
    return null;
  }

  const { booking, bookingTitle, issuedAt, receiptNumber } = receipt;

  return (
    <>
      <Navbar />

      <div className="container py-4 py-lg-5 page-shell">
        <div className="page-hero-card mb-4">
          <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
            <div>
              <span className="page-kicker mb-3">Payment Proof</span>
              <h2 className="mb-2">Booking Receipt</h2>
              <p className="text-muted mb-0">Receipt #{receiptNumber}</p>
            </div>
            <div className="booking-meta-stack">
              <span className="booking-meta-chip">{formatCurrency(booking.amount)}</span>
              <span className={`status-pill status-pill-${booking.paymentStatus === "paid" ? "success" : "warning"}`}>
                {booking.paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-6">
            <div className="surface-panel h-100">
              <h4 className="mb-3">Payment Details</h4>
              <div className="booking-summary-panel">
                <p className="mb-2"><strong>Amount:</strong> {formatCurrency(booking.amount)}</p>
                <p className="mb-2"><strong>Status:</strong> {booking.paymentStatus}</p>
                <p className="mb-2"><strong>Payment ID:</strong> {booking.paymentId || "Not available"}</p>
                <p className="mb-0"><strong>Issued On:</strong> {new Date(issuedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="surface-panel h-100">
              <h4 className="mb-3">Booking Details</h4>
              <div className="booking-summary-panel">
                <p className="mb-2"><strong>Booking:</strong> {bookingTitle}</p>
                <p className="mb-2"><strong>Pet:</strong> {booking.pet?.name || "Pet"}</p>
                <p className="mb-2"><strong>Date:</strong> {new Date(booking.bookingDate).toDateString()}</p>
                <p className="mb-2"><strong>Time Slot:</strong> {booking.timeSlot}</p>
                <p className="mb-0"><strong>Location:</strong> {getLocationText(booking) || "Not specified"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-panel mt-4">
          <h4 className="mb-3">Provider and Service Info</h4>
          {booking.bookingCategory === "service" ? (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Service</p>
                  <h6 className="mb-0">{booking.service?.name || "Service"}</h6>
                </div>
              </div>
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Provider</p>
                  <h6 className="mb-0">{booking.service?.provider?.name || "Provider unavailable"}</h6>
                </div>
              </div>
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Delivered By</p>
                  <h6 className="mb-0">{booking.service?.serviceSource === "petxhub" ? "PetXHub" : "Partner Provider"}</h6>
                </div>
              </div>
            </div>
          ) : booking.bookingCategory === "vet" ? (
            <div className="row g-3">
              <div className="col-md-6">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Care Type</p>
                  <h6 className="mb-0">{booking.appointmentType}</h6>
                </div>
              </div>
              <div className="col-md-6">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Mode</p>
                  <h6 className="mb-0">{booking.appointmentMode}</h6>
                </div>
              </div>
            </div>
          ) : (
            <div className="row g-3">
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Grooming Package</p>
                  <h6 className="mb-0">{booking.groomingPackage}</h6>
                </div>
              </div>
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Mode</p>
                  <h6 className="mb-0">{booking.groomingMode}</h6>
                </div>
              </div>
              <div className="col-md-4">
                <div className="booking-summary-panel h-100">
                  <p className="text-muted mb-1">Pet Size</p>
                  <h6 className="mb-0">{booking.petSize}</h6>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 d-flex gap-2 flex-wrap">
          <button type="button" className="btn btn-dark" onClick={() => navigate("/my-bookings")}>
            Back to My Bookings
          </button>
        </div>
      </div>
    </>
  );
}

export default BookingReceipt;
