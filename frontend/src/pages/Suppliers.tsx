import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

type Supplier = {
  id: number;
  name: string;
  code: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean;
};

const emptyForm = {
  name: "",
  code: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
};

function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (!axios.isAxiosError(err)) return "An unexpected error occurred.";

    const message = err.response?.data?.message;
    return Array.isArray(message) ? message.join(", ") : (message ?? fallback);
  };

  const loadSuppliers = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/suppliers");
      const data = response.data;

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setSuppliers(records);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to load suppliers."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name ?? "",
      code: supplier.code ?? "",
      contactPerson: supplier.contactPerson ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      address: supplier.address ?? "",
    });

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
      contactPerson: form.contactPerson.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
    };

    if (!payload.name || !payload.code) {
      setError("Supplier name and code are required.");
      return;
    }

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.patch(`/suppliers/${editingId}`, payload);
        setSuccess("Supplier updated successfully.");
      } else {
        await api.post("/suppliers", payload);
        setSuccess("Supplier created successfully.");
      }

      resetForm();
      await loadSuppliers();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          `Unable to ${editingId !== null ? "update" : "create"} supplier.`,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete supplier "${supplier.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(supplier.id);

    try {
      await api.delete(`/suppliers/${supplier.id}`);

      if (editingId === supplier.id) resetForm();

      setSuccess("Supplier deleted successfully.");
      await loadSuppliers();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to delete supplier."));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) =>
    [
      supplier.name,
      supplier.code,
      supplier.email ?? "",
      supplier.contactPerson ?? "",
      supplier.phone ?? "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Procurement
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Supplier Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage supplier details and contact information.
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
          {showForm ? "Close Form" : "Add Supplier"}
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
              {editingId !== null ? "Edit Supplier" : "Add New Supplier"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Fields marked with * are required.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Supplier name <span className="text-red-500">*</span>
              </span>
              <input
                required
                maxLength={150}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter supplier name"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Supplier code <span className="text-red-500">*</span>
              </span>
              <input
                required
                maxLength={50}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. SUP-001"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Contact person
              </span>
              <input
                maxLength={150}
                value={form.contactPerson}
                onChange={(e) =>
                  setForm({ ...form, contactPerson: e.target.value })
                }
                placeholder="Enter contact person"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Email address
              </span>
              <input
                type="email"
                maxLength={150}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="supplier@example.com"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Phone number
              </span>
              <input
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Enter phone number"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Address
              </span>
              <input
                maxLength={500}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Enter supplier address"
                className={inputClass}
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
                  : "Create Supplier"}
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

      {/* Supplier directory */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Supplier Directory
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Search and manage your registered suppliers.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search suppliers..."
              aria-label="Search suppliers"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-5 py-3 sm:px-6">
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">
              {filteredSuppliers.length}
            </strong>{" "}
            suppliers found
          </span>
          <span className="text-xs text-slate-400">
            {loading ? "Refreshing records..." : "Supplier records"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Supplier</th>
                <th className="px-6 py-4 font-semibold">Code</th>
                <th className="px-6 py-4 font-semibold">Contact person</th>
                <th className="px-6 py-4 font-semibold">Contact details</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-14 text-center text-slate-500"
                  >
                    Loading suppliers...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="text-base font-semibold text-slate-700">
                      No suppliers found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or add a new supplier.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                          {supplier.name.trim().charAt(0).toUpperCase() || "S"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {supplier.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Supplier ID: {supplier.id}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-medium text-slate-700">
                        {supplier.code}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-slate-600">
                      {supplier.contactPerson || "—"}
                    </td>

                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <p className="text-slate-700">
                          {supplier.email || "—"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {supplier.phone || "No phone"}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          supplier.isActive === false
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            supplier.isActive === false
                              ? "bg-red-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        {supplier.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(supplier)}
                          disabled={deletingId !== null || saving}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(supplier)}
                          disabled={deletingId !== null || saving}
                          className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === supplier.id
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
          Showing {filteredSuppliers.length} of {suppliers.length} suppliers
        </div>
      </div>
    </section>
  );
}

export default Suppliers;
