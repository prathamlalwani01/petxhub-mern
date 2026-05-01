import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { formatCurrency } from "../utils/bookingPricing";
import { loadRazorpayScript } from "../utils/razorpay";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const getTodayDate = () => new Date().toISOString().split("T")[0];
const ASSET_IMAGE_MODULES = import.meta.glob("../assets/*.{png,jpg,jpeg,webp,avif}", {
  eager: true,
  import: "default",
});

const normalizeText = (value = "") =>
  value.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]/g, "");

const SERVICE_IMAGE_BY_NAME = Object.entries(ASSET_IMAGE_MODULES).reduce((acc, [path, src]) => {
  const fileName = path.split("/").pop() || "";
  const baseName = fileName.replace(/\.(png|jpe?g|webp|avif)$/i, "");
  acc[normalizeText(baseName)] = src;
  return acc;
}, {});
const SERVICE_IMAGE_ALIASES = {
  [normalizeText("Haircut & Styling")]: normalizeText("haircut1"),
  [normalizeText("Paw & Nail Care")]: normalizeText("nailcare"),
};

const getAutoImageForServiceName = (serviceName = "") => {
  const normalizedName = normalizeText(serviceName);
  if (!normalizedName) return "";

  const directOrAliasKey = SERVICE_IMAGE_ALIASES[normalizedName] || normalizedName;

  if (SERVICE_IMAGE_BY_NAME[directOrAliasKey]) {
    return SERVICE_IMAGE_BY_NAME[directOrAliasKey];
  }

  const fuzzyMatchKey = Object.keys(SERVICE_IMAGE_BY_NAME).find(
    (key) => key.includes(normalizedName) || normalizedName.includes(key)
  );

  return fuzzyMatchKey ? SERVICE_IMAGE_BY_NAME[fuzzyMatchKey] : "";
};
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
const SERVICE_DISPLAY_ORDER = [
  "Vaccination Visit",
  "Paw & Nail Care",
  "At-Home Basic Care",
  "Haircut & Styling",
  "Premium Grooming",
  "Bath & Blow-Dry",
  "Spa & Skin Care",
  "Ear & Eye Cleaning",
];
const PUBLIC_SERVICE_PREVIEW = [
  {
    _id: "preview-home-care",
    name: "At-Home Basic Care",
    description: "Home visit for basic pet care, hygiene check, and comfort review.",
    price: 599,
    duration: 60,
    serviceSource: "partner",
    fulfillmentMode: "at-home",
  },
  {
    _id: "preview-haircut-styling",
    name: "Haircut & Styling",
    description: "Breed-specific haircut, coat shaping, face trim, and clean finishing for a polished look.",
    price: 999,
    duration: 75,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
    locationName: "PetXHub Groom Studio",
  },
  {
    _id: "preview-paw-nail-care",
    name: "Paw & Nail Care",
    description: "Nail trimming, paw pad cleanup, and hygiene care for better comfort and walking support.",
    price: 499,
    duration: 30,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
    locationName: "PetXHub Groom Studio",
  },
  {
    _id: "preview-ear-eye-cleaning",
    name: "Ear & Eye Cleaning",
    description: "Gentle ear and eye-area cleaning to reduce buildup, irritation, and hygiene discomfort.",
    price: 449,
    duration: 25,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
    locationName: "PetXHub Groom Studio",
  },
  {
    _id: "preview-grooming",
    name: "Premium Grooming",
    description: "Bath, brushing, coat finishing, and hygiene care for dogs and cats.",
    price: 899,
    duration: 90,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
    locationName: "PetXHub Care Center",
  },
  {
    _id: "preview-vaccination",
    name: "Vaccination Visit",
    description: "Routine vaccination support with date-based slot booking.",
    price: 699,
    duration: 45,
    serviceSource: "partner",
    fulfillmentMode: "partner-location",
    locationName: "Partner Vet Clinic",
  },
  {
    _id: "preview-bath-blow-dry",
    name: "Bath & Blow-Dry",
    description: "Deep cleansing bath, coat conditioning, blow-dry, and brushing for a fresh fluffy finish.",
    price: 799,
    duration: 45,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
    locationName: "PetXHub Groom Studio",
  },
  {
    _id: "preview-spa-skin-care",
    name: "Spa & Skin Care",
    description: "Coat nourishment, de-shedding, skin comfort care, and relaxing spa treatment for healthy fur.",
    price: 1099,
    duration: 75,
    serviceSource: "petxhub",
    fulfillmentMode: "partner-location",
    locationName: "PetXHub Groom Studio",
  },
];

const getServiceAddress = (service) =>
  [service.locationName, service.address].filter(Boolean).join(", ");

function Services() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const isAuthenticated = Boolean(token);

  const [serviceForm, setServiceForm] = useState({
    name: "",
    description: "",
    price: "",
    duration: "",
    serviceSource: "partner",
    fulfillmentMode: "partner-location",
    locationName: "",
    address: "",
    mapLink: "",
    imageUrl: "",
  });
  const [services, setServices] = useState([]);
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online");
  const [serviceSearch, setServiceSearch] = useState("");
  const [serviceSourceFilter, setServiceSourceFilter] = useState("all");
  const [serviceModeFilter, setServiceModeFilter] = useState("all");
  const [serviceSort, setServiceSort] = useState("recommended");
  const requiresPhysicalLocation = ["in-store", "partner-location"].includes(serviceForm.fulfillmentMode);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesRes = await axios.get(
          `${API_BASE_URL}/services`,
          isAuthenticated
            ? { headers: { Authorization: `Bearer ${token}` } }
            : undefined
        );
        const incomingServices = servicesRes.data.services || [];
        const previewByName = new Map(
          PUBLIC_SERVICE_PREVIEW.map((service) => [(service.name || "").trim().toLowerCase(), service])
        );

        const mergedIncoming = incomingServices.map((service) => {
          const nameKey = (service.name || "").trim().toLowerCase();
          const previewMatch = previewByName.get(nameKey);
          const autoImage = getAutoImageForServiceName(service.name);

          if (!previewMatch) {
            return {
              ...service,
              imageUrl: service.imageUrl || autoImage || "",
            };
          }

          return {
            ...service,
            imageUrl: service.imageUrl || previewMatch.imageUrl || autoImage || "",
          };
        });

        if (isAuthenticated) {
          setServices(mergedIncoming);
        } else {
          const existingNames = new Set(
            mergedIncoming.map((service) => (service.name || "").trim().toLowerCase())
          );
          const missingPreviewServices = PUBLIC_SERVICE_PREVIEW
            .filter((service) => !existingNames.has((service.name || "").trim().toLowerCase()))
            .map((service) => ({
              ...service,
              imageUrl: service.imageUrl || getAutoImageForServiceName(service.name) || "",
            }));

          setServices([...mergedIncoming, ...missingPreviewServices]);
        }

        if (!isAuthenticated) {
          setPets([]);
          return;
        }

        const petsRes = await axios.get(`${API_BASE_URL}/pets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPets(petsRes.data.pets || []);
      } catch (error) {
        console.error(error);
        setServices(
          PUBLIC_SERVICE_PREVIEW.map((service) => ({
            ...service,
            imageUrl: service.imageUrl || getAutoImageForServiceName(service.name) || "",
          }))
        );
        if (isAuthenticated) {
          alert("Unable to load services right now");
        }
      }
    };

    fetchData();
  }, [isAuthenticated, token]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAvailableSlots([]);
      setSelectedTimeSlot("");
      return;
    }

    const loadSlots = async () => {
      if (!selectedServiceId || !selectedDate) {
        setAvailableSlots([]);
        setSelectedTimeSlot("");
        return;
      }

      try {
        setIsLoadingSlots(true);
        setSelectedTimeSlot("");

        const res = await axios.get(`${API_BASE_URL}/bookings/slots/${selectedServiceId}`, {
          params: { date: selectedDate },
          headers: { Authorization: `Bearer ${token}` },
        });

        setAvailableSlots(res.data.slots || []);
      } catch (error) {
        console.error(error);
        setAvailableSlots([]);
        alert(error.response?.data?.message || "Unable to load time slots");
      } finally {
        setIsLoadingSlots(false);
      }
    };

    loadSlots();
  }, [isAuthenticated, selectedDate, selectedServiceId, token]);

  const handleCreateService = async (event) => {
    event.preventDefault();

    try {
      const res = await axios.post(`${API_BASE_URL}/services`, serviceForm, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setServices((current) => [...current, res.data.service]);
      setServiceForm({
        name: "",
        description: "",
        price: "",
        duration: "",
        serviceSource: "partner",
        fulfillmentMode: "partner-location",
        locationName: "",
        address: "",
        mapLink: "",
        imageUrl: "",
      });
      alert("Service created successfully");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to create service");
    }
  };

  const handleBookService = async () => {
    if (!isAuthenticated) {
      alert("Please login or signup to book this service.");
      return;
    }

    if (!selectedPet || !selectedServiceId || !selectedDate || !selectedTimeSlot) {
      alert("Please select a pet, service, date, and time slot");
      return;
    }

    try {
      setIsBooking(true);

      if (paymentMethod === "pay-later") {
        await axios.post(
          `${API_BASE_URL}/bookings`,
          {
            pet: selectedPet,
            service: selectedServiceId,
            bookingDate: selectedDate,
            timeSlot: selectedTimeSlot,
            paymentMethod: "pay-later",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        alert("Service booked successfully with pay later option");
        setSelectedTimeSlot("");

        const refreshedSlots = await axios.get(`${API_BASE_URL}/bookings/slots/${selectedServiceId}`, {
          params: { date: selectedDate },
          headers: { Authorization: `Bearer ${token}` },
        });

        setAvailableSlots(refreshedSlots.data.slots || []);
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
          service: selectedServiceId,
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
        description: selectedService?.name || "Service Booking",
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
            alert("Payment successful and service booked");
            setSelectedTimeSlot("");

            const refreshedSlots = await axios.get(`${API_BASE_URL}/bookings/slots/${selectedServiceId}`, {
              params: { date: selectedDate },
              headers: { Authorization: `Bearer ${token}` },
            });

            setAvailableSlots(refreshedSlots.data.slots || []);
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

  const selectedService = services.find((service) => service._id === selectedServiceId);
  const filteredServices = useMemo(() => {
    const normalizedSearch = serviceSearch.trim().toLowerCase();
      const nextServices = services.filter((service) => {
      const matchesSearch =
        !normalizedSearch ||
        service.name?.toLowerCase().includes(normalizedSearch) ||
        service.description?.toLowerCase().includes(normalizedSearch) ||
        service.provider?.name?.toLowerCase().includes(normalizedSearch) ||
        service.locationName?.toLowerCase().includes(normalizedSearch) ||
        service.address?.toLowerCase().includes(normalizedSearch);

      const matchesSource = serviceSourceFilter === "all" || service.serviceSource === serviceSourceFilter;
      const matchesMode = serviceModeFilter === "all" || service.fulfillmentMode === serviceModeFilter;

      return matchesSearch && matchesSource && matchesMode;
    });

    return [...nextServices].sort((a, b) => {
      if (serviceSort === "recommended") {
        const aIndex = SERVICE_DISPLAY_ORDER.findIndex(
          (serviceName) => serviceName.toLowerCase() === (a.name || "").toLowerCase()
        );
        const bIndex = SERVICE_DISPLAY_ORDER.findIndex(
          (serviceName) => serviceName.toLowerCase() === (b.name || "").toLowerCase()
        );

        const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
        const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

        if (aRank !== bRank) {
          return aRank - bRank;
        }
      }

      if (serviceSort === "price-low") return (a.price || 0) - (b.price || 0);
      if (serviceSort === "price-high") return (b.price || 0) - (a.price || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [services, serviceModeFilter, serviceSearch, serviceSort, serviceSourceFilter]);

  return (
    <>
      <Navbar />

      <div className="page-shell">
      <div className="container py-5">
        <div className="page-hero-card mb-4">
          <span className="page-kicker">Service marketplace</span>
          <h2 className="mb-2">Services</h2>
          <p className="text-muted mb-0">
            Browse regular pet services and make a booking with your preferred date and slot.
          </p>
        </div>

        <div className="surface-panel mb-4">
            <div className="row g-2">
              <div className="col-lg-5">
                <input
                  className="form-control"
                  placeholder="Search by name, description, provider, location, or address"
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                />
              </div>
              <div className="col-lg-2">
                <select className="form-select" value={serviceSourceFilter} onChange={(event) => setServiceSourceFilter(event.target.value)}>
                  <option value="all">All sources</option>
                  <option value="petxhub">PetXHub</option>
                  <option value="partner">Partner Provider</option>
                </select>
              </div>
              <div className="col-lg-2">
                <select className="form-select" value={serviceModeFilter} onChange={(event) => setServiceModeFilter(event.target.value)}>
                  <option value="all">All modes</option>
                  <option value="in-store">In-store</option>
                  <option value="partner-location">Partner location</option>
                  <option value="at-home">At home</option>
                  <option value="online">Online</option>
                </select>
              </div>
              <div className="col-lg-3">
                <select className="form-select" value={serviceSort} onChange={(event) => setServiceSort(event.target.value)}>
                  <option value="recommended">Recommended order</option>
                  <option value="recent">Newest first</option>
                  <option value="price-low">Price low to high</option>
                  <option value="price-high">Price high to low</option>
                </select>
              </div>
            </div>
        </div>

        {user?.role === "provider" && (
          <div className="surface-panel mb-4">
              <h4 className="mb-3">Create Service</h4>

              <form onSubmit={handleCreateService}>
                <input
                  className="form-control mb-2"
                  placeholder="Service Name"
                  value={serviceForm.name}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, name: event.target.value }))
                  }
                  required
                />

                <textarea
                  className="form-control mb-2"
                  placeholder="Description"
                  rows="3"
                  value={serviceForm.description}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, description: event.target.value }))
                  }
                  required
                />

                <input
                  className="form-control mb-2"
                  placeholder="Service Image URL (optional)"
                  value={serviceForm.imageUrl}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, imageUrl: event.target.value }))
                  }
                />

                <input
                  className="form-control mb-2"
                  placeholder="Price"
                  type="number"
                  min="0"
                  value={serviceForm.price}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, price: event.target.value }))
                  }
                  required
                />

                <input
                  className="form-control mb-3"
                  placeholder="Duration in minutes"
                  type="number"
                  min="15"
                  step="15"
                  value={serviceForm.duration}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, duration: event.target.value }))
                  }
                  required
                />

                <label className="form-label">Delivered By</label>
                <select
                  className="form-select mb-2"
                  value={serviceForm.serviceSource}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, serviceSource: event.target.value }))
                  }
                >
                  <option value="petxhub">PetXHub</option>
                  <option value="partner">Partner Provider</option>
                </select>

                <label className="form-label">Fulfillment Mode</label>
                <select
                  className="form-select mb-2"
                  value={serviceForm.fulfillmentMode}
                  onChange={(event) =>
                    setServiceForm((current) => ({ ...current, fulfillmentMode: event.target.value }))
                  }
                >
                  <option value="in-store">PetXHub Store</option>
                  <option value="partner-location">Partner Location</option>
                  <option value="at-home">At Home</option>
                  <option value="online">Online</option>
                </select>

                {requiresPhysicalLocation && (
                  <>
                    <input
                      className="form-control mb-2"
                      placeholder="Location Name"
                      value={serviceForm.locationName}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, locationName: event.target.value }))
                      }
                      required
                    />

                    <input
                      className="form-control mb-2"
                      placeholder="Street Address"
                      value={serviceForm.address}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, address: event.target.value }))
                      }
                      required
                    />

                    <input
                      className="form-control mb-3"
                      placeholder="Google Maps Link (optional)"
                      value={serviceForm.mapLink}
                      onChange={(event) =>
                        setServiceForm((current) => ({ ...current, mapLink: event.target.value }))
                      }
                    />
                  </>
                )}

                {!requiresPhysicalLocation && (
                  <p className="text-muted small mb-3">
                    {serviceForm.fulfillmentMode === "at-home"
                      ? "Customers will see that the provider visits their location."
                      : "Customers will see this as an online service."}
                  </p>
                )}

                <button className="btn btn-primary">Create Service</button>
              </form>
          </div>
        )}

        <div className="row g-4">
          <div className="col-lg-7">
            <div className="surface-panel h-100">
                <h4 className="mb-3">Available Services</h4>

                {filteredServices.length === 0 ? (
                  <p className="text-muted mb-0">No services available yet.</p>
                ) : (
                  <div className="row g-3">
                    {filteredServices.map((service) => {
                      const isSelected = service._id === selectedServiceId;

                      return (
                        <div key={service._id} className="col-md-6">
                          <div className={`service-market-card h-100 ${isSelected ? "service-market-card-active" : ""}`}>
                            {service.imageUrl ? (
                              <div
                                className="petx-card-media"
                                style={{ backgroundImage: `url(${service.imageUrl})` }}
                              />
                            ) : (
                              <div className="petx-card-media petx-card-media-placeholder">
                                <span>{service.name}</span>
                              </div>
                            )}
                            <h5 className="mb-1">{service.name}</h5>
                            <p className="mb-2"><strong>Price:</strong> {formatCurrency(service.price || 0)}</p>
                            <p className="text-muted mb-2">{service.description}</p>
                            <p className="mb-1"><strong>Duration:</strong> {service.duration} mins</p>
                            <p className="mb-1">
                              <strong>Delivered by:</strong> {SOURCE_LABELS[service.serviceSource] || "Partner Provider"}
                            </p>
                            <p className="mb-1">
                              <strong>Fulfillment:</strong> {MODE_LABELS[service.fulfillmentMode] || service.fulfillmentMode}
                            </p>
                            <p className="mb-3">
                              <strong>Location:</strong>{" "}
                              {service.fulfillmentMode === "at-home"
                                ? "Provider visits your location"
                                : service.fulfillmentMode === "online"
                                  ? "Online service"
                                  : getServiceAddress(service) || "Location will be shared soon"}
                            </p>
                            <div className="d-flex flex-column align-items-start gap-2">
                              {/* {service.mapLink ? (
                                <a href={service.mapLink} target="_blank" rel="noreferrer">
                                  Open map
                                </a>
                              ) : (
                                <span className="text-muted small">No map link</span>
                              )} */}
                              <button
                                type="button"
                                className={`btn ${isSelected ? "btn-outline-primary" : "btn-primary"}`}
                                onClick={() => setSelectedServiceId(service._id)}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>

          <div className="col-lg-5">
            <div className="surface-panel h-100">
                <h4 className="mb-3">Book Service</h4>
                {!isAuthenticated ? (
                  <p className="text-muted mb-3">
                    You can browse everything now. Login or signup to complete booking.
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

                <label className="form-label">Date</label>
                <input
                  className="form-control mb-3"
                  type="date"
                  value={selectedDate}
                  min={getTodayDate()}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />

                <label className="form-label">Available Time Slots</label>
                {isLoadingSlots ? (
                  <p className="text-muted mb-4">Loading time slots...</p>
                ) : (
                  <div className="d-flex flex-wrap gap-2 mb-4">
                    {availableSlots.length === 0 ? (
                      <p className="text-muted mb-0">Select a service and date to view slots.</p>
                    ) : (
                      availableSlots.map((slot) => (
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
                      ))
                    )}
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
                  <p className="mb-2"><strong>Service:</strong> {selectedService?.name || "Not selected"}</p>
                  <p className="mb-2">
                    <strong>Delivered By:</strong>{" "}
                    {selectedService
                      ? SOURCE_LABELS[selectedService.serviceSource] || "Partner Provider"
                      : "Not selected"}
                  </p>
                  <p className="mb-2">
                    <strong>Fulfillment:</strong>{" "}
                    {selectedService
                      ? MODE_LABELS[selectedService.fulfillmentMode] || selectedService.fulfillmentMode
                      : "Not selected"}
                  </p>
                  <p className="mb-2">
                    <strong>Location:</strong>{" "}
                    {selectedService
                      ? selectedService.fulfillmentMode === "at-home"
                        ? "Provider visits your location"
                        : selectedService.fulfillmentMode === "online"
                          ? "Online service"
                          : getServiceAddress(selectedService) || "Location will be shared soon"
                      : "Not selected"}
                  </p>
                  <p className="mb-2">
                    <strong>Pet:</strong> {pets.find((pet) => pet._id === selectedPet)?.name || "Not selected"}
                  </p>
                  <p className="mb-2"><strong>Date:</strong> {selectedDate || "Not selected"}</p>
                  <p className="mb-3"><strong>Time Slot:</strong> {selectedTimeSlot || "Not selected"}</p>
                  <p className="mb-3">
                    <strong>Amount:</strong> {selectedService ? formatCurrency(selectedService.price) : "Not selected"}
                  </p>
                  <p className="mb-3">
                    <strong>Payment:</strong> {paymentMethod === "online" ? "Pay Online" : "Pay Later / At Service"}
                  </p>

                  <button
                    type="button"
                    className="btn btn-success w-100"
                    onClick={handleBookService}
                    disabled={!isAuthenticated || isBooking || !selectedPet || !selectedServiceId || !selectedDate || !selectedTimeSlot}
                  >
                    {!isAuthenticated
                      ? "Login to Book"
                      : isBooking
                      ? paymentMethod === "online"
                        ? "Starting Payment..."
                        : "Confirming Booking..."
                      : paymentMethod === "online"
                        ? "Pay & Book Service"
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

export default Services;
