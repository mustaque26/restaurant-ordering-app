import { useEffect, useState, useMemo } from 'react'
import api from '../api'
import { getToken } from '../tenantAuth'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function slugify(name) {
  if (!name) return ''
  return encodeURIComponent(
    name.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '')
  )
}

// We'll lazy-load react-chartjs-2 components on the client to avoid SSR/runtime render errors.
//
// Client-only chart loader: dynamically import Line/Bar and render after mount
import React from 'react'

function ChartClient({ kind = 'line', data, options }) {
  const [Comp, setComp] = React.useState(null)

  React.useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const mod = await import('react-chartjs-2')
        const Comp = kind === 'bar' ? mod.Bar : mod.Line
        if (mounted) setComp(() => Comp)
      } catch (e) {
        console.error('Failed to load chart component', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [kind])

  if (!Comp) return <div style={{minHeight:120}}>Loading chart...</div>
  return <Comp data={data} options={options} />
}

export default function AdminHome() {
  // Dev instrumentation: log entry and attach global error handlers (removed in production)
  if (typeof window !== 'undefined' && window.__ADMIN_HOME_INSTRUMENTED__ !== true) {
    window.__ADMIN_HOME_INSTRUMENTED__ = true
    console.debug('AdminHome: instrumentation active')
    window.addEventListener('error', (e) => {
      console.error('Global error event captured in AdminHome:', e.error || e.message || e)
    })
    window.addEventListener('unhandledrejection', (ev) => {
      console.error('Unhandled promise rejection in AdminHome:', ev.reason)
    })
  }

  console.debug('AdminHome render start')
   const [tenant, setTenant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ordersCount, setOrdersCount] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [orders, setOrders] = useState([])
  const [categories, setCategories] = useState([])
  // UI controls for interactivity
  const [timeframe, setTimeframe] = useState('7d') // '7d'|'30d'|'90d'|'all'
  const [groupBy, setGroupBy] = useState('day') // 'day'|'week'|'month'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [adminToken, setAdminToken] = React.useState(() => localStorage.getItem('adminToken') || '')
  const [showAdminModal, setShowAdminModal] = React.useState(false)
  const [adminEmail, setAdminEmail] = React.useState('')
  const [adminOtp, setAdminOtp] = React.useState('')
  const [otpSent, setOtpSent] = React.useState(false)
  const [updatingOrderId, setUpdatingOrderId] = React.useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let mounted = true
    console.debug('AdminHome load effect running - getting token...')
    const load = async () => {
      setError('')
      try {
        const token = getToken()
        console.debug('AdminHome token:', token)
        if (!token) {
          if (!mounted) return
          setLoading(false)
          setError('Not authenticated')
          return
        }
        // fetch in parallel
        const [meRes, ordersRes, menuRes] = await Promise.all([
          api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/orders', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/menu-items/available', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
        ])

        if (!mounted) return
        if (!meRes || !meRes.data) {
          setError('Failed to load tenant info')
          setLoading(false)
          return
        }
        setTenant(meRes.data)

        const ordersArr = Array.isArray(ordersRes?.data) ? ordersRes.data : []
        setOrdersCount(ordersArr.length)
        const total = ordersArr.reduce((s, o) => s + (Number(o?.totalAmount || o?.total || 0) || 0), 0)
        setRevenue(total)
        setOrders(ordersArr)

        try {
          const menuItems = Array.isArray(menuRes?.data) ? menuRes.data : []
          const cats = [...new Set(menuItems.map(mi => mi.category).filter(Boolean))]
          setCategories(cats)
        } catch (e) {
          console.debug('Failed to derive categories', e)
          setCategories([])
        }

        setLoading(false)
      } catch (err) {
        console.error('AdminHome load error:', err)
        if (!mounted) return
        const msg = err?.response?.data?.error || err?.message || 'Unable to load tenant or order stats'
        setError(msg)
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  // When tenant info is loaded and user is on the admin home ('/'), redirect them to the menu page
  useEffect(() => {
    if (tenant && location?.pathname === '/') {
      try {
        navigate('/menu', { replace: true })
      } catch (e) {
        console.debug('Auto-redirect to /menu failed', e)
      }
    }
  }, [tenant, location, navigate])

  // Admin auth helpers
  async function sendAdminOtp() {
    try {
      await api.post('/admin/send-otp', { email: adminEmail })
      setOtpSent(true)
    } catch (err) {
      console.error('Failed to send admin OTP', err)
      alert(err?.response?.data?.message || 'Failed to send OTP')
    }
  }

  async function verifyAdminOtp() {
    try {
      const res = await api.post('/admin/verify-otp', { email: adminEmail, otp: adminOtp })
      const token = res.data?.token
      if (token) {
        localStorage.setItem('adminToken', token)
        setAdminToken(token)
        // notify app header and other listeners that admin auth changed
        try { window.dispatchEvent(new Event('admin-auth-changed')) } catch (e) {}
        setShowAdminModal(false)
        setAdminEmail('')
        setAdminOtp('')
        setOtpSent(false)
        alert('Admin login successful')
      } else {
        alert('No token returned')
      }
    } catch (err) {
      console.error('Failed to verify admin OTP', err)
      alert(err?.response?.data?.message || 'Failed to verify OTP')
    }
  }

  async function performStatusUpdate(orderId, newStatus) {
    setUpdatingOrderId(orderId)
    const tenantToken = getToken() // existing tenant token helper imported in file
    const tryHeaders = (t) => ({ headers: { Authorization: t ? `Bearer ${t}` : '' } })
    try {
      // try tenant token first (if present)
      if (tenantToken) {
        try {
          const resp = await api.post(`/orders/${orderId}/status`, { status: newStatus }, tryHeaders(tenantToken))
          // update orders state
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: resp.data.status } : o))
          setUpdatingOrderId(null)
          return
        } catch (err) {
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            // fall through to try admin token
          } else {
            throw err
          }
        }
      }

      // try admin token if available
      if (adminToken) {
        try {
          const resp = await api.post(`/orders/${orderId}/status`, { status: newStatus }, tryHeaders(adminToken))
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: resp.data.status } : o))
          setUpdatingOrderId(null)
          return
        } catch (err) {
          if (err?.response?.status === 401 || err?.response?.status === 403) {
            // admin token invalid - clear and prompt login
            localStorage.removeItem('adminToken')
            setAdminToken('')
            try { window.dispatchEvent(new Event('admin-auth-changed')) } catch (e) {}
            setShowAdminModal(true)
            setUpdatingOrderId(null)
            return
          }
          throw err
        }
      }

      // No admin token: prompt admin login flow
      setShowAdminModal(true)
      setUpdatingOrderId(null)

    } catch (err) {
      console.error('Status update failed', err)
      alert(err?.response?.data?.error || err?.message || 'Failed to update status')
      setUpdatingOrderId(null)
    }
  }

  if (loading) return <div className="card pad mb">Loading admin home...</div>
  if (error) return <div className="card pad mb">{error}</div>

  const id = tenant?.id
  const slug = slugify(tenant?.name || '')

  // compute filtered orders based on timeframe and category
  const filteredOrders = useMemo(() => {
    const now = new Date()
    let cutoff = null
    if (timeframe === '7d') { cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6) }
    if (timeframe === '30d') { cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29) }
    if (timeframe === '90d') { cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89) }
    return orders.filter(o => {
      // filter by category if selected
      if (categoryFilter && categoryFilter !== 'all') {
        // check if any item in the order matches category
        const items = o.items || o.orderItems || o.itemsOrdered || []
        const hasCat = items.some(it => (it.category || it.itemCategory || '').toLowerCase() === categoryFilter.toLowerCase())
        if (!hasCat) return false
      }
      if (!cutoff) return true
      const created = o.createdAt || o.created || o.created_at || o.date
      if (!created) return false
      const dt = new Date(created)
      return dt >= cutoff
    })
  }, [orders, timeframe, categoryFilter])

  // build labels depending on groupBy and timeframe
  const labels = useMemo(() => {
    const now = new Date()
    const days = []
    let start
    if (timeframe === '7d') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)
    else if (timeframe === '30d') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29)
    else if (timeframe === '90d') start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89)
    else start = new Date(0) // all

    const result = []
    const cur = new Date(start)
    if (groupBy === 'day') {
      while (cur <= now) { result.push(new Date(cur)); cur.setDate(cur.getDate() + 1) }
      return result.map(d => d.toLocaleDateString())
    }
    if (groupBy === 'week') {
      // week buckets: ISO week start (Mon)
      const wkStart = new Date(start)
      // adjust to Monday
      wkStart.setDate(wkStart.getDate() - ((wkStart.getDay() + 6) % 7))
      const labelsArr = []
      const tmp = new Date(wkStart)
      while (tmp <= now) {
        labelsArr.push(new Date(tmp))
        tmp.setDate(tmp.getDate() + 7)
      }
      return labelsArr.map(d => `Wk of ${d.toLocaleDateString()}`)
    }
    if (groupBy === 'month') {
      const m = new Date(start.getFullYear(), start.getMonth(), 1)
      const labelsArr = []
      while (m <= now) { labelsArr.push(new Date(m)); m.setMonth(m.getMonth() + 1) }
      return labelsArr.map(d => d.toLocaleString(undefined, { month: 'short', year: 'numeric' }))
    }
    return []
  }, [timeframe, groupBy])

  // aggregate
  const { ordersByBucket, revenueByBucket } = useMemo(() => {
    const ob = labels.map(() => 0)
    const rb = labels.map(() => 0)
    filteredOrders.forEach(o => {
      const created = o.createdAt || o.created || o.created_at || o.date
      const total = Number(o.totalAmount || o.total || 0) || 0
      if (!created) return
      const dt = new Date(created)
      let idx = -1
      if (groupBy === 'day') {
        idx = labels.findIndex(lbl => new Date(lbl).toDateString() === dt.toDateString())
      } else if (groupBy === 'week') {
        // find week start label
        const weekStart = new Date(dt)
        weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
        const lbl = `Wk of ${weekStart.toLocaleDateString()}`
        idx = labels.indexOf(lbl)
      } else if (groupBy === 'month') {
        const lbl = dt.toLocaleString(undefined, { month: 'short', year: 'numeric' })
        idx = labels.indexOf(lbl)
      }
      if (idx >= 0) { ob[idx] += 1; rb[idx] += total }
    })
    return { ordersByBucket: ob, revenueByBucket: rb }
  }, [filteredOrders, labels, groupBy])

  const lineData = {
    labels,
    datasets: [
      {
        label: 'Orders',
        data: ordersByBucket,
        borderColor: 'rgba(14,165,233,0.9)',
        backgroundColor: 'rgba(14,165,233,0.12)',
        tension: 0.25,
        fill: true
      }
    ]
  }

  const barData = {
    labels,
    datasets: [
      {
        label: 'Revenue (₹)',
        data: revenueByBucket,
        backgroundColor: 'rgba(40,199,111,0.9)'
      }
    ]
  }

  const chartOpts = {
    responsive: true,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } }
  }

  try {
    return (
      <div>
        <div className="card pad mb">
          <h2>Welcome back, {tenant?.name || 'Admin'}</h2>
          <p className="muted">Manage your menu, orders, and settings from here.</p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
            <button onClick={() => navigate('/admin')} className="subscribe-btn">Admin Dashboard</button>
            <button onClick={() => navigate(`/${id}/${slug}`)} className="subscribe-btn">Open Menu</button>
            <button onClick={() => navigate(`/${id}/${slug}/admin`)} className="subscribe-btn">Settings</button>
            <button onClick={() => navigate('/admin/orders')} className="subscribe-btn">View all orders</button>
            <Link to="/subscriptions" style={{alignSelf:'center',marginLeft:8}}>Subscriptions</Link>
          </div>
        </div>

        {/* Recent orders with inline status updater */}
        <div className="card pad mb">
          <h3>Recent orders</h3>
          {orders.length === 0 ? (
            <div className="muted">No orders yet.</div>
          ) : (
            <div style={{overflowX:'auto'}}>
              <table className="table" style={{minWidth:760}}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Details</th> {/* added column */}
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{o.customerName || o.customer || '—'}</td>
                      <td>{String(o.status || '—')}</td>
                      <td>₹{(Number(o.totalAmount) || 0).toFixed(2)}</td>
                      <td style={{maxWidth:360, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                        {/* compact order details + created time */}
                        <div title={renderOrderSummary(o)} style={{fontSize:13, color:'#222'}}>{renderOrderSummary(o)}</div>
                        <div style={{fontSize:11, color:'#666', marginTop:6}}>
                          { (o.createdAt || o.created || o.date || o.created_at) ? new Date(o.createdAt || o.created || o.date || o.created_at).toLocaleString() : '' }
                        </div>
                      </td>
                      <td>
                        <select defaultValue={mapStatusToSimple(o.status)} onChange={(e) => { /* no-op */ }} id={`status-select-${o.id}`} style={{marginRight:8}}>
                          <option value="CREATED">Ordered</option>
                          <option value="CONFIRMED">In Progress</option>
                          <option value="DELIVERED">Served</option>
                          <option value="CANCELLED">Closed</option>
                        </select>
                        <button className="btn btn-sm" onClick={() => {
                          const sel = document.getElementById(`status-select-${o.id}`)
                          const newStatus = sel ? sel.value : 'CONFIRMED'
                          performStatusUpdate(o.id, newStatus)
                        }} disabled={updatingOrderId === o.id}>{updatingOrderId === o.id ? 'Updating...' : 'Update'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card pad mb">
          <h3>Quick stats</h3>
          <div className="admin-stats">
            <div className="stat">
              <div className="muted">Orders</div>
              <div className="num">{ordersCount}</div>
            </div>
            <div className="stat">
              <div className="muted">Revenue</div>
              <div className="num">₹{(Number(revenue) || 0).toFixed(2)}</div>
            </div>
          </div>
          {/* Controls: timeframe, grouping, category */}
          <div style={{display:'flex',gap:12,alignItems:'center',marginTop:12}}>
            <label className="muted">Timeframe:</label>
            <select value={timeframe} onChange={e => setTimeframe(e.target.value)}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All</option>
            </select>
            <label className="muted" style={{marginLeft:12}}>Group by:</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)}>
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
            <label className="muted" style={{marginLeft:12}}>Category:</label>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">All</option>
              {Array.isArray(categories) ? categories.map(c => <option key={c} value={c}>{c}</option>) : null}
            </select>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginTop:18}}>
            <div>
              <h4 style={{marginTop:0}}>Orders — last 7 days</h4>
              <ChartClient kind="line" options={chartOpts} data={lineData} />
            </div>
            <div>
              <h4 style={{marginTop:0}}>Revenue — last 7 days</h4>
              <ChartClient kind="bar" options={chartOpts} data={barData} />
            </div>
          </div>
        </div>

        {/* Admin login modal for OTP */}
        {showAdminModal ? (
          <div className="admin-modal">
            <div className="admin-modal-content">
              <h3>Admin Login</h3>
              <p className="muted">Enter your admin email to receive an OTP.</p>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="Admin email" />
              {otpSent ? (
                <>
                  <p className="muted" style={{marginTop:12}}>Enter the OTP sent to your email:</p>
                  <input type="text" value={adminOtp} onChange={e => setAdminOtp(e.target.value)} placeholder="OTP" />
                </>
              ) : null}
              <div style={{marginTop:18,display:'flex',gap:12}}>
                <button onClick={sendAdminOtp} disabled={otpSent || !adminEmail} className="subscribe-btn">
                  {otpSent ? 'OTP Sent' : 'Send OTP'}
                </button>
                {otpSent ? (
                  <button onClick={verifyAdminOtp} disabled={!adminOtp} className="subscribe-btn">
                    Verify OTP
                  </button>
                ) : null}
                <button onClick={() => setShowAdminModal(false)} className="btn btn-secondary">Cancel</button>
              </div>
              <div className="admin-modal-footer">
                <p>Admin access is required to update order statuses. Please login to continue.</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  } catch (e) {
    console.error('AdminHome render error:', e)
    return <div className="card pad mb">Error loading admin UI: {String(e && e.message ? e.message : e)}</div>
  }
}

// helper to map various backend statuses to the select default (simple mapping)
function mapStatusToSimple(status) {
  if (!status) return 'CREATED'
  const s = String(status).toUpperCase()
  if (s === 'DELIVERED') return 'DELIVERED'
  if (s === 'CONFIRMED' || s === 'OUT_FOR_DELIVERY') return 'CONFIRMED'
  if (s === 'CANCELLED') return 'CANCELLED'
  return 'CREATED'
}

// NEW helper: produce a compact summary string (qty x name) from common order item shapes
function renderOrderSummary(o) {
  try {
    const items = Array.isArray(o.items) ? o.items
      : Array.isArray(o.orderItems) ? o.orderItems
      : Array.isArray(o.itemsOrdered) ? o.itemsOrdered
      : Array.isArray(o.itemsList) ? o.itemsList
      : []
    if (!items || items.length === 0) return '—'
    // Try common field names for qty/name
    const parts = items.map(it => {
      const qty = it.quantity ?? it.qty ?? it.count ?? 1
      const name = it.name ?? it.itemName ?? it.title ?? it.product ?? 'item'
      return `${qty}× ${name}`
    })
    return parts.join(', ')
  } catch (e) {
    console.debug('renderOrderSummary failed', e)
    return '—'
  }
}
