import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

function OnboardingChecklist({ role, stats }) {
  const navigate = useNavigate();

  const tasks = useMemo(() => {
    if (role === "provider") {
      return [
        {
          id: "profile",
          label: "Complete profile details",
          done: Boolean(stats?.hasPhone),
          actionLabel: "Open Profile",
          action: () => navigate("/profile"),
        },
        {
          id: "services",
          label: "Create your first service",
          done: (stats?.serviceCount || 0) > 0,
          actionLabel: "Open Services",
          action: () => navigate("/services"),
        },
        {
          id: "bookings",
          label: "Review incoming bookings",
          done: (stats?.manageableBookingCount || 0) > 0,
          actionLabel: "Manage Bookings",
          action: () => navigate("/manage-bookings"),
        },
      ];
    }

    if (role === "admin") {
      return [
        {
          id: "profile",
          label: "Complete profile details",
          done: Boolean(stats?.hasPhone),
          actionLabel: "Open Profile",
          action: () => navigate("/profile"),
        },
        {
          id: "settings",
          label: "Review booking pricing settings",
          done: Boolean(stats?.visitedSettings),
          actionLabel: "Booking Settings",
          action: () => navigate("/booking-settings"),
        },
        {
          id: "manage",
          label: "Review platform bookings",
          done: (stats?.manageableBookingCount || 0) > 0,
          actionLabel: "Manage Bookings",
          action: () => navigate("/manage-bookings"),
        },
      ];
    }

    return [
      {
        id: "profile",
        label: "Complete profile details",
        done: Boolean(stats?.hasPhone),
        actionLabel: "Open Profile",
        action: () => navigate("/profile"),
      },
      {
        id: "pet",
        label: "Add your first pet",
        done: (stats?.petCount || 0) > 0,
        actionLabel: "My Pets",
        action: () => navigate("/pets"),
      },
      {
        id: "booking",
        label: "Make your first booking",
        done: (stats?.myBookingCount || 0) > 0,
        actionLabel: "Book Service",
        action: () => navigate("/services"),
      },
      {
        id: "assistant",
        label: "Ask the AI assistant a question",
        done: Boolean(stats?.usedAssistant),
        actionLabel: "Open AI Assistant",
        action: () => navigate("/ai-pet-assistant"),
      },
    ];
  }, [navigate, role, stats]);

  const completedCount = tasks.filter((task) => task.done).length;

  return (
    <div className="card border-0 shadow-sm mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-3">
          <div>
            <h4 className="mb-1">Onboarding Checklist</h4>
            <p className="text-muted mb-0 text-capitalize">
              Role: {role} | Completed {completedCount}/{tasks.length}
            </p>
          </div>
          <span className="badge text-bg-primary fs-6">{Math.round((completedCount / tasks.length) * 100)}%</span>
        </div>

        <div className="d-grid gap-2">
          {tasks.map((task) => (
            <div key={task.id} className="d-flex justify-content-between align-items-center border rounded p-2">
              <div className="d-flex align-items-center gap-2">
                <span className={`badge ${task.done ? "bg-success" : "bg-secondary"}`}>
                  {task.done ? "Done" : "Pending"}
                </span>
                <span>{task.label}</span>
              </div>
              {!task.done ? (
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={task.action}>
                  {task.actionLabel}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default OnboardingChecklist;
