import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { formatCurrency } from "../utils/bookingPricing";
import { loadRazorpayScript } from "../utils/razorpay";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getTodayDate = () => new Date().toISOString().split("T")[0];
const SOURCE_LABELS = {
  petxhub: "PetXHub",
  partner: "Partner Provider",
};
const MODE_LABELS = {
  "in-store": "PetXHub Store",
  "partner-location": "Partner Location",
  "at-home": "At Home",
  online: "Online",
};

const getServiceAddress = (service) =>
  [service?.locationName, service?.address, service?.city, service?.state].filter(Boolean).join(", ");

function MyBookings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [bookings, setBookings] = useState([]);
  const [activeRescheduleId, setActiveRescheduleId] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState(getTodayDate());
  const [rescheduleSlot, setRescheduleSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [reschedulingBookingId, setReschedulingBookingId] = useState("");
  const [payingBookingId, setPayingBookingId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setBookings(res.data);
      } catch (error) {
        console.error(error);
      }
    };

    fetchBookings();
  }, [token]);

  const getSlotRequestConfig = (booking, date) => {
    if (booking.service) {
      return {
        url: `${API_BASE_URL}/bookings/slots/${booking.service._id}`,
        params: { date },
      };
    }

    return {
      url: `${API_BASE_URL}/bookings/slots`,
      params: {
        date,
        category: booking.bookingCategory,
      },
    };
  };

  const loadSlots = async (booking, date) => {
    try {
      setIsLoadingSlots(true);
      setRescheduleSlot("");

      const requestConfig = getSlotRequestConfig(booking, date);
      const res = await axios.get(requestConfig.url, {
        params: requestConfig.params,
        headers: { Authorization: `Bearer ${token}` },
      });

      const slotsWithCurrentSelection = res.data.slots.map((slot) => {
        const sameDate =
          new Date(booking.bookingDate).toISOString().split("T")[0] === date;

        if (sameDate && slot.value === booking.timeSlot) {
          return { ...slot, isBooked: false };
        }

        return slot;
      });

      setAvailableSlots(slotsWithCurrentSelection);
    } catch (error) {
      console.error(error);
      setAvailableSlots([]);
      alert(error.response?.data?.message || "Unable to fetch slots");
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const handleStartReschedule = async (booking) => {
    const formattedDate = new Date(booking.bookingDate).toISOString().split("T")[0];

    setActiveRescheduleId(booking._id);
    setRescheduleDate(formattedDate);
    setRescheduleSlot(booking.timeSlot);
    await loadSlots(booking, formattedDate);
  };

  const handleCancel = async (id) => {
    try {
      await axios.put(
        `${API_BASE_URL}/bookings/cancel/${id}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Booking cancelled");

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking._id === id ? { ...booking, status: "cancelled" } : booking
        )
      );
    } catch (error) {
      alert(error.response?.data?.message || "Error cancelling booking");
    }
  };

  const handleRescheduleSubmit = async (bookingId) => {
    if (!rescheduleDate || !rescheduleSlot) {
      alert("Please select a new date and time slot");
      return;
    }

    try {
      setReschedulingBookingId(bookingId);

      const res = await axios.patch(
        `${API_BASE_URL}/bookings/${bookingId}/reschedule`,
        {
          bookingDate: rescheduleDate,
          timeSlot: rescheduleSlot,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }
      );

      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking._id === bookingId ? res.data.booking : booking
        )
      );

      setActiveRescheduleId("");
      setAvailableSlots([]);
      setRescheduleSlot("");
      alert("Booking rescheduled successfully");
    } catch (error) {
      console.error(error);
      alert(
        error.code === "ECONNABORTED"
          ? "Reschedule request timed out. Please try again."
          : error.response?.data?.message || "Unable to reschedule booking"
      );
    } finally {
      setReschedulingBookingId("");
    }
  };

  const handlePayNow = async (booking) => {
    try {
      setPayingBookingId(booking._id);

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        alert("Unable to load Razorpay checkout right now");
        return;
      }

      const { data } = await axios.post(
        `${API_BASE_URL}/bookings/${booking._id}/create-payment-order`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let paymentCompleted = false;

      const paymentObject = new window.Razorpay({
        key: data.razorpayKeyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "PetxHub",
        description: "Booking Payment",
        order_id: data.order.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        notes: {
          bookingId: booking._id,
        },
        handler: async (response) => {
          try {
            const verification = await axios.post(
              `${API_BASE_URL}/bookings/verify-payment`,
              {
                bookingId: booking._id,
                ...response,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            setBookings((currentBookings) =>
              currentBookings.map((currentBooking) =>
                currentBooking._id === booking._id ? verification.data.booking : currentBooking
              )
            );
            paymentCompleted = true;
            alert("Payment successful");
          } catch (verificationError) {
            console.error(verificationError);
            alert(verificationError.response?.data?.message || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: async () => {
            if (!paymentCompleted) {
              try {
                const failedPayment = await axios.post(
                  `${API_BASE_URL}/bookings/${booking._id}/payment-failed`,
                  {},
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );

                setBookings((currentBookings) =>
                  currentBookings.map((currentBooking) =>
                    currentBooking._id === booking._id ? failedPayment.data.booking : currentBooking
                  )
                );
              } catch (dismissError) {
                console.error(dismissError);
              }
            }
            setPayingBookingId("");
          },
        },
        theme: {
          color: "#198754",
        },
      });

      paymentObject.on("payment.failed", async () => {
        try {
          const failedPayment = await axios.post(
            `${API_BASE_URL}/bookings/${booking._id}/payment-failed`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          setBookings((currentBookings) =>
            currentBookings.map((currentBooking) =>
              currentBooking._id === booking._id ? failedPayment.data.booking : currentBooking
            )
          );
        } catch (failureError) {
          console.error(failureError);
        }
      });

      paymentObject.open();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to start payment");
    } finally {
      setPayingBookingId("");
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const bookingTitle =
      booking.bookingCategory === "grooming"
        ? booking.groomingPackage
        : booking.appointmentType || booking.service?.name || "";
    const matchesSearch =
      !normalizedSearch ||
      booking.pet?.name?.toLowerCase().includes(normalizedSearch) ||
      bookingTitle?.toLowerCase().includes(normalizedSearch) ||
      booking.service?.provider?.name?.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || booking.bookingCategory === categoryFilter;
    const matchesPayment = paymentFilter === "all" || booking.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesPayment;
  });

  return (
    <>
      <Navbar />

      <div className="page-shell">
        <div className="container py-5">
        <div className="page-hero-card mb-4">
          <span className="page-kicker">Booking timeline</span>
          <h2 className="mb-2">My Bookings</h2>
          <p className="text-muted mb-0">Track paid, pending, upcoming, and rescheduled appointments in one clean view.</p>
        </div>

        <div className="surface-panel mb-4">
          <div className="row g-2">
          <div className="col-lg-5">
            <input
              className="form-control"
              placeholder="Search by pet, service, or provider"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="col-lg-2">
            <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-lg-2">
            <select className="form-select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All types</option>
              <option value="service">Service</option>
              <option value="vet">Vet</option>
              <option value="grooming">Grooming</option>
            </select>
          </div>
          <div className="col-lg-3">
            <select className="form-select" value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)}>
              <option value="all">All payments</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="surface-panel"><p className="mb-0 text-muted">No appointments yet.</p></div>
        ) : (
          filteredBookings.map((booking) => (
            <div key={booking._id} className="booking-card booking-card-modern mb-3">
              <div className="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
                <div>
              <h5>
                {booking.bookingCategory === "grooming"
                  ? `Grooming: ${booking.groomingPackage}`
                  : booking.appointmentType
                    ? `Vet Care: ${booking.appointmentType}`
                    : `Service: ${booking.service?.name || "Service Deleted"}`}
              </h5>
              <p>Pet: {booking.pet?.name || "Pet Deleted"}</p>
              {booking.bookingCategory === "grooming" ? (
                <>
                  <p>Mode: {booking.groomingMode === "at-home" ? "At-Home" : "In-Salon"}</p>
                  <p>Pet Size: {booking.petSize}</p>
                </>
              ) : booking.appointmentType ? (
                <p>Mode: {booking.appointmentMode === "online" ? "Online" : "In-Clinic"}</p>
              ) : (
                <>
                  <p>Provider: {booking.service?.provider?.name || "Provider unavailable"}</p>
                  <p>Delivered By: {SOURCE_LABELS[booking.service?.serviceSource] || "Partner Provider"}</p>
                  <p>Fulfillment: {MODE_LABELS[booking.service?.fulfillmentMode] || booking.service?.fulfillmentMode || "Partner Location"}</p>
                  <p>
                    Location: {booking.service?.fulfillmentMode === "at-home"
                      ? "Provider visits your location"
                      : booking.service?.fulfillmentMode === "online"
                        ? "Online service"
                        : getServiceAddress(booking.service) || "Location will be shared soon"}
                  </p>
                  {booking.service?.mapLink && (
                    <p className="mb-2">
                      <a href={booking.service.mapLink} target="_blank" rel="noreferrer">
                        Open map
                      </a>
                    </p>
                  )}
                </>
              )}
              {booking.concern && <p>Concern: {booking.concern}</p>}
              {booking.notes && <p>Notes: {booking.notes}</p>}
              <p>Date: {new Date(booking.bookingDate).toDateString()}</p>
              <p>Time Slot: {booking.timeSlot}</p>
              <p>
                Status:{" "}
                <span
                  className={`status-pill ${
                    booking.status === "pending"
                      ? "status-pill-warning"
                      : booking.status === "confirmed"
                        ? "status-pill-success"
                        : booking.status === "cancelled"
                          ? "status-pill-danger"
                          : "status-pill-neutral"
                  }`}
                >
                  {booking.status}
                </span>
              </p>
              <p>
                Payment Method:{" "}
                <span className="status-pill status-pill-neutral">
                  {booking.paymentMethod === "pay-later" ? "Pay Later / At Service" : "Online"}
                </span>
              </p>
              <p>
                Payment:{" "}
                <span className={`status-pill ${booking.paymentStatus === "paid" ? "status-pill-success" : booking.paymentStatus === "failed" ? "status-pill-danger" : "status-pill-warning"}`}>
                  {booking.paymentStatus}
                </span>
                {" "}({formatCurrency(booking.amount)})
              </p>
                </div>
                <div className="booking-meta-stack">
                  <span className="booking-meta-chip text-capitalize">{booking.bookingCategory}</span>
                  <span className="booking-meta-chip">{new Date(booking.bookingDate).toDateString()}</span>
                  <span className="booking-meta-chip">{booking.timeSlot}</span>
                </div>
              </div>

              {booking.status !== "cancelled" && booking.status !== "completed" && (
                <div className="d-flex gap-2 flex-wrap mb-3">
                  {booking.paymentStatus === "paid" && (
                    <button
                      type="button"
                      className="btn btn-outline-dark btn-sm"
                      onClick={() => navigate(`/bookings/${booking._id}/receipt`)}
                    >
                      View Receipt
                    </button>
                  )}
                  {booking.paymentStatus !== "paid" && (
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => handlePayNow(booking)}
                      disabled={payingBookingId === booking._id}
                    >
                      {payingBookingId === booking._id ? "Opening Payment..." : booking.paymentMethod === "pay-later" ? "Pay Online Now" : "Pay Now"}
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => handleStartReschedule(booking)}
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleCancel(booking._id)}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {activeRescheduleId === booking._id && (
                <div className="booking-reschedule-panel">
                  <h6 className="mb-3">Reschedule Booking</h6>

                  <label className="form-label">New Date</label>
                  <input
                    className="form-control mb-3"
                    type="date"
                    min={getTodayDate()}
                    value={rescheduleDate}
                    onChange={async (event) => {
                      const newDate = event.target.value;
                      setRescheduleDate(newDate);
                      await loadSlots(booking, newDate);
                    }}
                  />

                  <label className="form-label">Available Time Slots</label>
                  {isLoadingSlots ? (
                    <p className="text-muted">Loading time slots...</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.value}
                          type="button"
                          className={`btn ${
                            rescheduleSlot === slot.value
                              ? "btn-primary"
                              : slot.isBooked
                                ? "btn-outline-secondary"
                                : "btn-outline-primary"
                          }`}
                          disabled={slot.isBooked}
                          onClick={() => setRescheduleSlot(slot.value)}
                        >
                          {slot.value}
                          {slot.isBooked ? " - Booked" : ""}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="d-flex gap-2 flex-wrap">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={reschedulingBookingId === booking._id || !rescheduleSlot}
                      onClick={() => handleRescheduleSubmit(booking._id)}
                    >
                      {reschedulingBookingId === booking._id ? "Saving..." : "Confirm Reschedule"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setActiveRescheduleId("");
                        setAvailableSlots([]);
                        setRescheduleSlot("");
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        </div>
      </div>
    </>
  );
}

export default MyBookings;
