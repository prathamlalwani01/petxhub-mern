import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";
import ReminderCenter from "../components/ReminderCenter";

const API_BASE_URL = "http://localhost:5000/api";

const FILTER_OPTIONS = [
  { id: "all", label: "All" },
  { id: "due-soon", label: "Due Soon" },
  { id: "overdue", label: "Overdue" },
  { id: "completed", label: "Completed" }
];

const RECURRENCE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" }
];

const createInitialForm = () => ({
  type: "",
  title: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  reminderEnabled: false,
  reminderDate: "",
  reminderNote: "",
  reminderChannels: {
    inApp: true,
    browser: true,
    email: true,
    sms: false,
    whatsapp: false
  },
  recurrence: {
    enabled: false,
    frequency: "yearly",
    interval: 1
  }
});

const formatStatusLabel = (status) => {
  if (status === "overdue") {
    return "Overdue";
  }

  if (status === "due-soon") {
    return "Due soon";
  }

  if (status === "scheduled") {
    return "Scheduled";
  }

  if (status === "completed") {
    return "Completed";
  }

  return "No reminder";
};

const getStatusBadgeClass = (status) => {
  if (status === "overdue") {
    return "bg-danger-subtle text-danger";
  }

  if (status === "due-soon") {
    return "bg-warning-subtle text-warning-emphasis";
  }

  if (status === "scheduled") {
    return "bg-info-subtle text-info-emphasis";
  }

  if (status === "completed") {
    return "bg-success-subtle text-success";
  }

  return "bg-secondary-subtle text-secondary";
};

const formatReminderTiming = (record) => {
  if (record.reminderStatus === "completed") {
    return record.completedAt
      ? `Completed on ${new Date(record.completedAt).toDateString()}`
      : "Completed";
  }

  if (!record.reminderEnabled || !record.reminderDate || record.daysUntilReminder === null) {
    return "No reminder scheduled";
  }

  if (record.daysUntilReminder < 0) {
    const daysOverdue = Math.abs(record.daysUntilReminder);
    return `${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue`;
  }

  if (record.daysUntilReminder === 0) {
    return "Due today";
  }

  return `Due in ${record.daysUntilReminder} day${record.daysUntilReminder === 1 ? "" : "s"}`;
};

function HealthRecords() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(createInitialForm());
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reminderSummary, setReminderSummary] = useState({
    reminders: [],
    summary: { overdue: 0, dueSoon: 0, scheduled: 0, completed: 0 }
  });

  const token = localStorage.getItem("token");
  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId(null);
  };

  const fetchRecords = async (petId) => {
    if (!petId) {
      setRecords([]);
      return;
    }

    setLoading(true);

    try {
      const res = await axios.get(`${API_BASE_URL}/health/${petId}`, authConfig);
      setRecords(res.data);
    } catch (error) {
      alert(error.response?.data?.message || "Error fetching records");
    } finally {
      setLoading(false);
    }
  };

  const fetchReminderSummary = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/health/reminders/all`, authConfig);
      setReminderSummary(res.data);
    } catch (error) {
      console.error("Failed to fetch reminders", error);
    }
  };

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/pets`, authConfig);
        const fetchedPets = res.data.pets || [];

        setPets(fetchedPets);

        if (fetchedPets.length > 0) {
          setSelectedPet((currentPet) => currentPet || fetchedPets[0]._id);
        }
      } catch (error) {
        alert(error.response?.data?.message || "Error fetching pets");
      }
    };

    fetchPets();
    fetchReminderSummary();
  }, [authConfig]);

  useEffect(() => {
    if (selectedPet) {
      fetchRecords(selectedPet);
    }
  }, [selectedPet]);

  const handleChange = (field, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const handleAdd = async (e) => {
    e.preventDefault();

    if (!selectedPet || !form.type || !form.title || !form.date) {
      return alert("Please fill the pet, type, title, and record date");
    }

    if (form.reminderEnabled && !form.reminderDate) {
      return alert("Please choose a reminder date");
    }

    const payload = {
      pet: selectedPet,
      type: form.type,
      title: form.title,
      description: form.description,
      date: form.date,
      reminderEnabled: form.reminderEnabled,
      reminderDate: form.reminderEnabled ? form.reminderDate : null,
      reminderNote: form.reminderEnabled ? form.reminderNote : "",
      reminderChannels: form.reminderEnabled ? form.reminderChannels : undefined,
      recurrence: form.reminderEnabled ? form.recurrence : undefined
    };

    setSaving(true);

    try {
      if (editingId) {
        await axios.put(`${API_BASE_URL}/health/${editingId}`, payload, authConfig);
        alert("Record updated");
      } else {
        await axios.post(`${API_BASE_URL}/health`, payload, authConfig);
        alert("Record added");
      }

      await Promise.all([
        fetchRecords(selectedPet),
        fetchReminderSummary()
      ]);
      resetForm();
    } catch (error) {
      alert(error.response?.data?.message || "Error saving record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/health/${id}`, authConfig);

      await Promise.all([
        fetchRecords(selectedPet),
        fetchReminderSummary()
      ]);
    } catch (error) {
      alert(error.response?.data?.message || "Error deleting record");
    }
  };

  const handleComplete = async (id) => {
    try {
      const res = await axios.patch(`${API_BASE_URL}/health/${id}/complete`, {}, authConfig);
      alert(res.data.message);

      await Promise.all([
        fetchRecords(selectedPet),
        fetchReminderSummary()
      ]);
    } catch (error) {
      alert(error.response?.data?.message || "Unable to complete reminder");
    }
  };

  const handleEdit = (record) => {
    setEditingId(record._id);
    setForm({
      type: record.type,
      title: record.title,
      description: record.description || "",
      date: record.date ? new Date(record.date).toISOString().split("T")[0] : "",
      reminderEnabled: Boolean(record.reminderEnabled || record.reminderStatus === "completed"),
      reminderDate: record.reminderDate ? new Date(record.reminderDate).toISOString().split("T")[0] : "",
      reminderNote: record.reminderNote || "",
      reminderChannels: {
        inApp: record.reminderChannels?.inApp ?? true,
        browser: record.reminderChannels?.browser ?? true,
        email: record.reminderChannels?.email ?? true,
        sms: record.reminderChannels?.sms ?? false,
        whatsapp: record.reminderChannels?.whatsapp ?? false
      },
      recurrence: {
        enabled: Boolean(record.recurrence?.enabled),
        frequency: record.recurrence?.frequency || "yearly",
        interval: record.recurrence?.interval || 1
      }
    });
  };

  const handleBookVetCare = (record) => {
    navigate("/vet-booking", {
      state: {
        petId: selectedPet,
        careType: record.type === "vaccination" ? "vaccination" : "consultation",
        concern: [record.title, record.reminderNote || record.description || ""].filter(Boolean).join(" - ")
      }
    });
  };

  const filteredRecords = records.filter((record) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      record.title?.toLowerCase().includes(normalizedSearch) ||
      record.description?.toLowerCase().includes(normalizedSearch) ||
      record.reminderNote?.toLowerCase().includes(normalizedSearch);

    const matchesStatus = filter === "all" || record.reminderStatus === filter;
    const matchesType = typeFilter === "all" || record.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const dueSoonReminders = reminderSummary.reminders?.filter((record) =>
    record.reminderStatus === "overdue" || record.reminderStatus === "due-soon"
  ) || [];

  return (
    <>
      <Navbar />

      <div className="page-shell">
      <div className="container py-5">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center gap-3 mb-4">
          <div className="page-hero-card flex-grow-1">
            <span className="page-kicker">Care history</span>
            <h2 className="mb-1">Health Records & Reminders</h2>
            <p className="text-muted mb-0">
              Track vaccinations, medication, care notes, and the next time each pet needs attention.
            </p>
          </div>
          <button className="btn btn-outline-secondary align-self-start" onClick={resetForm}>
            {editingId ? "Cancel edit" : "Clear form"}
          </button>
        </div>

        <ReminderCenter />

        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="surface-panel h-100">
                <p className="text-muted mb-2">Overdue reminders</p>
                <h3 className="mb-0 text-danger">{reminderSummary.summary?.overdue || 0}</h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="surface-panel h-100">
                <p className="text-muted mb-2">Due in 7 days</p>
                <h3 className="mb-0 text-warning-emphasis">{reminderSummary.summary?.dueSoon || 0}</h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="surface-panel h-100">
                <p className="text-muted mb-2">Scheduled later</p>
                <h3 className="mb-0 text-info-emphasis">{reminderSummary.summary?.scheduled || 0}</h3>
            </div>
          </div>
          <div className="col-md-3">
            <div className="surface-panel h-100">
                <p className="text-muted mb-2">Completed</p>
                <h3 className="mb-0 text-success">{reminderSummary.summary?.completed || 0}</h3>
            </div>
          </div>
        </div>

        {dueSoonReminders.length > 0 ? (
          <div className="surface-panel mb-4">
              <h5 className="mb-3">Attention needed</h5>
              <div className="row g-3">
                {dueSoonReminders.slice(0, 4).map((record) => (
                  <div className="col-md-6" key={record._id}>
                    <div className="record-card h-100">
                      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                        <div>
                          <h6 className="mb-1">{record.title}</h6>
                          <p className="text-muted mb-0">{record.petName}</p>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(record.reminderStatus)}`}>
                          {formatStatusLabel(record.reminderStatus)}
                        </span>
                      </div>
                      <p className="mb-2">{formatReminderTiming(record)}</p>
                      <div className="d-flex gap-2 flex-wrap">
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() => handleComplete(record._id)}
                        >
                          Mark as done
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleBookVetCare(record)}
                        >
                          Book Vet Care
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          </div>
        ) : null}

        <div className="row g-4">
          <div className="col-lg-5">
            <div className="surface-panel">
                <h5 className="mb-3">{editingId ? "Edit record" : "Add health record"}</h5>

                <form onSubmit={handleAdd}>
                  <select
                    className="form-control mb-3"
                    value={selectedPet}
                    onChange={(e) => setSelectedPet(e.target.value)}
                  >
                    <option value="">Select Pet</option>
                    {pets.map((pet) => (
                      <option key={pet._id} value={pet._id}>
                        {pet.name}
                      </option>
                    ))}
                  </select>

                  <select
                    className="form-control mb-3"
                    value={form.type}
                    onChange={(e) => handleChange("type", e.target.value)}
                  >
                    <option value="">Select Type</option>
                    <option value="vaccination">Vaccination</option>
                    <option value="medication">Medication</option>
                    <option value="visit">Vet Visit</option>
                    <option value="care">Care Reminder</option>
                    <option value="note">Note</option>
                  </select>

                  <input
                    className="form-control mb-3"
                    placeholder="Title"
                    value={form.title}
                    onChange={(e) => handleChange("title", e.target.value)}
                  />

                  <textarea
                    className="form-control mb-3"
                    placeholder="Description"
                    rows="3"
                    value={form.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                  />

                  <label className="form-label">Record date</label>
                  <input
                    type="date"
                    className="form-control mb-3"
                    value={form.date}
                    onChange={(e) => handleChange("date", e.target.value)}
                  />

                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="reminderEnabled"
                      checked={form.reminderEnabled}
                      onChange={(e) => handleChange("reminderEnabled", e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="reminderEnabled">
                      Enable reminder for this record
                    </label>
                  </div>

                  {form.reminderEnabled ? (
                    <>
                      <label className="form-label">Reminder date</label>
                      <input
                        type="date"
                        className="form-control mb-3"
                        value={form.reminderDate}
                        onChange={(e) => handleChange("reminderDate", e.target.value)}
                      />

                      <input
                        className="form-control mb-3"
                        placeholder="Reminder note, like annual booster or deworming follow-up"
                        value={form.reminderNote}
                        onChange={(e) => handleChange("reminderNote", e.target.value)}
                      />

                      <div className="form-check form-switch mb-3">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="recurrenceEnabled"
                          checked={form.recurrence.enabled}
                          onChange={(e) =>
                            setForm((currentForm) => ({
                              ...currentForm,
                              recurrence: {
                                ...currentForm.recurrence,
                                enabled: e.target.checked
                              }
                            }))
                          }
                        />
                        <label className="form-check-label" htmlFor="recurrenceEnabled">
                          Repeat this reminder automatically
                        </label>
                      </div>

                      {form.recurrence.enabled ? (
                        <div className="row g-2 mb-3">
                          <div className="col-md-7">
                            <select
                              className="form-control"
                              value={form.recurrence.frequency}
                              onChange={(e) =>
                                setForm((currentForm) => ({
                                  ...currentForm,
                                  recurrence: {
                                    ...currentForm.recurrence,
                                    frequency: e.target.value
                                  }
                                }))
                              }
                            >
                              {RECURRENCE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-5">
                            <input
                              type="number"
                              min="1"
                              className="form-control"
                              value={form.recurrence.interval}
                              onChange={(e) =>
                                setForm((currentForm) => ({
                                  ...currentForm,
                                  recurrence: {
                                    ...currentForm.recurrence,
                                    interval: e.target.value
                                  }
                                }))
                              }
                            />
                          </div>
                        </div>
                      ) : null}

                      <div className="mb-3">
                        <label className="form-label d-block">Reminder channels</label>
                        {[
                          ["inApp", "In-app popup"],
                          ["browser", "Browser notification"],
                          ["email", "Email"],
                          ["sms", "SMS"],
                          ["whatsapp", "WhatsApp"]
                        ].map(([channel, label]) => (
                          <div className="form-check" key={channel}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`channel-${channel}`}
                              checked={Boolean(form.reminderChannels[channel])}
                              onChange={(e) =>
                                setForm((currentForm) => ({
                                  ...currentForm,
                                  reminderChannels: {
                                    ...currentForm.reminderChannels,
                                    [channel]: e.target.checked
                                  }
                                }))
                              }
                            />
                            <label className="form-check-label" htmlFor={`channel-${channel}`}>
                              {label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : null}

                  <button className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving..." : editingId ? "Update record" : "Add record"}
                  </button>
                </form>
            </div>
          </div>

          <div className="col-lg-7">
            <div className="surface-panel">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                  <h5 className="mb-0">Records</h5>
                  <div className="d-flex flex-wrap gap-2">
                    {FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`btn btn-sm ${filter === option.id ? "btn-primary" : "btn-outline-primary"}`}
                        onClick={() => setFilter(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-8">
                    <input
                      className="form-control"
                      placeholder="Search by title, note, or description"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <select
                      className="form-select"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <option value="all">All record types</option>
                      <option value="vaccination">Vaccination</option>
                      <option value="medication">Medication</option>
                      <option value="visit">Vet Visit</option>
                      <option value="care">Care Reminder</option>
                      <option value="note">Note</option>
                    </select>
                  </div>
                </div>

                {!selectedPet ? (
                  <p className="text-muted mb-0">Select a pet to view health records.</p>
                ) : loading ? (
                  <p className="text-muted mb-0">Loading records...</p>
                ) : filteredRecords.length === 0 ? (
                  <p className="text-muted mb-0">No records found for this filter.</p>
                ) : (
                  filteredRecords.map((record) => (
                    <div key={record._id} className="record-card mb-3">
                      <div className="d-flex flex-column flex-md-row justify-content-between gap-2 mb-2">
                        <div>
                          <h6 className="mb-1">{record.title}</h6>
                          <p className="text-muted text-capitalize mb-0">
                            {record.type} - {new Date(record.date).toDateString()}
                          </p>
                        </div>
                        <span className={`badge align-self-start ${getStatusBadgeClass(record.reminderStatus)}`}>
                          {formatStatusLabel(record.reminderStatus)}
                        </span>
                      </div>

                      {record.description ? (
                        <p className="mb-2">{record.description}</p>
                      ) : null}

                      <div className="small text-muted mb-3">
                        <div>{formatReminderTiming(record)}</div>
                        {record.reminderDate ? (
                          <div>Reminder date: {new Date(record.reminderDate).toDateString()}</div>
                        ) : null}
                        {record.reminderNote ? <div>Reminder note: {record.reminderNote}</div> : null}
                        {record.recurrence?.enabled ? (
                          <div>
                            Repeats every {record.recurrence.interval} {record.recurrence.frequency}
                            {record.recurrence.interval === 1 ? "" : "s"}
                          </div>
                        ) : null}
                        {record.lastCompletedAt ? (
                          <div>Last completed: {new Date(record.lastCompletedAt).toDateString()}</div>
                        ) : null}
                      </div>

                      <div className="d-flex gap-2 flex-wrap">
                        {record.reminderStatus !== "completed" && record.reminderEnabled ? (
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            onClick={() => handleComplete(record._id)}
                          >
                            Mark as done
                          </button>
                        ) : null}
                        {record.reminderStatus !== "completed" && record.reminderEnabled ? (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleBookVetCare(record)}
                          >
                            Book Vet Care
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-warning btn-sm"
                          onClick={() => handleEdit(record)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(record._id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}

export default HealthRecords;
