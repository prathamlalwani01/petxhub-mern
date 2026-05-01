import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_BASE_URL = "http://localhost:5000/api";

const formatDateTime = (value) => new Date(value).toLocaleString();

function Notifications() {
  const token = localStorage.getItem("token");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/notifications`, authConfig);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (error) {
      console.error("Unable to load notifications", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const intervalId = window.setInterval(fetchNotifications, 15000);
    window.addEventListener("focus", fetchNotifications);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", fetchNotifications);
    };
  }, [authConfig]);

  const filteredNotifications = notifications.filter((notification) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      notification.title?.toLowerCase().includes(normalizedSearch) ||
      notification.message?.toLowerCase().includes(normalizedSearch) ||
      notification.type?.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === "all" || notification.status === statusFilter;
    const matchesRead =
      readFilter === "all" ||
      (readFilter === "read" && notification.isRead) ||
      (readFilter === "unread" && !notification.isRead);

    return matchesSearch && matchesStatus && matchesRead;
  });

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/${notificationId}/read`, {}, authConfig);
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) =>
          notification._id === notificationId
            ? { ...notification, isRead: true, readAt: new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount((currentCount) => Math.max(0, currentCount - 1));
    } catch (error) {
      alert(error.response?.data?.message || "Unable to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/notifications/read-all`, {}, authConfig);
      setNotifications((currentNotifications) =>
        currentNotifications.map((notification) => ({
          ...notification,
          isRead: true,
          readAt: notification.readAt || new Date().toISOString()
        }))
      );
      setUnreadCount(0);
    } catch (error) {
      alert(error.response?.data?.message || "Unable to mark all notifications as read");
    }
  };

  return (
    <>
      <Navbar />

      <div className="page-shell">
      <div className="container py-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div className="page-hero-card flex-grow-1">
            <span className="page-kicker">Live updates</span>
            <h2 className="mb-1">Notification Center</h2>
            <p className="text-muted mb-0">
              Stay up to date with reminders, bookings, and adoption activity in one place.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-outline-primary align-self-start"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>
        </div>

        <div className="surface-panel mb-4">
            <div className="row g-3 align-items-end">
              <div className="col-md-4">
                <p className="text-muted mb-2">Unread notifications</p>
                <h3 className="mb-0">{unreadCount}</h3>
              </div>
              <div className="col-md-4">
                <label className="form-label">Search</label>
                <input
                  className="form-control"
                  placeholder="Search title or message"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="overdue">Overdue</option>
                  <option value="due-soon">Due Soon</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Read State</label>
                <select
                  className="form-select"
                  value={readFilter}
                  onChange={(event) => setReadFilter(event.target.value)}
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>
            </div>
        </div>

        <div className="surface-panel">
            {loading ? (
              <p className="text-muted mb-0">Loading notifications...</p>
            ) : filteredNotifications.length === 0 ? (
              <p className="text-muted mb-0">No notifications yet.</p>
            ) : (
              <div className="d-grid gap-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-card ${notification.isRead ? "notification-card-read" : ""}`}
                  >
                    <div className="d-flex flex-column flex-md-row justify-content-between gap-2 mb-2">
                      <div>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h5 className="mb-0">{notification.title}</h5>
                          {!notification.isRead ? <span className="badge bg-primary">New</span> : null}
                        </div>
                        <p className="mb-1">{notification.message}</p>
                        <small className="text-muted">{formatDateTime(notification.createdAt)}</small>
                      </div>
                      <span className={`badge align-self-start ${
                        notification.status === "overdue" || notification.status === "cancelled" || notification.status === "rejected"
                          ? "bg-danger"
                          : notification.status === "due-soon" || notification.status === "pending"
                            ? "bg-warning text-dark"
                            : "bg-success"
                      }`}>
                        {notification.status}
                      </span>
                    </div>

                    <div className="d-flex gap-2 flex-wrap">
                      <span className="badge text-bg-light border text-capitalize">
                        {notification.type || "general"}
                      </span>
                      <Link
                        to={notification.actionPath}
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification._id);
                          }
                        }}
                      >
                        Open
                      </Link>
                      {!notification.isRead ? (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => handleMarkAsRead(notification._id)}
                        >
                          Mark as read
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
      </div>
    </>
  );
}

export default Notifications;
