import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";

const API_BASE_URL = "http://localhost:5000/api";

function AdminUsers() {
  const token = localStorage.getItem("token");
  const currentUser = JSON.parse(localStorage.getItem("user") || "null");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState("");

  const authConfig = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/users/admin/all`, authConfig);
      setUsers(res.data.users || []);
    } catch (error) {
      console.error("Unable to load users", error);
      alert(error.response?.data?.message || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "admin") {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, []);

  const handleUpdate = async (userId, payload) => {
    try {
      setUpdatingId(userId);
      const res = await axios.patch(`${API_BASE_URL}/users/admin/${userId}`, payload, authConfig);
      const updatedUser = res.data.user;

      setUsers((current) =>
        current.map((user) =>
          user._id === userId
            ? {
                ...user,
                role: updatedUser.role,
                accountStatus: updatedUser.accountStatus,
                isEmailVerified: updatedUser.isEmailVerified,
              }
            : user
        )
      );
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || "Unable to update user");
    } finally {
      setUpdatingId("");
    }
  };

  const filteredUsers = users.filter((user) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.phone?.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.accountStatus === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (currentUser?.role !== "admin") {
    return (
      <>
        <Navbar />
        <div className="container py-5 page-shell">
          <div className="page-hero-card">
            <span className="page-kicker mb-3">Admin Users</span>
            <h2 className="mb-2">User Management</h2>
            <p className="text-muted mb-0">This page is available for admins only.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="page-shell">
        <div className="container py-4 py-lg-5">
          <div className="page-hero-card mb-4">
            <span className="page-kicker">Admin Users</span>
            <h2 className="mb-2">User Management</h2>
            <p className="text-muted mb-0">
              Manage account roles and account status for users, providers, and admins.
            </p>
          </div>

          <div className="surface-panel mb-4">
            <div className="row g-2">
              <div className="col-lg-6">
                <input
                  className="form-control"
                  placeholder="Search by name, email, or phone"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="col-lg-3">
                <select className="form-select" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                  <option value="all">All roles</option>
                  <option value="user">User</option>
                  <option value="provider">Provider</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-lg-3">
                <select className="form-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <div className="surface-panel">
            {loading ? <p className="text-muted mb-0">Loading users...</p> : null}

            {!loading && !filteredUsers.length ? (
              <p className="text-muted mb-0">No users found.</p>
            ) : null}

            {!loading && filteredUsers.length ? (
              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Email Verified</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user._id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.phone || "-"}</td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={user.role}
                            disabled={updatingId === user._id}
                            onChange={(event) => handleUpdate(user._id, { role: event.target.value })}
                          >
                            <option value="user">User</option>
                            <option value="provider">Provider</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={user.accountStatus || "active"}
                            disabled={updatingId === user._id}
                            onChange={(event) => handleUpdate(user._id, { accountStatus: event.target.value })}
                          >
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-select form-select-sm"
                            value={user.isEmailVerified ? "yes" : "no"}
                            disabled={updatingId === user._id}
                            onChange={(event) =>
                              handleUpdate(user._id, { isEmailVerified: event.target.value === "yes" })
                            }
                          >
                            <option value="yes">Yes</option>
                            <option value="no">No</option>
                          </select>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

export default AdminUsers;

