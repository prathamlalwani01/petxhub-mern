import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import { DEFAULT_VET_PRICING, formatCurrency } from "../utils/bookingPricing";
import { loadRazorpayScript } from "../utils/razorpay";

const API_BASE_URL = "http://localhost:5000/api";

const VET_CARE_OPTIONS = [
  {
    id: "consultation",
    title: "General Consultation",
    description: "Routine checkups, appetite concerns, skin issues, and early symptom assessment.",
  },
  {
    id: "vaccination",
    title: "Vaccination",
    description: "Preventive vaccinations and follow-up scheduling for dogs and cats.",
  },
  {
    id: "diagnostics",
    title: "Diagnostics",
    description: "Blood work, pathology, scans, and diagnostic guidance before treatment.",
  },
  {
    id: "surgery",
    title: "Surgery Consultation",
    description: "Pre-surgery reviews, procedure planning, and recovery guidance.",
  },
  {
    id: "emergency",
    title: "Emergency Care",
    description: "Urgent support for breathing trouble, injuries, sudden vomiting, or distress.",
  },
  {
    id: "dental",
    title: "Dental Care",
    description: "Dental inspection, oral discomfort review, and hygiene-related treatment planning.",
  },
];

const getTodayDate = () => new Date().toISOString().split("T")[0];
const OPTION_ICONS = {
  consultation: "🩺",
  vaccination: "💉",
  diagnostics: "📊",
  surgery: "🏥",
  emergency: "🚨",
  dental: "🦷",
};

function VetBooking() {
  const location = useLocation();
  const token = localStorage.getItem("token");
  const isAuthenticated = Boolean(token);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedType, setSelectedType] = useState(VET_CARE_OPTIONS[0].id);
  const [appointmentMode, setAppointmentMode] = useState("in-clinic");
  const [concern, setConcern] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [pricing, setPricing] = useState(DEFAULT_VET_PRICING);

  useEffect(() => {
    if (!location.state) {
      return;
    }

    if (location.state.petId) {
      setSelectedPet(location.state.petId);
    }

    if (location.state.careType) {
      setSelectedType(location.state.careType);
    }

    if (location.state.concern) {
      setConcern(location.state.concern);
    }
  }, [location.state]);

  useEffect(() => {
    if (!isAuthenticated) {
      setPets([]);
      return;
    }

    const fetchPets = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/pets`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setPets(res.data.pets);
      } catch (error) {
        console.error(error);
        if (isAuthenticated) {
          alert("Unable to load pets right now");
        }
      }
    };

    fetchPets();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const fetchPricing = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/booking-settings`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPricing({ ...DEFAULT_VET_PRICING, ...res.data.settings.vetPricing });
      } catch (error) {
        console.error("Unable to load vet pricing", error);
      }
    };

    fetchPricing();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      setSlots([]);
      setSelectedTimeSlot("");
      return;
    }

    const fetchSlots = async () => {
      if (!selectedDate) {
        setSlots([]);
        return;
      }

      try {
        setIsLoadingSlots(true);
        setSelectedTimeSlot("");

        const res = await axios.get(`${API_BASE_URL}/bookings/slots?date=${selectedDate}`, {
          params: { category: "vet" },
          headers: { Authorization: `Bearer ${token}` },
        });

        setSlots(res.data.slots);
      } catch (error) {
        console.error(error);
        setSlots([]);
        alert(error.response?.data?.message || "Unable to fetch time slots");
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [isAuthenticated, selectedDate, token]);

  const handleBookAppointment = async () => {
    if (!isAuthenticated) {
      alert("Please login or signup to book vet appointments.");
      return;
    }

    if (!selectedPet || !selectedDate || !selectedTimeSlot || !selectedType) {
      alert("Please complete the pet, care type, date, and time slot");
      return;
    }

    try {
      setIsBooking(true);

      if (paymentMethod === "pay-later") {
        await axios.post(
          `${API_BASE_URL}/bookings`,
          {
            pet: selectedPet,
            bookingCategory: "vet",
            appointmentType: selectedType,
            appointmentMode,
            concern,
            bookingDate: selectedDate,
            timeSlot: selectedTimeSlot,
            paymentMethod: "pay-later",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        alert("Vet appointment booked successfully with pay later option");
        setConcern("");
        setSelectedTimeSlot("");

        const refreshedSlots = await axios.get(`${API_BASE_URL}/bookings/slots?date=${selectedDate}`, {
          params: { category: "vet" },
          headers: { Authorization: `Bearer ${token}` },
        });

        setSlots(refreshedSlots.data.slots);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {
        alert("Unable to load Razorpay checkout right now");
        return;
      }

      const { data } = await axios.post(
        `${API_BASE_URL}/bookings/create-order`,
        {
          pet: selectedPet,
          bookingCategory: "vet",
          appointmentType: selectedType,
          appointmentMode,
          concern,
          bookingDate: selectedDate,
          timeSlot: selectedTimeSlot,
        },
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
        description: `${selectedOption?.title || "Vet Appointment"} Booking`,
        order_id: data.order.id,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
          contact: user?.phone || "",
        },
        notes: {
          bookingId: data.booking._id,
        },
        handler: async (response) => {
          try {
            await axios.post(
              `${API_BASE_URL}/bookings/verify-payment`,
              {
                bookingId: data.booking._id,
                ...response,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            );

            paymentCompleted = true;
            alert("Payment successful and vet appointment booked");
            setConcern("");
            setSelectedTimeSlot("");

            const refreshedSlots = await axios.get(`${API_BASE_URL}/bookings/slots?date=${selectedDate}`, {
              params: { category: "vet" },
              headers: { Authorization: `Bearer ${token}` },
            });

            setSlots(refreshedSlots.data.slots);
          } catch (verificationError) {
            console.error(verificationError);
            alert(verificationError.response?.data?.message || "Payment verification failed");
          }
        },
        modal: {
          ondismiss: async () => {
            if (!paymentCompleted) {
              try {
                await axios.post(
                  `${API_BASE_URL}/bookings/${data.booking._id}/payment-failed`,
                  {},
                  {
                    headers: { Authorization: `Bearer ${token}` },
                  }
                );
              } catch (dismissError) {
                console.error(dismissError);
              }
            }
            setIsBooking(false);
          },
        },
        theme: {
          color: "#0d6efd",
        },
      });

      paymentObject.on("payment.failed", async () => {
        try {
          await axios.post(
            `${API_BASE_URL}/bookings/${data.booking._id}/payment-failed`,
            {},
            {
              headers: { Authorization: `Bearer ${token}` },
            }
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
      setIsBooking(false);
    }
  };

  const selectedOption = VET_CARE_OPTIONS.find((option) => option.id === selectedType);
  const selectedPetName = pets.find((pet) => pet._id === selectedPet)?.name || "Not selected";

  return (
    <>
      <Navbar />

      <div className="page-shell">
      <div className="container py-5">
        <div className="page-hero-card mb-4">
          <span className="page-kicker">Vet appointments</span>
            <h2 className="mb-2">Vet Care Booking</h2>
            <p className="text-muted mb-0">
              Book consultations, vaccinations, diagnostics, surgery reviews, and urgent care with date-based appointment slots.
            </p>
        </div>

        <div className="surface-panel mb-4">
          <h4 className="mb-3">Care Options</h4>
          <div className="row g-3">
                {VET_CARE_OPTIONS.map((option) => {
                  const isActive = option.id === selectedType;

                  return (
                    <div key={option.id} className="col-md-6">
                      <button
                        type="button"
                        className={`vet-offer-card w-100 ${isActive ? "vet-offer-card-active" : ""}`}
                        onClick={() => setSelectedType(option.id)}
                      >
                        <div className="vet-offer-icon" aria-hidden="true">{OPTION_ICONS[option.id] || "🐾"}</div>
                        <div>
                          <h6 className="mb-1">{option.title}</h6>
                          <p className="mb-2">{option.description}</p>
                          <span className={`badge ${isActive ? "bg-primary" : "bg-secondary"}`}>
                            {isActive ? "Selected" : "Choose"}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
        </div>

        <div className="surface-panel">
          <h4 className="mb-3">Appointment Details</h4>
          {!isAuthenticated ? (
            <p className="text-muted mb-3">
              You can browse care options now. Login or signup to book a slot.
            </p>
          ) : null}

          <div className="row g-4">
            <div className="col-lg-7">
              <label className="form-label">Pet</label>
              <select
                className="form-select mb-3"
                value={selectedPet}
                onChange={(event) => setSelectedPet(event.target.value)}
              >
                <option value="">Choose your pet</option>
                {pets.map((pet) => (
                  <option key={pet._id} value={pet._id}>
                    {pet.name}
                  </option>
                ))}
              </select>

              <label className="form-label">Appointment Mode</label>
              <select
                className="form-select mb-3"
                value={appointmentMode}
                onChange={(event) => setAppointmentMode(event.target.value)}
              >
                <option value="in-clinic">In-Clinic</option>
                <option value="online">Online</option>
              </select>

              <label className="form-label">Preferred Date</label>
              <input
                className="form-control mb-3"
                type="date"
                min={getTodayDate()}
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />

              <label className="form-label">Primary Concern</label>
              <textarea
                className="form-control mb-4"
                rows="4"
                placeholder="Describe symptoms, urgency, or what you want the vet to check."
                value={concern}
                onChange={(event) => setConcern(event.target.value)}
              />

              <h5 className="mb-3">Available Time Slots</h5>

              {isLoadingSlots ? (
                <p className="text-muted">Loading time slots...</p>
              ) : (
                <div className="d-flex flex-wrap gap-2 mb-4">
                  {slots.map((slot) => (
                    <button
                      key={slot.value}
                      type="button"
                      className={`btn ${
                        selectedTimeSlot === slot.value
                          ? "btn-primary"
                          : slot.isBooked
                            ? "btn-outline-secondary"
                            : "btn-outline-primary"
                      }`}
                      disabled={slot.isBooked}
                      onClick={() => setSelectedTimeSlot(slot.value)}
                    >
                      {slot.value}
                      {slot.isBooked ? " - Booked" : ""}
                    </button>
                  ))}
                </div>
              )}

              <label className="form-label">Payment Option</label>
              <select
                className="form-select"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              >
                <option value="online">Pay Online</option>
                <option value="pay-later">Pay Later / At Service</option>
              </select>
            </div>

            <div className="col-lg-5">
              <div className="booking-summary-panel h-100">
                <p className="mb-2"><strong>Care Type:</strong> {selectedOption?.title}</p>
                <p className="mb-2"><strong>Pet:</strong> {selectedPetName}</p>
                <p className="mb-2"><strong>Mode:</strong> {appointmentMode === "in-clinic" ? "In-Clinic" : "Online"}</p>
                <p className="mb-2"><strong>Date:</strong> {selectedDate}</p>
                <p className="mb-3"><strong>Time Slot:</strong> {selectedTimeSlot || "Not selected"}</p>
                <p className="mb-3"><strong>Amount:</strong> {formatCurrency(pricing[selectedType] || pricing.consultation)}</p>
                <p className="mb-3"><strong>Payment:</strong> {paymentMethod === "online" ? "Pay Online" : "Pay Later / At Service"}</p>

                <button
                  className="btn btn-success w-100"
                  onClick={handleBookAppointment}
                  disabled={!isAuthenticated || isBooking || !selectedPet || !selectedTimeSlot}
                >
                  {!isAuthenticated
                    ? "Login to Book"
                    : isBooking
                    ? paymentMethod === "online"
                      ? "Starting Payment..."
                      : "Confirming Booking..."
                    : paymentMethod === "online"
                      ? "Pay & Book Vet Appointment"
                      : "Book with Pay Later"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default VetBooking;
