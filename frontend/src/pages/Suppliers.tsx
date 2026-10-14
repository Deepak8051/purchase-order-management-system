
import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../services/api'

type Supplier = {
  id: number
  name: string
  code: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  isActive?: boolean
}

function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    code: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
  })

  const loadSuppliers = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/suppliers')
      const data = response.data
      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data)
            ? data.data
            : []

      setSuppliers(records)
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.message ?? 'Unable to load suppliers.'
          : 'An unexpected error occurred.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSuppliers()
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      await api.post('/suppliers', {
        name: form.name.trim(),
        code: form.code.trim(),
        contactPerson: form.contactPerson.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
      })

      setForm({
        name: '',
        code: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
      })

      setShowForm(false)
      setSuccess('Supplier created successfully.')
      await loadSuppliers()
    } catch (err: unknown) {
      setError(
        axios.isAxiosError(err)
          ? Array.isArray(err.response?.data?.message)
            ? err.response.data.message.join(', ')
            : err.response?.data?.message ?? 'Unable to create supplier.'
          : 'An unexpected error occurred.',
      )
    } finally {
      setSaving(false)
    }
  }

  const filteredSuppliers = suppliers.filter((supplier) =>
    [
      supplier.name,
      supplier.code,
      supplier.email ?? '',
      supplier.contactPerson ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  return (
    <section className="p-6 md:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Supplier Management
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage your procurement suppliers.
          </p>
        </div>

        <button
          onClick={() => {
            setShowForm(!showForm)
            setError('')
            setSuccess('')
          }}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? 'Cancel' : '+ Add Supplier'}
        </button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
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
            Add New Supplier
          </h3>

          <input
            required
            maxLength={150}
            placeholder="Supplier name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            required
            maxLength={50}
            placeholder="Supplier code *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            maxLength={150}
            placeholder="Contact person"
            value={form.contactPerson}
            onChange={(e) =>
              setForm({ ...form, contactPerson: e.target.value })
            }
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            type="email"
            maxLength={150}
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            type="tel"
            maxLength={30}
            placeholder="Phone number"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3"
          />

          <input
            maxLength={500}
            placeholder="Address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded-lg border border-slate-300 px-4 py-3 md:col-span-2"
          />

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60 md:col-span-2"
          >
            {saving ? 'Saving...' : 'Save Supplier'}
          </button>
        </form>
      )}

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, email, or contact person..."
          className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4">Supplier</th>
              <th className="px-5 py-4">Code</th>
              <th className="px-5 py-4">Contact Person</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Phone</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Loading suppliers...
                </td>
              </tr>
            ) : filteredSuppliers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  No suppliers found.
                </td>
              </tr>
            ) : (
              filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-900">
                    {supplier.name}
                  </td>
                  <td className="px-5 py-4">{supplier.code}</td>
                  <td className="px-5 py-4">
                    {supplier.contactPerson || '—'}
                  </td>
                  <td className="px-5 py-4">{supplier.email || '—'}</td>
                  <td className="px-5 py-4">{supplier.phone || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Showing {filteredSuppliers.length} of {suppliers.length} suppliers
      </p>
    </section>
  )
}

export default Suppliers
