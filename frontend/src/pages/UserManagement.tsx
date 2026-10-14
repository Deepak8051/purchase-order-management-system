import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

type UserRole = "HQ_SUPER_ADMIN" | "OUTLET_SUPER_ADMIN" | "ORG_ADMIN" | "USER";
type ManagedUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organizationId: number | null;
  organization: string;
  dateOfBirth: string;
  active: boolean;
};
type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  organizationId?: number | null;
  organization?: { name?: string } | null;
  dateOfBirth?: string | null;
  isActive: boolean;
};
type UserForm = {
  name: string;
  email: string;
  dateOfBirth: string;
  role: UserRole;
  organizationId: string;
};
type CreateForm = UserForm & { password: string; confirmPassword: string };

const roles: UserRole[] = [
  "USER",
  "ORG_ADMIN",
  "OUTLET_SUPER_ADMIN",
  "HQ_SUPER_ADMIN",
];
const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const emptyCreateForm: CreateForm = {
  name: "",
  email: "",
  dateOfBirth: "",
  role: "USER",
  organizationId: "",
  password: "",
  confirmPassword: "",
};
const emptyEditForm: UserForm = {
  name: "",
  email: "",
  dateOfBirth: "",
  role: "USER",
  organizationId: "",
};
const roleStyles: Record<UserRole, string> = {
  HQ_SUPER_ADMIN: "bg-blue-100 text-blue-800",
  OUTLET_SUPER_ADMIN: "bg-purple-100 text-purple-800",
  ORG_ADMIN: "bg-amber-100 text-amber-800",
  USER: "bg-emerald-100 text-emerald-800",
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
    if (error.response?.status === 401)
      return "Your session has expired. Please log in again.";
    if (error.response?.status === 403)
      return "You do not have permission to perform this action.";
    if (!error.response)
      return "Cannot connect to the backend. Check that the server is running.";
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function mapApiUser(user: ApiUser): ManagedUser {
  const organizationId =
    user.organizationId == null ? null : Number(user.organizationId);
  return {
    id: Number(user.id),
    name: user.name ?? "",
    email: user.email ?? "",
    role: user.role,
    organizationId,
    organization:
      user.organization?.name ??
      (organizationId == null ? "-" : `Organization ${organizationId}`),
    dateOfBirth: user.dateOfBirth?.slice(0, 10) ?? "",
    active: Boolean(user.isActive),
  };
}

function calculateAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(dob.getTime()) || dob > new Date()) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  if (
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())
  )
    age--;
  return age;
}

function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [createForm, setCreateForm] = useState<CreateForm>({
    ...emptyCreateForm,
  });
  const [editForm, setEditForm] = useState<UserForm>({ ...emptyEditForm });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const currentRole = (
    localStorage.getItem("userRole") ?? ""
  ).toUpperCase() as UserRole;
  const isHqAdmin = currentRole === "HQ_SUPER_ADMIN";
  const allowedRoles: UserRole[] = isHqAdmin ? roles : ["USER"];

  const loadUsers = useCallback(async (searchKey = "") => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<ApiUser[]>("/users", {
        params: searchKey.trim() ? { searchKey: searchKey.trim() } : undefined,
      });
      if (!Array.isArray(response.data))
        throw new Error("Unexpected response from GET /users.");
      setUsers(response.data.map(mapApiUser));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, loadUsers]);

  const updateCreateField = (field: keyof CreateForm, value: string) =>
    setCreateForm((previous) => ({ ...previous, [field]: value }));
  const updateEditField = (field: keyof UserForm, value: string) =>
    setEditForm((previous) => ({ ...previous, [field]: value }));
  const resetMessages = () => {
    setMessage("");
    setError("");
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    const name = createForm.name.trim();
    const email = createForm.email.trim().toLowerCase();
    const orgText = createForm.organizationId.trim();
    if (!name || !email) return setError("Name and email are required.");
    if (createForm.password.length < 8 || createForm.password.length > 72)
      return setError("Password must contain between 8 and 72 characters.");
    if (createForm.password !== createForm.confirmPassword)
      return setError("Password and confirm password do not match.");
    if (
      !createForm.dateOfBirth ||
      createForm.dateOfBirth > new Date().toISOString().slice(0, 10)
    )
      return setError("Enter a valid date of birth.");
    if (!allowedRoles.includes(createForm.role))
      return setError("You are not permitted to assign this role.");
    let organizationId: number | null = null;
    if (orgText) {
      organizationId = Number(orgText);
      if (!Number.isInteger(organizationId) || organizationId <= 0)
        return setError("Enter a valid organization ID.");
    } else if (!isHqAdmin) return setError("Organization ID is required.");
    setSaving(true);
    try {
      await api.post("/users", {
        name,
        email,
        password: createForm.password,
        role: createForm.role,
        organizationId,
        dateOfBirth: createForm.dateOfBirth,
      });
      setShowCreateForm(false);
      setCreateForm({ ...emptyCreateForm });
      setMessage("User created successfully.");
      await loadUsers(search);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user: ManagedUser) => {
    resetMessages();
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      dateOfBirth: user.dateOfBirth,
      role: user.role,
      organizationId:
        user.organizationId == null ? "" : String(user.organizationId),
    });
  };

  const handleEditUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();
    if (!editingUser) return;
    const orgText = editForm.organizationId.trim();
    let organizationId: number | null = null;
    if (orgText) {
      organizationId = Number(orgText);
      if (!Number.isInteger(organizationId) || organizationId <= 0)
        return setError("Enter a valid organization ID.");
    }
    if (!allowedRoles.includes(editForm.role))
      return setError("You are not permitted to assign this role.");
    if (
      editForm.dateOfBirth &&
      editForm.dateOfBirth > new Date().toISOString().slice(0, 10)
    )
      return setError("Date of birth cannot be in the future.");
    setSaving(true);
    try {
      await api.patch(`/users/${editingUser.id}`, {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        dateOfBirth: editForm.dateOfBirth || null,
        role: editForm.role,
        organizationId,
      });
      setEditingUser(null);
      setMessage("User updated successfully.");
      await loadUsers(search);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    resetMessages();
    if (user.id === Number(localStorage.getItem("userId")) && user.active) {
      setError("You cannot deactivate your own account.");
      return;
    }
    if (
      !window.confirm(
        `${user.active ? "Deactivate" : "Activate"} ${user.name}?`,
      )
    )
      return;
    setSaving(true);
    try {
      await api.patch(`/users/${user.id}/status`, { isActive: !user.active });
      setMessage(
        `User ${user.active ? "deactivated" : "activated"} successfully.`,
      );
      await loadUsers(search);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    resetMessages();
    if (newPassword.length < 8 || newPassword.length > 72)
      return setError("New password must contain between 8 and 72 characters.");
    if (newPassword !== confirmNewPassword)
      return setError("New password and confirmation do not match.");
    setSaving(true);
    try {
      await api.patch("/users/change-password", {
        currentPassword,
        newPassword,
      });
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setMessage("Password changed successfully.");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const closeCreate = () => {
    if (saving) return;
    setShowCreateForm(false);
    setCreateForm({ ...emptyCreateForm });
    setError("");
  };
  const closeEdit = () => {
    if (saving) return;
    setEditingUser(null);
    setError("");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage users, roles, login access and passwords.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex w-full max-w-xl items-stretch gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or role..."
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void loadUsers(search);
                }
              }}
            />

            <button
              type="button"
              onClick={() => void loadUsers(search)}
              disabled={loading}
              className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setShowPasswordForm(true);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Change Password
          </button>
          <button
            type="button"
            onClick={() => {
              resetMessages();
              setCreateForm({ ...emptyCreateForm });
              setShowCreateForm(true);
            }}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Create User
          </button>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"
        >
          {message}
        </div>
      )}
      {error && !showCreateForm && !editingUser && !showPasswordForm && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadUsers(search)}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr>
              {[
                "#",
                "Name",
                "Email",
                "Role",
                "Organization",
                "Status",
                "Actions",
              ].map((heading) => (
                <th key={heading} className="px-4 py-3 font-semibold">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  Loading users...
                </td>
              </tr>
            )}
            {!loading &&
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-4">{user.id}</td>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {user.name}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{user.email}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-md px-2 py-1 text-xs font-semibold ${roleStyles[user.role] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">{user.organization}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.active ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                    >
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        disabled={saving}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(user)}
                        disabled={
                          saving ||
                          (user.role === "HQ_SUPER_ADMIN" && !isHqAdmin)
                        }
                        className={`rounded-md px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${user.active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {!loading && users.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  {search.trim()
                    ? "No users match your search."
                    : "No users found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="text-sm text-slate-500">
        Showing {users.length} {users.length === 1 ? "user" : "users"}
        {search.trim() ? ` matching “${search.trim()}”` : ""}
      </div>

      {(showCreateForm || editingUser || showPasswordForm) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4">
          <div className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                {showCreateForm
                  ? "Create User"
                  : editingUser
                    ? `Edit User — ${editingUser.name}`
                    : "Change My Password"}
              </h3>
              <button
                type="button"
                aria-label="Close form"
                disabled={saving}
                onClick={() => {
                  if (showCreateForm) closeCreate();
                  else if (editingUser) closeEdit();
                  else {
                    setShowPasswordForm(false);
                    setError("");
                  }
                }}
                className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {showPasswordForm ? (
              <form onSubmit={handleChangePassword} className="space-y-5 p-6">
                <label className="block text-sm font-medium">
                  Current password
                  <input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-medium">
                  New password
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block text-sm font-medium">
                  Confirm new password
                  <input
                    required
                    type="password"
                    minLength={8}
                    maxLength={72}
                    autoComplete="new-password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={inputClass}
                  />
                </label>
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      setShowPasswordForm(false);
                      setError("");
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Change Password"}
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={showCreateForm ? handleCreateUser : handleEditUser}
                className="space-y-5 p-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Full Name *
                    <input
                      required
                      maxLength={100}
                      value={showCreateForm ? createForm.name : editForm.name}
                      onChange={(e) =>
                        showCreateForm
                          ? updateCreateField("name", e.target.value)
                          : updateEditField("name", e.target.value)
                      }
                      className={inputClass}
                      placeholder="John Doe"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Role *
                    <select
                      required
                      value={showCreateForm ? createForm.role : editForm.role}
                      onChange={(e) =>
                        showCreateForm
                          ? updateCreateField("role", e.target.value)
                          : updateEditField("role", e.target.value)
                      }
                      className={inputClass}
                    >
                      {allowedRoles.map((role) => (
                        <option key={role} value={role}>
                          {role.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    Email Address *
                    <input
                      required
                      type="email"
                      maxLength={150}
                      value={showCreateForm ? createForm.email : editForm.email}
                      onChange={(e) =>
                        showCreateForm
                          ? updateCreateField("email", e.target.value)
                          : updateEditField("email", e.target.value)
                      }
                      className={inputClass}
                      placeholder="john@example.com"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Organization ID
                    <input
                      type="number"
                      min={1}
                      step={1}
                      required={!isHqAdmin}
                      value={
                        showCreateForm
                          ? createForm.organizationId
                          : editForm.organizationId
                      }
                      onChange={(e) =>
                        showCreateForm
                          ? updateCreateField("organizationId", e.target.value)
                          : updateEditField("organizationId", e.target.value)
                      }
                      className={inputClass}
                      placeholder={
                        isHqAdmin
                          ? "Optional for HQ-level account"
                          : "Your organization ID"
                      }
                    />
                    <span className="mt-1 block text-xs text-slate-500">
                      Enter an existing organization ID. Non-HQ admins must stay
                      within their organization.
                    </span>
                  </label>
                  <label className="text-sm font-medium">
                    Date of Birth{showCreateForm ? " *" : ""}
                    <input
                      required={showCreateForm}
                      type="date"
                      max={new Date().toISOString().slice(0, 10)}
                      value={
                        showCreateForm
                          ? createForm.dateOfBirth
                          : editForm.dateOfBirth
                      }
                      onChange={(e) =>
                        showCreateForm
                          ? updateCreateField("dateOfBirth", e.target.value)
                          : updateEditField("dateOfBirth", e.target.value)
                      }
                      className={inputClass}
                    />
                    {(showCreateForm
                      ? createForm.dateOfBirth
                      : editForm.dateOfBirth) && (
                      <span className="mt-1 block text-xs text-slate-500">
                        Age:{" "}
                        {calculateAge(
                          showCreateForm
                            ? createForm.dateOfBirth
                            : editForm.dateOfBirth,
                        ) ?? "Invalid date"}
                      </span>
                    )}
                  </label>
                  {showCreateForm && (
                    <>
                      <label className="text-sm font-medium">
                        Password *
                        <input
                          required
                          type="password"
                          minLength={8}
                          maxLength={72}
                          autoComplete="new-password"
                          value={createForm.password}
                          onChange={(e) =>
                            updateCreateField("password", e.target.value)
                          }
                          className={inputClass}
                          placeholder="At least 8 characters"
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Confirm Password *
                        <input
                          required
                          type="password"
                          minLength={8}
                          maxLength={72}
                          autoComplete="new-password"
                          value={createForm.confirmPassword}
                          onChange={(e) =>
                            updateCreateField("confirmPassword", e.target.value)
                          }
                          className={inputClass}
                        />
                      </label>
                    </>
                  )}
                </div>
                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      showCreateForm ? closeCreate() : closeEdit()
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : showCreateForm
                        ? "Create User"
                        : "Save Changes"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default UserManagement;
