import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

type Product = {
  id: number;
  name: string;
  sku: string;
  description?: string;
  unitPrice: string | number;
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [form, setForm] = useState({ ...emptyForm });

  const loadProducts = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/products");
      const data = response.data;

      const records: Product[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setProducts(records);
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? Array.isArray(err.response?.data?.message)
            ? err.response.data.message.join(", ")
            : (err.response?.data?.message ?? "Unable to load products.")
          : "An unexpected error occurred.",
      );
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const price = Number(form.unitPrice);

    if (!Number.isFinite(price) || price <= 0) {
      setError("Unit price must be greater than zero.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim() || undefined,
        unitPrice: price,
        unit: form.unit.trim() || "PCS",
      };

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
        axios.isAxiosError(err)
          ? Array.isArray(err.response?.data?.message)
            ? err.response.data.message.join(", ")
            : (err.response?.data?.message ??
              `Unable to ${editingId !== null ? "update" : "create"} product.`)
          : "An unexpected error occurred.",
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
      setError(
        axios.isAxiosError(err)
          ? Array.isArray(err.response?.data?.message)
            ? err.response.data.message.join(", ")
            : (err.response?.data?.message ?? "Unable to delete product.")
          : "An unexpected error occurred.",
      );
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

  return (
    <section className="p-6 md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Product Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your product catalogue and prices.
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
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ Add Product"}
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
        <div
          role="status"
          className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2"
        >
          <h3 className="text-lg font-semibold md:col-span-2">
            {editingId !== null ? "Edit Product" : "Add New Product"}
          </h3>

          <input
            required
            maxLength={150}
            placeholder="Product name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            required
            maxLength={50}
            placeholder="SKU *"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Unit price *"
            value={form.unitPrice}
            onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            required
            maxLength={30}
            placeholder="Unit (e.g. PCS, BOX)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <textarea
            rows={3}
            maxLength={1000}
            placeholder="Product description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3 md:col-span-2"
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
                  ? "Update Product"
                  : "Save Product"}
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
          placeholder="Search by product name, SKU, or description..."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Product</th>
              <th className="px-5 py-4">SKU</th>
              <th className="px-5 py-4">Unit</th>
              <th className="px-5 py-4 text-right">Unit Price</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  Loading products...
                </td>
              </tr>
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No products found.
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {product.name}
                    {product.description && (
                      <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                        {product.description}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4">{product.sku}</td>
                  <td className="px-5 py-4">{product.unit || "—"}</td>

                  <td className="px-5 py-4 text-right">
                    {Number(product.unitPrice).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        product.isActive === false
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {product.isActive === false ? "Inactive" : "Active"}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(product)}
                        disabled={deletingId !== null}
                        className="rounded-md bg-amber-100 px-3 py-2 font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(product)}
                        disabled={deletingId !== null}
                        className="rounded-md bg-red-100 px-3 py-2 font-medium text-red-800 hover:bg-red-200 disabled:opacity-50"
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

      <p className="mt-4 text-sm text-slate-500">
        Showing {filteredProducts.length} of {products.length} products
      </p>
    </section>
  );
}

export default Products;
