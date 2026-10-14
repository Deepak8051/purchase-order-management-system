import { useEffect, useState } from "react";

import axios from "axios";

import api from "../services/api";

import Suppliers from "./Suppliers";

import Products from "./Products";

import PurchaseOrders from "./PurchaseOrders";

import Organizations from "./Organizations";

type DashboardProps = {
  userRole: string;

  onLogout: () => void;
};

type DashboardCounts = {
  organizations: number;

  suppliers: number;

  products: number;

  purchaseOrders: number;
};

type Outlet = {
  id: number;

  name: string;

  code: string;

  city: string | null;
};

const ADMIN_ROLES = ["HQ_SUPER_ADMIN", "OUTLET_SUPER_ADMIN", "ORG_ADMIN"];

const menuItems = [
  { label: "Dashboard", icon: "▦" },

  { label: "Organizations", icon: "▣", superAdminOnly: true },

  { label: "Suppliers", icon: "♧" },

  { label: "Products", icon: "□" },

  { label: "Purchase Orders", icon: "☷" },
];

function getCount(data: unknown): number {
  if (Array.isArray(data)) return data.length;

  if (data && typeof data === "object") {
    const result = data as {
      items?: unknown[];

      data?: unknown;

      total?: number;

      totalCount?: number;
    };

    if (typeof result.total === "number") return result.total;

    if (typeof result.totalCount === "number") return result.totalCount;

    if (Array.isArray(result.items)) return result.items.length;

    if (Array.isArray(result.data)) return result.data.length;
  }

  return 0;
}

function Dashboard({ userRole, onLogout }: DashboardProps) {
  const [activePage, setActivePage] = useState("Dashboard");

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [counts, setCounts] = useState<DashboardCounts>({
    organizations: 0,

    suppliers: 0,

    products: 0,

    purchaseOrders: 0,
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [cities, setCities] = useState<string[]>([]);

  const [outlets, setOutlets] = useState<Outlet[]>([]);

  const [selectedCity, setSelectedCity] = useState("ALL");

  const [selectedOutlet, setSelectedOutlet] = useState("ALL");

  const canUseLocationFilters = ADMIN_ROLES.includes(userRole);

  useEffect(() => {
    if (!canUseLocationFilters) return;

    let cancelled = false;

    async function loadCities() {
      try {
        const response = await api.get<string[]>("/organizations/cities");

        if (!cancelled) setCities(response.data);
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load cities:", err);

          setError(
            "Unable to load cities. Check your permissions and backend API.",
          );
        }
      }
    }

    void loadCities();

    return () => {
      cancelled = true;
    };
  }, [canUseLocationFilters]);

  useEffect(() => {
    if (!canUseLocationFilters) return;

    let cancelled = false;

    async function loadOutlets() {
      try {
        const params = selectedCity === "ALL" ? {} : { city: selectedCity };

        const response = await api.get<Outlet[]>("/organizations/outlets", {
          params,
        });

        if (!cancelled) {
          setOutlets(response.data);

          if (
            selectedOutlet !== "ALL" &&
            !response.data.some(
              (outlet) => String(outlet.id) === selectedOutlet,
            )
          ) {
            setSelectedOutlet("ALL");
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          console.error("Failed to load outlets:", err);

          setError(
            "Unable to load outlets. Check your permissions and backend API.",
          );
        }
      }
    }

    void loadOutlets();

    return () => {
      cancelled = true;
    };
  }, [canUseLocationFilters, selectedCity, selectedOutlet]);

  const visibleItems = menuItems.filter(
    (item) => !item.superAdminOnly || userRole === "HQ_SUPER_ADMIN",
  );

  useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      setLoading(true);

      setError("");

      try {
        const params: Record<string, string> = {};

        if (selectedCity !== "ALL") {
          params.city = selectedCity;
        }

        if (selectedOutlet !== "ALL") {
          params.outletId = selectedOutlet;
        }

        const results = await Promise.allSettled([
          ...(userRole === "HQ_SUPER_ADMIN"
            ? [api.get("/organizations", { params })]
            : []),

          api.get("/suppliers", { params }),

          api.get("/products", { params }),

          api.get("/purchase-orders", { params }),
        ]);

        if (cancelled) return;

        let index = 0;

        const nextCounts: DashboardCounts = {
          organizations: 0,

          suppliers: 0,

          products: 0,

          purchaseOrders: 0,
        };

        const failures: string[] = [];

        if (userRole === "HQ_SUPER_ADMIN") {
          const result = results[index++];

          if (result.status === "fulfilled") {
            nextCounts.organizations = getCount(result.value.data);
          } else {
            failures.push("organizations");
          }
        }

        const suppliersResult = results[index++];

        const productsResult = results[index++];

        const ordersResult = results[index++];

        if (suppliersResult.status === "fulfilled") {
          nextCounts.suppliers = getCount(suppliersResult.value.data);
        } else {
          failures.push("suppliers");
        }

        if (productsResult.status === "fulfilled") {
          nextCounts.products = getCount(productsResult.value.data);
        } else {
          failures.push("products");
        }

        if (ordersResult.status === "fulfilled") {
          nextCounts.purchaseOrders = getCount(ordersResult.value.data);
        } else {
          failures.push("purchase orders");
        }

        setCounts(nextCounts);

        if (failures.length > 0) {
          setError(
            `Could not load: ${failures.join(", ")}. Check API endpoints and permissions.`,
          );
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            axios.isAxiosError(err)
              ? "Unable to load dashboard data. Check your backend connection."
              : "An unexpected error occurred while loading the dashboard.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchCounts();

    return () => {
      cancelled = true;
    };
  }, [userRole, selectedCity, selectedOutlet]);

  const cards = [
    {
      label: "Organizations",

      value: counts.organizations,

      icon: "▣",

      color: "bg-blue-50 text-blue-700",

      visible: userRole === "HQ_SUPER_ADMIN",

      page: "Organizations",

      description: "Registered organizations",
    },

    {
      label: "Suppliers",

      value: counts.suppliers,

      icon: "♧",

      color: "bg-violet-50 text-violet-700",

      visible: true,

      page: "Suppliers",

      description: "Procurement partners",
    },

    {
      label: "Products",

      value: counts.products,

      icon: "□",

      color: "bg-emerald-50 text-emerald-700",

      visible: true,

      page: "Products",

      description: "Available catalogue items",
    },

    {
      label: "Purchase Orders",

      value: counts.purchaseOrders,

      icon: "☷",

      color: "bg-amber-50 text-amber-700",

      visible: true,

      page: "Purchase Orders",

      description: "Recorded purchase orders",
    },
  ].filter((card) => card.visible);

  const navigateTo = (page: string) => {
    setActivePage(page);

    setMobileMenuOpen(false);
  };

  const renderSidebar = () => (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-slate-800 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold tracking-wide text-white shadow-lg shadow-blue-950/30">
          PO
        </div>

        <div>
          <h1 className="text-lg font-bold tracking-wide text-white">POMS</h1>

          <p className="text-xs text-slate-400">Procurement System</p>
        </div>
      </div>

      <div className="px-4 pt-8">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </p>

        <nav className="space-y-1.5">
          {visibleItems.map((item) => {
            const active = activePage === item.label;

            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigateTo(item.label)}
                aria-current={active ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                  active
                    ? "bg-blue-600 text-white shadow-md shadow-blue-950/20"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span className="flex h-6 w-6 items-center justify-center text-lg">
                  {item.icon}
                </span>

                <span>{item.label}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-slate-800 bg-slate-800/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-sm font-bold text-blue-300">
              {userRole === "HQ_SUPER_ADMIN"
                ? "HQ"
                : userRole === "OUTLET_SUPER_ADMIN"
                  ? "OS"
                  : userRole === "ORG_ADMIN"
                    ? "OA"
                    : "US"}
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-400">Signed in as</p>

              <p className="mt-1 truncate text-sm font-semibold text-white">
                {userRole.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <span className="text-lg">↪</span>
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-slate-950 md:flex">
        {renderSidebar()}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/60"
          />

          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-slate-950">
            {renderSidebar()}
          </aside>
        </div>
      )}

      <div className="min-h-screen md:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setMobileMenuOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 md:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                  <span>POMS</span>

                  <span>/</span>

                  <span className="truncate text-blue-600">{activePage}</span>
                </div>

                <h2 className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {activePage}
                </h2>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs text-slate-500">Current role</p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {userRole.replace(/_/g, " ")}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-sm font-bold text-blue-700">
                {userRole === "HQ_SUPER_ADMIN"
                  ? "HQ"
                  : userRole === "OUTLET_SUPER_ADMIN"
                    ? "OS"
                    : userRole === "ORG_ADMIN"
                      ? "OA"
                      : "US"}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          {activePage === "Organizations" && userRole === "HQ_SUPER_ADMIN" ? (
            <Organizations />
          ) : activePage === "Suppliers" ? (
            <Suppliers />
          ) : activePage === "Products" ? (
            <Products />
          ) : activePage === "Purchase Orders" ? (
            <PurchaseOrders />
          ) : activePage === "Dashboard" ? (
            <section>
              <div className="mb-8">
                <p className="text-sm font-semibold text-blue-600">
                  PROCUREMENT OVERVIEW
                </p>

                <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Welcome back!
                </h3>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  Here's an overview of your procurement workspace. Manage
                  suppliers, products, and purchase orders from one place.
                </p>
              </div>

              {canUseLocationFilters && (
                <div className="mb-6 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="city-filter"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      City
                    </label>

                    <select
                      id="city-filter"
                      value={selectedCity}
                      onChange={(event) => {
                        setSelectedCity(event.target.value);

                        setSelectedOutlet("ALL");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="ALL">All Cities</option>

                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="outlet-filter"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Outlet
                    </label>

                    <select
                      id="outlet-filter"
                      value={selectedOutlet}
                      onChange={(event) =>
                        setSelectedOutlet(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="ALL">All Outlets</option>

                      {outlets.map((outlet) => (
                        <option key={outlet.id} value={String(outlet.id)}>
                          {outlet.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-xs text-slate-500 sm:col-span-2">
                    Filters select the city and outlet. Dashboard counts will
                    reflect the selection after the list APIs support these
                    filters.
                  </p>
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  Workspace summary
                </h3>

                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500">
                  Live API data
                </span>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => navigateTo(card.page)}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${card.color}`}
                      >
                        {card.icon}
                      </div>

                      <span className="rounded-lg px-2 py-1 text-slate-400 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                        ↗
                      </span>
                    </div>

                    <p className="mt-6 text-sm font-medium text-slate-500">
                      {card.label}
                    </p>

                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                      {loading ? (
                        <span className="inline-block h-9 w-14 animate-pulse rounded-md bg-slate-100" />
                      ) : (
                        card.value.toLocaleString("en-IN")
                      )}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      {card.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    Quick actions
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Jump directly to the modules you use most.
                  </p>

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => navigateTo("Suppliers")}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-xl text-violet-700">
                        ♧
                      </span>

                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          Manage Suppliers
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          View supplier records
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo("Products")}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-xl text-emerald-700">
                        □
                      </span>

                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          Manage Products
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          Browse the catalogue
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigateTo("Purchase Orders")}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-xl text-amber-700">
                        ☷
                      </span>

                      <span>
                        <span className="block text-sm font-semibold text-slate-800">
                          Purchase Orders
                        </span>

                        <span className="mt-1 block text-xs text-slate-500">
                          View and manage orders
                        </span>
                      </span>
                    </button>

                    {userRole === "HQ_SUPER_ADMIN" && (
                      <button
                        type="button"
                        onClick={() => navigateTo("Organizations")}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/50"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-xl text-blue-700">
                          ▣
                        </span>

                        <span>
                          <span className="block text-sm font-semibold text-slate-800">
                            Organizations
                          </span>

                          <span className="mt-1 block text-xs text-slate-500">
                            Manage organizations
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
                    ✓
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    Workspace status
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Your dashboard retrieves its summary from your existing
                    backend APIs.
                  </p>

                  <div className="mt-5 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />

                    {loading
                      ? "Loading data..."
                      : error
                        ? "Check connection"
                        : "Dashboard loaded"}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900">{activePage}</h3>

              <p className="mt-2 text-sm text-slate-500">
                This module is not available for your current role.
              </p>

              <button
                type="button"
                onClick={() => navigateTo("Dashboard")}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </section>
          )}
        </main>

        <footer className="border-t border-slate-200 bg-white px-6 py-4 text-center text-xs text-slate-400">
          POMS · Purchase Order Management System
        </footer>
      </div>
    </div>
  );
}

export default Dashboard;
