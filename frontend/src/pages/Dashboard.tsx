
import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../services/api'
import Suppliers from './Suppliers'

type DashboardProps = {
  userRole: string
  onLogout: () => void
}

type DashboardCounts = {
  organizations: number
  suppliers: number
  products: number
  purchaseOrders: number
}

const menuItems = [
  { label: 'Dashboard', icon: '▦' },
  { label: 'Organizations', icon: '▣', superAdminOnly: true },
  { label: 'Suppliers', icon: '♧' },
  { label: 'Products', icon: '□' },
  { label: 'Purchase Orders', icon: '☷' },
]

function getCount(data: unknown): number {
  if (Array.isArray(data)) return data.length

  if (data && typeof data === 'object') {
    const result = data as {
      data?: unknown
      items?: unknown[]
      total?: number
      totalCount?: number
    }

    if (typeof result.total === 'number') return result.total
    if (typeof result.totalCount === 'number') return result.totalCount
    if (Array.isArray(result.items)) return result.items.length
    if (Array.isArray(result.data)) return result.data.length
  }

  return 0
}

function Dashboard({ userRole, onLogout }: DashboardProps) {
  const [activePage, setActivePage] = useState('Dashboard')

  const [counts, setCounts] = useState<DashboardCounts>({
    organizations: 0,
    suppliers: 0,
    products: 0,
    purchaseOrders: 0,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const visibleItems = menuItems.filter(
    (item) => !item.superAdminOnly || userRole === 'SUPER_ADMIN',
  )

  useEffect(() => {
    let cancelled = false

    async function fetchCounts() {
      setLoading(true)
      setError('')

      try {
        const results = await Promise.allSettled([
          ...(userRole === 'SUPER_ADMIN'
            ? [api.get('/organizations')]
            : []),
          api.get('/suppliers'),
          api.get('/products'),
          api.get('/purchase-orders'),
        ])

        if (cancelled) return

        let index = 0

        const nextCounts: DashboardCounts = {
          organizations: 0,
          suppliers: 0,
          products: 0,
          purchaseOrders: 0,
        }

        const failures: string[] = []

        if (userRole === 'SUPER_ADMIN') {
          const result = results[index++]

          if (result.status === 'fulfilled') {
            nextCounts.organizations = getCount(result.value.data)
          } else {
            failures.push('organizations')
          }
        }

        const suppliersResult = results[index++]
        const productsResult = results[index++]
        const ordersResult = results[index++]

        if (suppliersResult.status === 'fulfilled') {
          nextCounts.suppliers = getCount(suppliersResult.value.data)
        } else {
          failures.push('suppliers')
        }

        if (productsResult.status === 'fulfilled') {
          nextCounts.products = getCount(productsResult.value.data)
        } else {
          failures.push('products')
        }

        if (ordersResult.status === 'fulfilled') {
          nextCounts.purchaseOrders = getCount(ordersResult.value.data)
        } else {
          failures.push('purchase orders')
        }

        setCounts(nextCounts)

        if (failures.length > 0) {
          setError(
            `Could not load: ${failures.join(', ')}. Check API endpoints and permissions.`,
          )
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            axios.isAxiosError(err)
              ? 'Unable to load dashboard data. Check your backend connection.'
              : 'An unexpected error occurred while loading the dashboard.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchCounts()

    return () => {
      cancelled = true
    }
  }, [userRole])

  const cards = [
    {
      label: 'Organizations',
      value: counts.organizations,
      color: 'bg-blue-100 text-blue-700',
      visible: userRole === 'SUPER_ADMIN',
    },
    {
      label: 'Suppliers',
      value: counts.suppliers,
      color: 'bg-violet-100 text-violet-700',
      visible: true,
    },
    {
      label: 'Products',
      value: counts.products,
      color: 'bg-emerald-100 text-emerald-700',
      visible: true,
    },
    {
      label: 'Purchase Orders',
      value: counts.purchaseOrders,
      color: 'bg-amber-100 text-amber-700',
      visible: true,
    },
  ].filter((card) => card.visible)

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 bg-slate-900 p-6 text-white md:block">
        <div className="mb-10 flex items-center gap-3">
          <div className="rounded-lg bg-blue-600 px-3 py-2 font-bold">
            PO
          </div>

          <div>
            <h1 className="font-bold">POMS</h1>
            <p className="text-xs text-slate-400">Procurement System</p>
          </div>
        </div>

        <p className="mb-3 text-xs uppercase tracking-wider text-slate-400">
          Workspace
        </p>

        <nav className="space-y-2">
          {visibleItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => setActivePage(item.label)}
              className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition ${
                activePage === item.label
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-10 rounded-lg bg-slate-800 p-4">
          <p className="text-xs text-slate-400">Signed in as</p>
          <p className="mt-1 font-semibold">
            {userRole.replace('_', ' ')}
          </p>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-6 w-full rounded-lg border border-slate-700 px-4 py-3 text-left hover:bg-slate-800"
        >
          ↪ Sign Out
        </button>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-xl font-bold">{activePage}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Purchase Order Management System
            </p>
          </div>

          <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
            {userRole.replace('_', ' ')}
          </span>
        </header>

        {activePage === 'Suppliers' ? (
          <Suppliers />
        ) : activePage === 'Dashboard' ? (
          <section className="p-6 md:p-8">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-slate-900">
                Welcome back!
              </h3>

              <p className="mt-2 text-slate-500">
                Here's an overview of your procurement workspace.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div
                    className={`mb-5 flex h-11 w-11 items-center justify-center rounded-lg text-xl ${card.color}`}
                  >
                    ●
                  </div>

                  <p className="text-sm text-slate-500">{card.label}</p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {loading ? '...' : card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-bold">Getting started</h3>

              <p className="mt-2 text-sm text-slate-500">
                Manage suppliers, products, and purchase orders from your
                workspace. Dashboard totals are loaded from your backend APIs.
              </p>
            </div>
          </section>
        ) : (
          <section className="p-6 md:p-8">
            <div className="rounded-xl border border-slate-200 bg-white p-8">
              <h3 className="text-xl font-bold">{activePage}</h3>

              <p className="mt-2 text-slate-500">
                This module will be connected to its backend API next.
              </p>

              <button
                type="button"
                onClick={() => setActivePage('Dashboard')}
                className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              >
                Back to Dashboard
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default Dashboard
