import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

type Organization = {
  id: number;
  name: string;
  code: string;
  isActive?: boolean;
};

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

  const [form, setForm] = useState({ name: "", code: "" });

  const loadOrganizations = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/organizations");
      setOrganizations(getOrganizations(response.data));
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? (err.response?.data?.message ?? "Unable to load organizations.")
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
    setForm({ name: "", code: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (organization: Organization) => {
    setEditingId(organization.id);
    setForm({
      name: organization.name,
      code: organization.code,
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
      };

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
    const confirmed = window.confirm(
      `Are you sure you want to delete "${organization.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(organization.id);

    try {
      await api.delete(`/organizations/${organization.id}`);
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
    <section className="p-6 md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Organization Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage organizations registered in POMS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
              setEditingId(null);
              setForm({ name: "", code: "" });
            }
            setError("");
            setSuccess("");
          }}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ Add Organization"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold md:col-span-2">
            {editingId !== null ? "Edit Organization" : "Add New Organization"}
          </h3>

          <input
            required
            maxLength={150}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Organization name *"
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            required
            maxLength={50}
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            placeholder="Organization code *"
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <div className="flex gap-3 md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : editingId !== null
                  ? "Update Organization"
                  : "Save Organization"}
            </button>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations by name or code..."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Organization</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  Loading organizations...
                </td>
              </tr>
            ) : filteredOrganizations.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No organizations found.
                </td>
              </tr>
            ) : (
              filteredOrganizations.map((organization) => (
                <tr key={organization.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {organization.name}
                  </td>
                  <td className="px-5 py-4">{organization.code}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        organization.isActive === false
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {organization.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(organization)}
                        disabled={deletingId !== null}
                        className="rounded-md bg-amber-100 px-3 py-2 font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(organization)}
                        disabled={deletingId !== null}
                        className="rounded-md bg-red-100 px-3 py-2 font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
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

      <p className="mt-4 text-sm text-slate-500">
        Showing {filteredOrganizations.length} of {organizations.length}{" "}
        organizations
      </p>
    </section>
  );
}

export default Organizations;
