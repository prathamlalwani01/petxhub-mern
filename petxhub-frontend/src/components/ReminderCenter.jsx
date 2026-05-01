import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const STORAGE_PREFIX = "petxhub-reminder-notified";

const formatReminderMessage = (reminder) => {
  if (reminder.daysUntilReminder < 0) {
    const overdueDays = Math.abs(reminder.daysUntilReminder);
    return `${reminder.petName}: ${reminder.title} is overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}.`;
  }

  if (reminder.daysUntilReminder === 0) {
    return `${reminder.petName}: ${reminder.title} is due today.`;
  }

  return `${reminder.petName}: ${reminder.title} is due in ${reminder.daysUntilReminder} day${reminder.daysUntilReminder === 1 ? "" : "s"}.`;
};

function ReminderCenter() {
  const token = localStorage.getItem("token");
  const [reminders, setReminders] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  const authConfig = useMemo(() => ({
    headers: { Authorization: `Bearer ${token}` }
  }), [token]);

  useEffect(() => {
    const fetchReminders = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/health/reminders/all`, authConfig);
        const urgentReminders = (res.data.reminders || []).filter(
          (reminder) =>
            (reminder.reminderStatus === "overdue" || reminder.reminderStatus === "due-soon") &&
            reminder.reminderChannels?.inApp
        );

        setReminders(urgentReminders);
      } catch (error) {
        console.error("Unable to load reminder center", error);
      }
    };

    fetchReminders();
  }, [authConfig]);

  useEffect(() => {
    if (dismissed || reminders.length === 0 || typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    const sendBrowserNotifications = async () => {
      const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;

      if (permission !== "granted") {
        return;
      }

      const todayKey = new Date().toISOString().split("T")[0];

      reminders
        .filter((reminder) => reminder.reminderChannels?.browser)
        .forEach((reminder) => {
          const storageKey = `${STORAGE_PREFIX}-${todayKey}-${reminder._id}`;

          if (window.localStorage.getItem(storageKey)) {
            return;
          }

          new Notification("PetxHub Reminder", {
            body: formatReminderMessage(reminder)
          });

          window.localStorage.setItem(storageKey, "sent");
        });
    };

    sendBrowserNotifications();
  }, [dismissed, reminders]);

  if (dismissed || reminders.length === 0) {
    return null;
  }

  return (
    <div className="card border-warning shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
          <div>
            <h5 className="mb-1">Reminder Center</h5>
            <p className="text-muted mb-0">
              Vaccination and care reminders needing attention right now.
            </p>
          </div>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={() => setDismissed(true)}
          />
        </div>

        <div className="d-grid gap-2">
          {reminders.slice(0, 5).map((reminder) => (
            <div key={reminder._id} className="rounded border bg-light p-3">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div>
                  <h6 className="mb-1">{reminder.title}</h6>
                  <p className="mb-1">{formatReminderMessage(reminder)}</p>
                  <small className="text-muted">
                    Reminder date: {new Date(reminder.reminderDate).toDateString()}
                  </small>
                </div>
                <span className={`badge ${reminder.reminderStatus === "overdue" ? "bg-danger" : "bg-warning text-dark"}`}>
                  {reminder.reminderStatus === "overdue" ? "Overdue" : "Due soon"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReminderCenter;
