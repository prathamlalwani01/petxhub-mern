import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_BASE_URL = "http://localhost:5000/api";

function AdminContactMessages() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const fetchMessages = async () => {
    try {
      setError("");
      const res = await axios.get(`${API_BASE_URL}/contact`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessages(res.data.messages || []);
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || "Unable to load contact messages.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleStatusChange = async (messageId, status) => {
    try {
      setUpdatingId(messageId);
      await axios.patch(
        `${API_BASE_URL}/contact/${messageId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setMessages((current) =>
        current.map((message) =>
          message._id === messageId ? { ...message, status } : message
        )
      );
    } catch (updateError) {
      setError(updateError.response?.data?.message || "Unable to update message status.");
    } finally {
      setUpdatingId("");
    }
  };

  if (user?.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="page-hero-card">
            <span className="page-kicker mb-3">Admin Inbox</span>
            <h2 className="mb-2">Contact Messages</h2>
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
          <span className="page-kicker mb-3">Admin Inbox</span>
          <h2 className="mb-2">Contact Messages</h2>
          <p className="text-muted mb-0">
            Review incoming contact submissions and keep their resolution status updated.
          </p>
        </div>

        <div className="surface-panel">
          {isLoading ? <p className="text-muted mb-0">Loading messages...</p> : null}
          {error ? <p className="text-danger mb-3">{error}</p> : null}

          {!isLoading && !messages.length ? (
            <p className="text-muted mb-0">No contact messages yet.</p>
          ) : null}

          {!isLoading && messages.length ? (
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Message</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((message) => (
                    <tr key={message._id}>
                      <td>{message.name}</td>
                      <td>{message.email}</td>
                      <td style={{ minWidth: "260px" }}>{message.message}</td>
                      <td>{new Date(message.createdAt).toLocaleString("en-IN")}</td>
                      <td>
                        <select
                          className="form-select form-select-sm"
                          value={message.status}
                          disabled={updatingId === message._id}
                          onChange={(event) => handleStatusChange(message._id, event.target.value)}
                        >
                          <option value="new">New</option>
                          <option value="in-progress">In Progress</option>
                          <option value="reviewed">Reviewed</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default AdminContactMessages;

