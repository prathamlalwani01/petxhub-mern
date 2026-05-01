import { Link } from "react-router-dom";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (token) {
    return children;
  }

  return (
    <div className="guest-mode-shell">
      <div className="guest-mode-banner">
        Visitor mode: you can browse this page, but actions are locked. <Link to="/login">Login</Link> or{" "}
        <Link to="/register">Signup</Link> to use all features.
      </div>
      <div className="guest-mode-content">{children}</div>
    </div>
  );
}

export default ProtectedRoute;
