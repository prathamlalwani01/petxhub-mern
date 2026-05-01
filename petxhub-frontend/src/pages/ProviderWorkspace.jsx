import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { formatCurrency } from "../utils/bookingPricing";

const API_BASE_URL = "http://localhost:5000/api";
const BOOKING_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
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

const getStatusTone = (status) => {
  switch (status) {
    case "completed":
    case "confirmed":
    case "paid":
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
    case "failed":
    case "inactive":
      return "danger";
    default:
      return "neutral";
  }
};

function ProviderWorkspace() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const token = localStorage.getItem("token");
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("services");
  const [loading, setLoading] = useState(true);
  const [savingService, setSavingService] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState("");
  const [editingServiceId, setEditingServiceId] = useState("");
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
    isActive: true,
  });

  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  const requiresPhysicalLocation = ["in-store", "partner-location"].includes(serviceForm.fulfillmentMode);

  const fetchWorkspace = async () => {
    try {
      const [servicesRes, bookingsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/services/my-services`, authConfig),
        axios.get(`${API_BASE_URL}/bookings/manage`, authConfig),
      ]);

      setServices(servicesRes.data || []);
      setBookings(bookingsRes.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "provider" || user?.role === "admin") {
      fetchWorkspace();
    } else {
      setLoading(false);
    }
  }, [authConfig, user?.role]);

  const resetForm = () => {
    setEditingServiceId("");
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
      isActive: true,
    });
  };

  const handleServiceSubmit = async (event) => {
    event.preventDefault();

    try {
      setSavingService(true);
      const payload = {
        ...serviceForm,
        price: Number(serviceForm.price),
        duration: Number(serviceForm.duration),
      };

      if (editingServiceId) {
        const res = await axios.put(`${API_BASE_URL}/services/${editingServiceId}`, payload, authConfig);
        setServices((current) =>
          current.map((service) => (service._id === editingServiceId ? res.data.service : service))
        );
      } else {
        const res = await axios.post(`${API_BASE_URL}/services`, payload, authConfig);
        setServices((current) => [res.data.service, ...current]);
      }

      resetForm();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to save service");
    } finally {
      setSavingService(false);
    }
  };

  const handleEditService = (service) => {
    setEditingServiceId(service._id);
    setServiceForm({
      name: service.name || "",
      description: service.description || "",
      price: service.price ?? "",
      duration: service.duration ?? "",
      serviceSource: service.serviceSource || "partner",
      fulfillmentMode: service.fulfillmentMode || "partner-location",
      locationName: service.locationName || "",
      address: service.address || "",
      mapLink: service.mapLink || "",
      isActive: service.isActive !== false,
    });
    setActiveTab("services");
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm("Delete this service?")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/services/${serviceId}`, authConfig);
      setServices((current) => current.filter((service) => service._id !== serviceId));
      if (editingServiceId === serviceId) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to delete service");
    }
  };

  const handleBookingStatusUpdate = async (bookingId, status) => {
    try {
      setUpdatingBookingId(bookingId);
      const res = await axios.patch(`${API_BASE_URL}/bookings/${bookingId}/status`, { status }, authConfig);
      setBookings((current) => current.map((booking) => (booking._id === bookingId ? res.data.booking : booking)));
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to update booking");
    } finally {
      setUpdatingBookingId("");
    }
  };

  if (user?.role !== "provider" && user?.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="page-hero-card">
            <span className="page-kicker mb-3">Provider Ops</span>
            <h2 className="mb-2">Provider Workspace</h2>
            <p className="text-muted mb-0">This page is available for providers and admins only.</p>
          </div>
        </div>
      </>
    );
  }

  const revenue = bookings.reduce(
    (sum, booking) => sum + (booking.paymentStatus === "paid" ? booking.amount || 0 : 0),
    0
  );
  const pendingBookings = bookings.filter((booking) => booking.status === "pending").length;
  const confirmedBookings = bookings.filter((booking) => booking.status === "confirmed").length;
  const todayDateKey = new Date().toISOString().split("T")[0];
  const todayBookings = bookings.filter(
    (booking) =>
      booking.bookingDate &&
      new Date(booking.bookingDate).toISOString().split("T")[0] === todayDateKey
  );

  return (
    <>
      <Navbar />
      <div className="container py-4 py-lg-5 page-shell">
        <div className="page-hero-card mb-4">
          <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-end">
            <div>
              <span className="page-kicker mb-3">Provider Ops</span>
              <h2 className="mb-2">Provider Workspace</h2>
              <p className="text-muted mb-0">
                Manage your services, track booking movement, and keep your delivery side of PetXHub sharp.
              </p>
              <div className="booking-meta-stack mt-3">
                <span className="booking-meta-chip">Today: {todayBookings.length} bookings</span>
                <span className="booking-meta-chip">Pending: {pendingBookings}</span>
                <span className="booking-meta-chip">Confirmed: {confirmedBookings}</span>
              </div>
            </div>
            <div className="tabs-shell">
              <button
                type="button"
                className={`btn ${activeTab === "services" ? "btn-dark" : "btn-outline-dark"}`}
                onClick={() => setActiveTab("services")}
              >
                Services
              </button>
              <button
                type="button"
                className={`btn ${activeTab === "bookings" ? "btn-dark" : "btn-outline-dark"}`}
                onClick={() => setActiveTab("bookings")}
              >
                Bookings
              </button>
            </div>
          </div>
        </div>

        <div className="row g-3 mb-4">
          <div className="col-md-6 col-xl-3">
            <div className="modern-metric metric-info stagger-item-fast" style={{ "--stagger": 0 }}>
              <p className="mb-2">My Services</p>
              <h3 className="mb-0">{services.length}</h3>
            </div>
          </div>
          <div className="col-md-6 col-xl-3">
            <div className="modern-metric metric-warning stagger-item-fast" style={{ "--stagger": 1 }}>
              <p className="mb-2">Pending Bookings</p>
              <h3 className="mb-0">{pendingBookings}</h3>
            </div>
          </div>
          <div className="col-md-6 col-xl-3">
            <div className="modern-metric metric-info stagger-item-fast" style={{ "--stagger": 2 }}>
              <p className="mb-2">Today&apos;s Queue</p>
              <h3 className="mb-0">{todayBookings.length}</h3>
            </div>
          </div>
          <div className="col-md-6 col-xl-3">
            <div className="modern-metric metric-danger stagger-item-fast" style={{ "--stagger": 3 }}>
              <p className="mb-2">Paid Revenue</p>
              <h3 className="mb-0">{formatCurrency(revenue)}</h3>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="surface-panel">
            <p className="text-muted mb-0">Loading workspace...</p>
          </div>
        ) : (
          <>
            {activeTab === "services" && (
              <div className="row g-4">
                <div className="col-lg-5">
                  <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 0 }}>
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div>
                        <h4 className="mb-1">{editingServiceId ? "Edit Service" : "Create Service"}</h4>
                        <p className="text-muted mb-0">
                          Keep your listing polished, location-aware, and ready for bookings.
                        </p>
                      </div>
                      {editingServiceId ? (
                        <span className="status-pill status-pill-warning">editing</span>
                      ) : null}
                    </div>

                    <form onSubmit={handleServiceSubmit}>
                      <input
                        className="form-control mb-2"
                        placeholder="Service Name"
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm((cur) => ({ ...cur, name: e.target.value }))}
                        required
                      />
                      <textarea
                        className="form-control mb-2"
                        rows="3"
                        placeholder="Description"
                        value={serviceForm.description}
                        onChange={(e) => setServiceForm((cur) => ({ ...cur, description: e.target.value }))}
                        required
                      />
                      <div className="row g-2 mb-2">
                        <div className="col-6">
                          <input
                            className="form-control"
                            type="number"
                            placeholder="Price"
                            min="0"
                            value={serviceForm.price}
                            onChange={(e) => setServiceForm((cur) => ({ ...cur, price: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="col-6">
                          <input
                            className="form-control"
                            type="number"
                            placeholder="Duration"
                            min="15"
                            step="15"
                            value={serviceForm.duration}
                            onChange={(e) => setServiceForm((cur) => ({ ...cur, duration: e.target.value }))}
                            required
                          />
                        </div>
                      </div>
                      <select
                        className="form-select mb-2"
                        value={serviceForm.serviceSource}
                        onChange={(e) => setServiceForm((cur) => ({ ...cur, serviceSource: e.target.value }))}
                      >
                        <option value="petxhub">PetXHub</option>
                        <option value="partner">Partner Provider</option>
                      </select>
                      <select
                        className="form-select mb-2"
                        value={serviceForm.fulfillmentMode}
                        onChange={(e) => setServiceForm((cur) => ({ ...cur, fulfillmentMode: e.target.value }))}
                      >
                        <option value="in-store">PetXHub Store</option>
                        <option value="partner-location">Partner Location</option>
                        <option value="at-home">At Home</option>
                        <option value="online">Online</option>
                      </select>
                      {requiresPhysicalLocation ? (
                        <>
                          <input
                            className="form-control mb-2"
                            placeholder="Location Name"
                            value={serviceForm.locationName}
                            onChange={(e) => setServiceForm((cur) => ({ ...cur, locationName: e.target.value }))}
                            required
                          />
                          <input
                            className="form-control mb-2"
                            placeholder="Address"
                            value={serviceForm.address}
                            onChange={(e) => setServiceForm((cur) => ({ ...cur, address: e.target.value }))}
                            required
                          />
                          <input
                            className="form-control mb-2"
                            placeholder="Google Maps Link"
                            value={serviceForm.mapLink}
                            onChange={(e) => setServiceForm((cur) => ({ ...cur, mapLink: e.target.value }))}
                          />
                        </>
                      ) : null}
                      <div className="form-check mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={serviceForm.isActive}
                          onChange={(e) => setServiceForm((cur) => ({ ...cur, isActive: e.target.checked }))}
                          id="serviceActiveToggle"
                        />
                        <label className="form-check-label" htmlFor="serviceActiveToggle">
                          Service is active
                        </label>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button className="btn btn-dark" disabled={savingService}>
                          {savingService ? "Saving..." : editingServiceId ? "Update Service" : "Create Service"}
                        </button>
                        {editingServiceId ? (
                          <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </div>

                <div className="col-lg-7">
                  <div className="surface-panel h-100 stagger-item" style={{ "--stagger": 1 }}>
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div>
                        <h4 className="mb-1">My Services</h4>
                        <p className="text-muted mb-0">
                          Your live catalog with delivery mode, source, and quick controls.
                        </p>
                      </div>
                      <span className="booking-meta-chip">{services.length} listings</span>
                    </div>

                    {services.length === 0 ? (
                      <p className="text-muted mb-0">You haven&apos;t created any services yet.</p>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {services.map((service) => (
                          <div key={service._id} className="service-market-card stagger-item-fast" style={{ "--stagger": 0 }}>
                            <div className="d-flex justify-content-between gap-3 flex-wrap">
                              <div className="flex-grow-1">
                                <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                                  <h5 className="mb-0">{service.name}</h5>
                                  <span
                                    className={`status-pill status-pill-${
                                      service.isActive === false ? "danger" : "success"
                                    }`}
                                  >
                                    {service.isActive === false ? "inactive" : "active"}
                                  </span>
                                </div>
                                <p className="text-muted mb-3">{service.description}</p>
                                <div className="booking-meta-stack mb-2">
                                  <span className="booking-meta-chip">{formatCurrency(service.price)}</span>
                                  <span className="booking-meta-chip">{service.duration} mins</span>
                                  <span className="booking-meta-chip">
                                    {SOURCE_LABELS[service.serviceSource] || "Partner Provider"}
                                  </span>
                                  <span className="booking-meta-chip">
                                    {MODE_LABELS[service.fulfillmentMode] || service.fulfillmentMode}
                                  </span>
                                </div>
                                {service.locationName || service.address ? (
                                  <p className="mb-0 text-muted">
                                    {[service.locationName, service.address]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </p>
                                ) : null}
                              </div>
                              <div className="d-flex gap-2 align-items-start">
                                <button
                                  type="button"
                                  className="btn btn-outline-dark btn-sm"
                                  onClick={() => handleEditService(service)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleDeleteService(service._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "bookings" ? (
              <div className="surface-panel stagger-item" style={{ "--stagger": 2 }}>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <div>
                    <h4 className="mb-1">Assigned Bookings</h4>
                    <p className="text-muted mb-0">A compact operations feed for your current booking load.</p>
                  </div>
                  <button type="button" className="btn btn-outline-dark btn-sm" onClick={() => navigate("/manage-bookings")}>
                    Open Full Manager
                  </button>
                </div>

                {bookings.length === 0 ? (
                  <p className="text-muted mb-0">No bookings assigned yet.</p>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {bookings.slice(0, 10).map((booking) => (
                      <div key={booking._id} className="booking-card booking-card-modern stagger-item-fast" style={{ "--stagger": 1 }}>
                        <div className="d-flex justify-content-between gap-3 flex-wrap">
                          <div className="flex-grow-1">
                            <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                              <h5 className="mb-0">
                                {booking.service?.name || booking.appointmentType || booking.groomingPackage || "Booking"}
                              </h5>
                              <span className={`status-pill status-pill-${getStatusTone(booking.status)}`}>
                                {booking.status}
                              </span>
                              <span className={`status-pill status-pill-${getStatusTone(booking.paymentStatus)}`}>
                                payment: {booking.paymentStatus}
                              </span>
                            </div>
                            <div className="row g-2">
                              <div className="col-md-6">
                                <div className="booking-summary-panel h-100">
                                  <p className="mb-1"><strong>Customer:</strong> {booking.user?.name || "Unknown"}</p>
                                  <p className="mb-1"><strong>Pet:</strong> {booking.pet?.name || "Unknown"}</p>
                                  <p className="mb-0"><strong>Date:</strong> {new Date(booking.bookingDate).toDateString()}</p>
                                </div>
                              </div>
                              <div className="col-md-6">
                                <div className="booking-summary-panel h-100">
                                  <p className="mb-1"><strong>Slot:</strong> {booking.timeSlot}</p>
                                  <p className="mb-1"><strong>Amount:</strong> {formatCurrency(booking.amount || 0)}</p>
                                  <p className="mb-0"><strong>Category:</strong> {booking.bookingCategory}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ minWidth: "220px" }}>
                            <label className="form-label fw-semibold">Update status</label>
                            <select
                              className="form-select"
                              value={booking.status}
                              disabled={updatingBookingId === booking._id}
                              onChange={(e) => handleBookingStatusUpdate(booking._id, e.target.value)}
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
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

export default ProviderWorkspace;
