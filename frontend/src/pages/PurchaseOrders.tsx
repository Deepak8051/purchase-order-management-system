import { useEffect, useState } from "react";
import axios from "axios";
import api from "../services/api";

type Supplier = {
  id: number;
  name: string;
  code: string;
};

type Product = {
  id: number;
  name: string;
  sku: string;
  unitPrice: string | number;
};

type PurchaseOrderItemInput = {
  productId: number;
  quantity: number;
};

type OrderLine = {
  productId: number;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
  product?: Product;
};

type PurchaseOrder = {
  id: number;
  orderNumber: string;
  orderDate: string;
  expectedDeliveryDate?: string | null;
  status: string;
  totalAmount: string | number;
  notes?: string | null;
  supplier?: Supplier;
  supplierId?: number;
  items?: OrderLine[];
};

function getArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const result = data as { items?: unknown; data?: unknown };
    if (Array.isArray(result.items)) return result.items as T[];
    if (Array.isArray(result.data)) return result.data as T[];
  }

  return [];
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return fallback;
}

function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const [form, setForm] = useState({
    supplierId: "",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDeliveryDate: "",
    notes: "",
  });

  const [items, setItems] = useState<PurchaseOrderItemInput[]>([
    { productId: 0, quantity: 1 },
  ]);

  const currency = (value: string | number) =>
    Number(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [orderResponse, supplierResponse, productResponse] =
        await Promise.all([
          api.get("/purchase-orders"),
          api.get("/suppliers"),
          api.get("/products"),
        ]);

      setOrders(getArray<PurchaseOrder>(orderResponse.data));
      setSuppliers(getArray<Supplier>(supplierResponse.data));
      setProducts(getArray<Product>(productResponse.data));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to load purchase order data."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const updateItem = (
    index: number,
    field: keyof PurchaseOrderItemInput,
    value: number,
  ) => {
    setItems((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const totalAmount = items.reduce((total, item) => {
    const product = products.find((p) => p.id === item.productId);
    return total + Number(product?.unitPrice ?? 0) * item.quantity;
  }, 0);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.supplierId) {
      setError("Please select a supplier.");
      return;
    }

    if (
      items.length === 0 ||
      items.some(
        (item) =>
          !Number.isInteger(item.productId) ||
          item.productId < 1 ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1,
      )
    ) {
      setError(
        "Select a product and enter a quantity of at least 1 for every item.",
      );
      return;
    }

    if (new Set(items.map((item) => item.productId)).size !== items.length) {
      setError("Each product can appear only once per purchase order.");
      return;
    }

    if (
      form.expectedDeliveryDate &&
      form.expectedDeliveryDate < form.orderDate
    ) {
      setError("Expected delivery date cannot be earlier than the order date.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/purchase-orders", {
        supplierId: Number(form.supplierId),
        orderDate: form.orderDate,
        expectedDeliveryDate: form.expectedDeliveryDate || undefined,
        notes: form.notes.trim() || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      });

      setSuccess("Purchase order created successfully.");
      setShowForm(false);
      setForm({
        supplierId: "",
        orderDate: new Date().toISOString().slice(0, 10),
        expectedDeliveryDate: "",
        notes: "",
      });
      setItems([{ productId: 0, quantity: 1 }]);

      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to create purchase order."));
    } finally {
      setSaving(false);
    }
  };

  const viewOrder = async (id: number) => {
    setError("");
    setDetailsLoading(true);
    setSelectedOrder(null);

    try {
      const response = await api.get(`/purchase-orders/${id}`);
      const data = response.data as PurchaseOrder;
      setSelectedOrder(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to load order details."));
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateOrderStatus = async (status: string) => {
    if (!selectedOrder) return;

    setError("");
    setSuccess("");
    setStatusSaving(true);

    try {
      await api.patch(
        `/purchase-orders/${selectedOrder.id}/status`,
        {},
        { params: { status } },
      );

      setSuccess(`Order status updated to ${status}.`);

      const response = await api.get(`/purchase-orders/${selectedOrder.id}`);
      setSelectedOrder(response.data as PurchaseOrder);

      await loadData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to update order status."));
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <section className="p-6 md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Purchase Orders</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and track procurement orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowForm((current) => !current);
            setError("");
            setSuccess("");
          }}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ Create Purchase Order"}
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
          className="mb-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold">New Purchase Order</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Supplier *
              </label>
              <select
                required
                value={form.supplierId}
                onChange={(e) =>
                  setForm({ ...form, supplierId: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              >
                <option value="">Select supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Order Date *
              </label>
              <input
                required
                type="date"
                value={form.orderDate}
                onChange={(e) =>
                  setForm({ ...form, orderDate: e.target.value })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Expected Delivery Date
              </label>
              <input
                type="date"
                min={form.orderDate}
                value={form.expectedDeliveryDate}
                onChange={(e) =>
                  setForm({
                    ...form,
                    expectedDeliveryDate: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Notes</label>
              <input
                maxLength={1000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes"
                className="w-full rounded-lg border border-slate-300 px-4 py-3"
              />
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-semibold">Order Items</h4>
              <button
                type="button"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    { productId: 0, quantity: 1 },
                  ])
                }
                className="rounded-lg border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);

                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-12"
                  >
                    <div className="md:col-span-6">
                      <label className="mb-1 block text-xs text-slate-500">
                        Product
                      </label>
                      <select
                        required
                        value={item.productId || ""}
                        onChange={(e) =>
                          updateItem(index, "productId", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-3"
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs text-slate-500">
                        Quantity
                      </label>
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", Number(e.target.value))
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-3"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="mb-1 block text-xs text-slate-500">
                        Line Total
                      </label>
                      <p className="rounded-lg border border-slate-200 bg-white px-3 py-3 font-semibold">
                        {currency(
                          Number(product?.unitPrice ?? 0) * item.quantity,
                        )}
                      </p>
                    </div>

                    <div className="flex items-end md:col-span-1">
                      <button
                        type="button"
                        disabled={items.length === 1}
                        onClick={() =>
                          setItems((current) =>
                            current.filter((_, i) => i !== index),
                          )
                        }
                        className="w-full rounded-lg border border-red-200 px-3 py-3 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label={`Remove item ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <div className="text-right">
              <p className="text-sm text-slate-500">Estimated Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {currency(totalAmount)}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || suppliers.length === 0 || products.length === 0}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Purchase Order"}
          </button>

          {(suppliers.length === 0 || products.length === 0) && (
            <p className="text-sm text-amber-700">
              A supplier and at least one product are required.
            </p>
          )}
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Order Number</th>
              <th className="px-5 py-4">Order Date</th>
              <th className="px-5 py-4">Supplier</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Total Amount</th>
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
                  Loading purchase orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-10 text-center text-slate-500"
                >
                  No purchase orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {order.orderNumber}
                  </td>
                  <td className="px-5 py-4">
                    {String(order.orderDate).slice(0, 10)}
                  </td>
                  <td className="px-5 py-4">
                    {order.supplier?.name ??
                      suppliers.find((s) => s.id === order.supplierId)?.name ??
                      "—"}
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-medium">
                    {currency(order.totalAmount)}
                  </td>
                  <td className="px-5 py-4">
                    <button
                      type="button"
                      onClick={() => void viewOrder(order.id)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailsLoading && (
        <p className="mt-4 text-slate-500">Loading order details...</p>
      )}

      {selectedOrder && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {selectedOrder.orderNumber}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Order date: {String(selectedOrder.orderDate).slice(0, 10)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="rounded-lg border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <p>
              <strong>Supplier:</strong>{" "}
              {selectedOrder.supplier?.name ??
                suppliers.find((s) => s.id === selectedOrder.supplierId)
                  ?.name ??
                "—"}
            </p>
            <p>
              <strong>Status:</strong> {selectedOrder.status}
            </p>
            <p>
              <strong>Expected Delivery:</strong>{" "}
              {selectedOrder.expectedDeliveryDate
                ? String(selectedOrder.expectedDeliveryDate).slice(0, 10)
                : "—"}
            </p>
            <p>
              <strong>Notes:</strong> {selectedOrder.notes || "—"}
            </p>
          </div>

          <h4 className="mt-6 font-semibold">Order Items</h4>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Unit Price</th>
                  <th className="p-3">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedOrder.items ?? []).map((item, index) => (
                  <tr
                    key={`${item.productId}-${index}`}
                    className="border-t border-slate-100"
                  >
                    <td className="p-3">
                      {item.product?.name ??
                        products.find((p) => p.id === item.productId)?.name ??
                        `Product #${item.productId}`}
                    </td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3">{currency(item.unitPrice)}</td>
                    <td className="p-3">{currency(item.lineTotal)}</td>
                  </tr>
                ))}
                {(selectedOrder.items ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-slate-500">
                      No item details were returned by the API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-right text-lg font-bold">
            Total: {currency(selectedOrder.totalAmount)}
          </p>

          {selectedOrder.status === "DRAFT" && (
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={statusSaving}
                onClick={() => void updateOrderStatus("SUBMITTED")}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {statusSaving ? "Updating..." : "Submit Order"}
              </button>

              <button
                type="button"
                disabled={statusSaving}
                onClick={() => void updateOrderStatus("CANCELLED")}
                className="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Cancel Order
              </button>
            </div>
          )}
        </div>
      )}

      <p className="mt-4 text-sm text-slate-500">
        Total purchase orders: {orders.length}
      </p>
    </section>
  );
}

export default PurchaseOrders;
