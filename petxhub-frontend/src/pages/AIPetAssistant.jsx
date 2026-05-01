import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const SUGGESTED_PROMPTS = [
  "My pet is not eating properly. What should I check first?",
  "Can you explain upcoming care reminders for this pet?",
  "What grooming schedule would you suggest for this breed?",
  "Does this pet need a vet visit based on recent records?",
];

const handleActionNavigation = ({ actionId, navigate, selectedPet }) => {
  if (actionId === "BOOK_VET") {
    navigate("/vet-booking", { state: { petId: selectedPet } });
    return;
  }

  if (actionId === "OPEN_HEALTH") {
    navigate("/health-records");
    return;
  }

  if (actionId === "OPEN_BOOKINGS") {
    navigate("/my-bookings");
    return;
  }

  if (actionId === "OPEN_GROOMING") {
    navigate("/services");
    return;
  }

  navigate("/services");
};

function AIPetAssistant() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [pets, setPets] = useState([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reminderDraft, setReminderDraft] = useState(null);
  const hasShownGuestNoticeRef = useRef(false);

  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  useEffect(() => {
    localStorage.setItem("ai_assistant_used", "true");

    if (!token) {
      setPets([]);
      setSelectedPet("");
      setMessages([]);
      if (!hasShownGuestNoticeRef.current) {
        hasShownGuestNoticeRef.current = true;
        alert("Please login to use the AI Assistant.");
      }
      return;
    }

    const fetchPets = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/pets`, authConfig);
        const fetchedPets = res.data.pets || [];
        setPets(fetchedPets);

        if (fetchedPets.length > 0) {
          setSelectedPet(fetchedPets[0]._id);
        }
      } catch (error) {
        console.error(error);
        alert(error.response?.data?.message || "Unable to load pets");
      }
    };

    fetchPets();
  }, [authConfig]);

  useEffect(() => {
    if (!token) {
      setMessages([]);
      return;
    }

    const fetchHistory = async () => {
      if (!selectedPet) {
        setMessages([]);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE_URL}/ai/pet-care/history/${selectedPet}`, authConfig);
        const historicalMessages = [];

        (res.data.history || []).forEach((entry) => {
          historicalMessages.push({
            role: "user",
            content: entry.question,
            petName: res.data.pet?.name || "Your pet",
          });

          historicalMessages.push({
            role: "assistant",
            content: entry.answer,
            petName: res.data.pet?.name || "Your pet",
            actions: entry.actions || [],
            question: entry.question,
          });
        });

        setMessages(historicalMessages);
      } catch (error) {
        console.error("Unable to load assistant history", error);
        setMessages([]);
      }
    };

    fetchHistory();
  }, [selectedPet, authConfig]);

  const handleAsk = async (submittedQuestion) => {
    const finalQuestion = (submittedQuestion || question).trim();

    if (!selectedPet || !finalQuestion) {
      alert("Please select a pet and ask a question");
      return;
    }

    const petName = pets.find((pet) => pet._id === selectedPet)?.name || "Your pet";

    setMessages((currentMessages) => [
      ...currentMessages,
      { role: "user", content: finalQuestion, petName },
    ]);
    setQuestion("");

    try {
      setIsLoading(true);

      const res = await axios.post(
        `${API_BASE_URL}/ai/pet-care`,
        {
          petId: selectedPet,
          message: finalQuestion,
        },
        authConfig
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: res.data.reply,
          petName: res.data.pet?.name || petName,
          actions: res.data.actions || [],
          question: finalQuestion,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content: error.response?.data?.message || "Unable to get AI guidance right now.",
          petName,
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async (assistantMessage) => {
    if (!selectedPet || !assistantMessage?.content) {
      return;
    }

    try {
      await axios.post(
        `${API_BASE_URL}/ai/pet-care/save-note`,
        {
          petId: selectedPet,
          title: `AI Note - ${new Date().toLocaleDateString()}`,
          summary:
            assistantMessage.content.split("\n")[0]?.slice(0, 180) ||
            assistantMessage.content.slice(0, 180),
          question: assistantMessage.question || "",
          answer: assistantMessage.content,
        },
        authConfig
      );

      alert("Saved to health records");
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to save note");
    }
  };

  const handleCreateReminder = (assistantMessage) => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);

    setReminderDraft({
      petId: selectedPet,
      title: `AI Follow-up - ${pets.find((pet) => pet._id === selectedPet)?.name || "Pet"}`,
      description: assistantMessage.content.slice(0, 240),
      reminderDate: defaultDate.toISOString().split("T")[0],
      reminderNote:
        assistantMessage.content.split("\n")[0]?.slice(0, 180) ||
        assistantMessage.content.slice(0, 180),
    });
  };

  const submitReminderDraft = async () => {
    if (!reminderDraft?.petId || !reminderDraft?.reminderDate) {
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/ai/pet-care/create-reminder`, reminderDraft, authConfig);

      alert("Reminder created");
      setReminderDraft(null);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to create reminder");
    }
  };

  return (
    <>
      <Navbar />

      <div className="container py-4 py-lg-5 page-shell">
        <div className="page-hero-card mb-4 dashboard-hero">
          <div className="hero-grid" />
          <div className="hero-orb hero-orb-a" />
          <div className="hero-orb hero-orb-b" />
          <div className="position-relative">
            <div className="d-flex flex-column flex-xl-row justify-content-between gap-3 align-items-xl-end">
              <div>
                <span className="page-kicker mb-3">Contextual AI</span>
                <h2 className="mb-2">AI Pet Care Assistant</h2>
                <p className="text-muted mb-0">
                  Ask care, symptom, reminder, feeding, or grooming questions with your selected pet&apos;s profile and history already in context.
                </p>
              </div>
              <div className="booking-meta-stack">
                <span className="booking-meta-chip">{pets.length} pets loaded</span>
                <span className="booking-meta-chip">{messages.length} messages</span>
              </div>
            </div>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-lg-4">
            <div className="surface-panel h-100">
              <h4 className="mb-2">Assistant Controls</h4>
              <p className="text-muted mb-4">
                Pick a pet, launch a quick prompt, or jump into related actions when the answer points you somewhere specific.
              </p>

              <label className="form-label fw-semibold">Choose Pet</label>
              <select
                className="form-select mb-4"
                value={selectedPet}
                onChange={(event) => setSelectedPet(event.target.value)}
              >
                <option value="">Select a pet</option>
                {pets.map((pet) => (
                  <option key={pet._id} value={pet._id}>
                    {pet.name}
                  </option>
                ))}
              </select>

              <h5 className="mb-3">Try asking</h5>
              <div className="d-grid gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="btn btn-outline-dark text-start"
                    onClick={() => handleAsk(prompt)}
                    disabled={!selectedPet || isLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="booking-summary-panel mt-4">
                <h6 className="mb-2">Quick actions</h6>
                <div className="d-flex gap-2 flex-wrap">
                  <button type="button" className="btn btn-sm btn-dark" onClick={() => navigate("/vet-booking")}>
                    Book Vet Care
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => navigate("/health-records")}>
                    Open Health Records
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => navigate("/my-bookings")}>
                    View Bookings
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="col-lg-8">
            <div className="surface-panel">
              <div className="mb-3">
                <h4 className="mb-1">Conversation</h4>
                <p className="text-muted mb-0">
                  This assistant provides general guidance and does not replace an in-person veterinarian.
                </p>
              </div>

              <div className="assistant-chat-surface mb-3">
                {messages.length === 0 ? (
                  <p className="text-muted mb-0">
                    Start with a pet care question and the assistant will use the selected pet&apos;s profile, records, and bookings for context.
                  </p>
                ) : (
                  <div className="d-grid gap-3">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`assistant-message ${
                          message.role === "assistant" ? "assistant-message-assistant" : "assistant-message-user"
                        }`}
                      >
                        <div className="small fw-semibold mb-2">
                          {message.role === "assistant"
                            ? `Assistant for ${message.petName}`
                            : `You about ${message.petName}`}
                        </div>
                        <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
                        {message.role === "assistant" && message.actions?.length ? (
                          <div className="d-flex gap-2 flex-wrap mt-3">
                            {message.actions.map((action) => (
                              <button
                                key={`${action.id}-${index}`}
                                type="button"
                                className="btn btn-sm btn-outline-dark"
                                onClick={() => {
                                  if (action.id === "SAVE_NOTE") {
                                    handleSaveNote(message);
                                    return;
                                  }

                                  if (action.id === "CREATE_REMINDER") {
                                    handleCreateReminder(message);
                                    return;
                                  }

                                  handleActionNavigation({
                                    actionId: action.id,
                                    navigate,
                                    selectedPet,
                                  });
                                }}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold">Your question</label>
                <textarea
                  className="form-control"
                  rows="4"
                  placeholder="Example: My dog has been scratching a lot and seems restless. Should I book a vet visit?"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
              </div>

              <button
                type="button"
                className="btn btn-dark"
                onClick={() => handleAsk()}
                disabled={isLoading || !selectedPet || !question.trim()}
              >
                {isLoading ? "Thinking..." : "Ask Assistant"}
              </button>
            </div>
          </div>
        </div>

        {reminderDraft ? (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.55)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0" style={{ borderRadius: "1.4rem" }}>
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title">Create Reminder from AI Advice</h5>
                  <button type="button" className="btn-close" onClick={() => setReminderDraft(null)} />
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Title</label>
                    <input
                      className="form-control"
                      value={reminderDraft.title}
                      onChange={(event) =>
                        setReminderDraft((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Reminder Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={reminderDraft.reminderDate}
                      onChange={(event) =>
                        setReminderDraft((current) => ({ ...current, reminderDate: event.target.value }))
                      }
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Reminder Note</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={reminderDraft.reminderNote}
                      onChange={(event) =>
                        setReminderDraft((current) => ({ ...current, reminderNote: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setReminderDraft(null)}>
                    Cancel
                  </button>
                  <button type="button" className="btn btn-dark" onClick={submitReminderDraft}>
                    Create Reminder
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}

export default AIPetAssistant;
