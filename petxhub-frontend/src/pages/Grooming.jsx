import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import {
  DEFAULT_GROOMING_BASE_PRICING,
  DEFAULT_GROOMING_SIZE_SURCHARGE,
  formatCurrency,
} from "../utils/bookingPricing";
import { loadRazorpayScript } from "../utils/razorpay";

const API_BASE_URL = "http://localhost:5000/api";

const GROOMING_PACKAGES = [
  {
    id: "haircut-styling",
    title: "Haircut & Styling",
    description: "Breed-specific haircut, coat shaping, face trim, and neat finishing for a polished look.",
    duration: "75 mins",
  },
  {
    id: "paw-nail-care",
    title: "Paw & Nail Care",
    description: "Nail trimming, paw pad cleanup, paw balm care, and hygiene checks for comfortable movement.",
    duration: "30 mins",
  },
  {
    id: "ear-eye-cleaning",
    title: "Ear & Eye Cleaning",
    description: "Gentle ear and eye area cleaning to reduce buildup, irritation, and hygiene-related discomfort.",
    duration: "25 mins",
  },
  {
    id: "bath-blow-dry",
    title: "Bath & Blow-Dry",
    description: "Deep cleansing bath, coat conditioning, blow-dry, and brushing for a fresh and fluffy finish.",
    duration: "45 mins",
  },
  {
    id: "bath-brush",
    title: "Bath & Brush",
    description: "Shampoo bath, coat brushing, ear cleaning, and basic hygiene refresh.",
    duration: "45 mins",
  },
  {
    id: "full-grooming",
    title: "Full Grooming",
    description: "Bath, haircut, nail trim, ear cleaning, coat finishing, and sanitary care.",
    duration: "90 mins",
  },
  {
    id: "tick-treatment",
    title: "Tick & Flea Treatment",
    description: "Coat treatment, cleansing wash, and skin-focused grooming support.",
    duration: "60 mins",
  },
  {
    id: "spa-skin",
    title: "Spa & Skin Care",
    description: "De-shedding, coat nourishment, paw care, and skin comfort treatment.",
    duration: "75 mins",
  },
];

const getTodayDate = () => new Date().toISOString().split("T")[0];

function Grooming() {
  const token = localStorage.getItem("token");
  const isAuthenticated = Boolean(token);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedPackage, setSelectedPackage] = useState(GROOMING_PACKAGES[0].id);
  const [petSize, setPetSize] = useState("small");
  const [groomingMode, setGroomingMode] = useState("in-salon");
  const [notes, setNotes] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [groomingBasePricing, setGroomingBasePricing] = useState(DEFAULT_GROOMING_BASE_PRICING);
  const [groomingSizeSurcharge, setGroomingSizeSurcharge] = useState(DEFAULT_GROOMING_SIZE_SURCHARGE);

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
        setGroomingBasePricing({
          ...DEFAULT_GROOMING_BASE_PRICING,
          ...res.data.settings.groomingBasePricing,
        });
        setGroomingSizeSurcharge({
          ...DEFAULT_GROOMING_SIZE_SURCHARGE,
          ...res.data.settings.groomingSizeSurcharge,
        });
      } catch (error) {
        console.error("Unable to load grooming pricing", error);
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
          params: { category: "grooming" },
          headers: { Authorization: `Bearer ${token}` },
        });

        setSlots(res.data.slots);
      } catch (error) {
        console.error(error);
        setSlots([]);
        alert(error.response?.data?.message || "Unable to fetch grooming slots");
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [isAuthenticated, selectedDate, token]);

  const handleBookGrooming = async () => {
    if (!isAuthenticated) {
      alert("Please login or signup to book grooming appointments.");
      return;
    }

    if (!selectedPet || !selectedDate || !selectedTimeSlot || !selectedPackage || !petSize) {
      alert("Please complete the pet, package, size, date, and time slot");
      return;
    }

    try {
      setIsBooking(true);

      if (paymentMethod === "pay-later") {
        await axios.post(
          `${API_BASE_URL}/bookings`,
          {
            pet: selectedPet,
            bookingCategory: "grooming",
            groomingPackage: selectedPackage,
            groomingMode,
            petSize,
            notes,
            bookingDate: selectedDate,
            timeSlot: selectedTimeSlot,
            paymentMethod: "pay-later",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        alert("Grooming appointment booked successfully with pay later option");
        setNotes("");
        setSelectedTimeSlot("");

        const refreshedSlots = await axios.get(`${API_BASE_URL}/bookings/slots?date=${selectedDate}`, {
          params: { category: "grooming" },
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
          bookingCategory: "grooming",
          groomingPackage: selectedPackage,
          groomingMode,
          petSize,
          notes,
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
        description: `${selectedPackageDetails?.title || "Grooming"} Booking`,
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
            alert("Payment successful and grooming appointment booked");
            setNotes("");
            setSelectedTimeSlot("");

            const refreshedSlots = await axios.get(`${API_BASE_URL}/bookings/slots?date=${selectedDate}`, {
              params: { category: "grooming" },
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
          color: "#198754",
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

  const selectedPackageDetails = GROOMING_PACKAGES.find((item) => item.id === selectedPackage);
  const selectedPetName = pets.find((pet) => pet._id === selectedPet)?.name || "Not selected";

  return (
    <>
      <Navbar />

      <div className="page-shell">
      <div className="container py-5">
        <div className="page-hero-card mb-4">
          <span className="page-kicker">Grooming studio</span>
            <h2 className="mb-2">Pet Grooming Booking</h2>
            <p className="text-muted mb-0">
              Schedule bathing, full grooming, spa care, or treatment sessions with dedicated grooming time slots.
            </p>
        </div>

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="surface-panel h-100">
                <h4 className="mb-3">Choose Grooming Package</h4>

                {GROOMING_PACKAGES.map((item) => {
                  const isActive = item.id === selectedPackage;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`service-market-card petx-option-card w-100 text-start mb-3 ${isActive ? "service-market-card-active service-market-card-success" : ""}`}
                      onClick={() => setSelectedPackage(item.id)}
                    >
                        <div className="petx-card-media petx-card-media-placeholder">
                          <span>{item.title}</span>
                        </div>
                        <div>
                          <h5 className="mb-1">{item.title}</h5>
                          <p className="text-muted mb-2">{item.description}</p>
                          <small className="text-secondary d-block mb-2">Estimated duration: {item.duration}</small>
                          <span className={`badge ${isActive ? "bg-success" : "bg-secondary"}`}>
                            {isActive ? "Selected" : "Choose"}
                          </span>
                        </div>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="surface-panel h-100">
                <h4 className="mb-3">Appointment Details</h4>
                {!isAuthenticated ? (
                  <p className="text-muted mb-3">
                    You can browse grooming packages now. Login or signup to book a slot.
                  </p>
                ) : null}

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

                <label className="form-label">Pet Size</label>
                <select
                  className="form-select mb-3"
                  value={petSize}
                  onChange={(event) => setPetSize(event.target.value)}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="giant">Giant</option>
                </select>

                <label className="form-label">Service Mode</label>
                <select
                  className="form-select mb-3"
                  value={groomingMode}
                  onChange={(event) => setGroomingMode(event.target.value)}
                >
                  <option value="in-salon">In-Salon</option>
                  <option value="at-home">At-Home</option>
                </select>

                <label className="form-label">Preferred Date</label>
                <input
                  className="form-control mb-3"
                  type="date"
                  min={getTodayDate()}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />

                <label className="form-label">Special Instructions</label>
                <textarea
                  className="form-control mb-4"
                  rows="4"
                  placeholder="Mention coat condition, matting, skin sensitivity, or behaviour notes."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
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
                            ? "btn-success"
                            : slot.isBooked
                              ? "btn-outline-secondary"
                              : "btn-outline-success"
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
                  className="form-select mb-4"
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                >
                  <option value="online">Pay Online</option>
                  <option value="pay-later">Pay Later / At Service</option>
                </select>

                <div className="booking-summary-panel">
                  <p className="mb-2"><strong>Package:</strong> {selectedPackageDetails?.title}</p>
                  <p className="mb-2"><strong>Pet:</strong> {selectedPetName}</p>
                  <p className="mb-2"><strong>Size:</strong> {petSize}</p>
                  <p className="mb-2"><strong>Mode:</strong> {groomingMode === "at-home" ? "At-Home" : "In-Salon"}</p>
                  <p className="mb-2"><strong>Date:</strong> {selectedDate}</p>
                  <p className="mb-3"><strong>Time Slot:</strong> {selectedTimeSlot || "Not selected"}</p>
                  <p className="mb-3">
                      <strong>Amount:</strong>{" "}
                      {formatCurrency(
                      (groomingBasePricing[selectedPackage] || 0) + (groomingSizeSurcharge[petSize] || 0)
                    )}
                  </p>
                  <p className="mb-3"><strong>Payment:</strong> {paymentMethod === "online" ? "Pay Online" : "Pay Later / At Service"}</p>

                  <button
                    className="btn btn-success w-100"
                    onClick={handleBookGrooming}
                    disabled={!isAuthenticated || isBooking || !selectedPet || !selectedTimeSlot}
                  >
                    {!isAuthenticated
                      ? "Login to Book"
                      : isBooking
                      ? paymentMethod === "online"
                        ? "Starting Payment..."
                        : "Confirming Booking..."
                      : paymentMethod === "online"
                        ? "Pay & Book Grooming Appointment"
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

export default Grooming;
