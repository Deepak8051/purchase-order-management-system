import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "../services/api";

type Product = {
  id: number;
  name: string;
  sku: string;
  description?: string;
  unitPrice: number;
  unit?: string;
  isActive?: boolean;
};

const emptyForm = {
  name: "",
  sku: "",
  description: "",
  unitPrice: "",
  unit: "PCS",
};

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({ ...emptyForm });
  const formRef = useRef<HTMLFormElement>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (!axios.isAxiosError(err)) {
      return "An unexpected error occurred.";
    }

    const message = err.response?.data?.message;

    return Array.isArray(message) ? message.join(", ") : (message ?? fallback);
  };

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/products");
      const data = response.data;

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setProducts(records);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to load products."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);

    setForm({
      name: product.name ?? "",
      sku: product.sku ?? "",
      description: product.description ?? "",
      unitPrice: String(product.unitPrice ?? ""),
      unit: product.unit ?? "PCS",
    });

    setShowForm(true);
    setError("");
    setSuccess("");
  };

  useEffect(() => {
    if (showForm) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showForm, editingId]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const price = Number(form.unitPrice);

    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      form.unitPrice.trim() === "" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(
        "Enter a product name, SKU, and a valid non-negative unit price.",
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      description: form.description.trim() || undefined,
      unitPrice: price,
      unit: form.unit.trim() || "PCS",
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.patch(`/products/${editingId}`, payload);
        setSuccess("Product updated successfully.");
      } else {
        await api.post("/products", payload);
        setSuccess("Product created successfully.");
      }

      resetForm();
      await loadProducts();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          `Unable to ${editingId !== null ? "update" : "create"} product.`,
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete product "${product.name}"?`,
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setDeletingId(product.id);

    try {
      await api.delete(`/products/${product.id}`);

      if (editingId === product.id) {
        resetForm();
      }

      setSuccess("Product deleted successfully.");
      await loadProducts();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to delete product."));
    } finally {
      setDeletingId(null);
    }
  };

  const filteredProducts = products.filter((product) =>
    [product.name, product.sku, product.description ?? "", product.unit ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(price) || 0);

  const inputClass =
    "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

  return (
    <section className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Inventory
          </p>

          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            Product Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage your product catalogue, pricing, and units.
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
          {showForm ? "Close Form" : "Add Product"}
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
          ref={formRef}
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">
              {editingId !== null ? "Edit Product" : "Add New Product"}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Enter the product details below.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Product name <span className="text-red-500">*</span>
              </span>

              <input
                required
                maxLength={150}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter product name"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                SKU <span className="text-red-500">*</span>
              </span>

              <input
                required
                maxLength={100}
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                placeholder="e.g. PROD-001"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Unit price (₹) <span className="text-red-500">*</span>
              </span>

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) =>
                  setForm({ ...form, unitPrice: e.target.value })
                }
                placeholder="Enter unit price"
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Unit
              </span>

              <input
                maxLength={30}
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="e.g. PCS, KG, BOX"
                className={inputClass}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </span>

              <textarea
                rows={3}
                maxLength={1000}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the product..."
                className={`${inputClass} resize-y`}
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
                  : "Create Product"}
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

      {/* Product directory */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Product Catalogue
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Search and manage your registered products.
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              ⌕
            </span>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              aria-label="Search products"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-5 py-3 sm:px-6">
          <span className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">
              {filteredProducts.length}
            </strong>{" "}
            products found
          </span>

          <span className="text-xs text-slate-400">
            {loading ? "Refreshing records..." : "Product records"}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-y border-slate-200 bg-white text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Product</th>
                <th className="px-6 py-4 font-semibold">SKU</th>
                <th className="px-6 py-4 font-semibold">Unit</th>
                <th className="px-6 py-4 font-semibold">Unit price</th>
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
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <p className="text-base font-semibold text-slate-700">
                      No products found
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Try another search or add a new product.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                          {product.name.trim().charAt(0).toUpperCase() || "P"}
                        </div>

                        <div className="max-w-xs">
                          <p className="font-semibold text-slate-900">
                            {product.name}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {product.description || `Product ID: ${product.id}`}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-5">
                      <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-medium text-slate-700">
                        {product.sku}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-slate-600">
                      {product.unit || "—"}
                    </td>

                    <td className="px-6 py-5 font-semibold tabular-nums text-slate-900">
                      {formatPrice(product.unitPrice)}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
                          product.isActive === false
                            ? "bg-red-50 text-red-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            product.isActive === false
                              ? "bg-red-500"
                              : "bg-emerald-500"
                          }`}
                        />

                        {product.isActive === false ? "Inactive" : "Active"}
                      </span>
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(product)}
                          disabled={deletingId !== null || saving}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleDelete(product)}
                          disabled={deletingId !== null || saving}
                          className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          {deletingId === product.id ? "Deleting..." : "Delete"}
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
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </div>
    </section>
  );
}

export default Products;
