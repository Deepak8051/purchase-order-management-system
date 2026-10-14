import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

type Organization = {
  id: number;
  name: string;
  code: string;
  isActive?: boolean;
};

const emptyForm = { name: "", code: "" };

function getOrganizations(data: unknown): Organization[] {
  if (Array.isArray(data)) return data as Organization[];

  if (data && typeof data === "object") {
    const result = data as { data?: unknown; items?: unknown };
    if (Array.isArray(result.data)) return result.data as Organization[];
    if (Array.isArray(result.items)) return result.items as Organization[];
  }

  return [];
}

function Organizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ ...emptyForm });

  const loadOrganizations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/organizations");
      setOrganizations(getOrganizations(response.data));
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? Array.isArray(err.response?.data?.message)
            ? err.response.data.message.join(", ")
            : (err.response?.data?.message ?? "Unable to load organizations.")
          : "An unexpected error occurred.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrganizations();
  }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (organization: Organization) => {
    setEditingId(organization.id);
    setForm({ name: organization.name, code: organization.code });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
    };

    if (!payload.name || !payload.code) {
      setError("Organization name and code are required.");
      return;
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.patch(`/organizations/${editingId}`, payload);
        setSuccess("Organization updated successfully.");
      } else {
        await api.post("/organizations", payload);
        setSuccess("Organization created successfully.");
      }

      resetForm();
      await loadOrganizations();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message.join(", ")
            : (message ?? "Unable to save organization."),
        );
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (organization: Organization) => {
    if (
      !window.confirm(`Are you sure you want to delete "${organization.name}"?`)
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingId(organization.id);

    try {
      await api.delete(`/organizations/${organization.id}`);

      if (editingId === organization.id) resetForm();

      setSuccess("Organization deleted successfully.");
      await loadOrganizations();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(
          Array.isArray(message)
            ? message.join(", ")
            : (message ?? "Unable to delete organization."),
        );
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const filteredOrganizations = organizations.filter((organization) =>
    `${organization.name} ${organization.code}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Administration
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Organizations
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage organizations registered in your procurement workspace.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setForm({ ...emptyForm });
              setEditingId(null);
              setShowForm(true);
            }
            setError("");
            setSuccess("");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          <span className="text-lg leading-none">{showForm ? "×" : "+"}</span>
          {showForm ? "Close Form" : "Add Organization"}
        </button>
      </div>

      {/* Feedback messages */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span className="font-bold">!</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {success}
        </div>
      )}

      {/* Create/edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId !== null ? "Edit Organization" : "Create Organization"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Enter the organization details below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Organization name <span className="text-red-500">*</span>
              </span>
              <input
                required
                maxLength={150}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter organization name"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Organization code <span className="text-red-500">*</span>
              </span>
              <input
                required
                maxLength={50}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. ORG-001"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Save Changes"
                  : "Create Organization"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search and list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Organization Directory
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Search and manage your registered organizations.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              aria-label="Search organizations"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-5 py-3 sm:px-6">
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">
              {filteredOrganizations.length}
            </strong>{" "}
            organizations found
          </span>
          <span className="text-xs text-slate-400">
            {loading ? "Refreshing records..." : "Organization records"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Organization</th>
                <th className="px-6 py-4 font-semibold">Organization code</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-14 text-center text-slate-500"
                  >
                    Loading organizations...
                  </td>
                </tr>
              ) : filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-14 text-center">
                    <div className="text-base font-semibold text-slate-700">
                      No organizations found
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or create a new organization.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((organization) => (
                  <tr
                    key={organization.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                          {organization.name.trim().charAt(0).toUpperCase() ||
                            "O"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {organization.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Organization ID: {organization.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-medium text-slate-700">
                        {organization.code}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          organization.isActive === false
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            organization.isActive === false
                              ? "bg-red-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {organization.isActive === false
                          ? "Inactive"
                          : "Active"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(organization)}
                          disabled={deletingId !== null || saving}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(organization)}
                          disabled={deletingId !== null || saving}
                          className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === organization.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500 sm:px-6">
          Showing {filteredOrganizations.length} of {organizations.length}{" "}
          organizations
        </div>
      </div>
    </section>
  );
}

export default Organizations;
