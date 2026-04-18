import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MenuPage from './pages/MenuPage'
import AdminPage from './pages/AdminPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import OrderStatus from './pages/OrderStatus'
import { CartProvider } from './context/CartContext'
import { LoginProvider, useLogin } from './context/LoginContext'
import SubscriptionPage from './pages/SubscriptionPage'
import TenantSettings from './pages/TenantSettings'
import { useEffect, useState } from 'react'
import { getToken, clearToken as removeTokenLocal } from './tenantAuth'
import api from './api'
import AdminHome from './pages/AdminHome'
import RequireAuth from './components/RequireAuth'
import Error401 from './pages/Error401'
import Error403 from './pages/Error403'
import ErrorBoundary from './components/ErrorBoundary'
import AccountMenu from './components/AccountMenu'
import RestaurantsList from './pages/RestaurantsList'
import OrdersPage from './pages/OrdersPage'
import OrdersDropdown from './components/OrdersDropdown'
import OrdersHistory from './pages/OrdersHistory'
import OrdersToday from './pages/OrdersToday'
import OrdersRecent from './pages/OrdersRecent'

// import the dizminu logo image placed in src/images
import dizminuLogo from './images/dizminuLogo.png'
import './styles.css' // ensure we have styles available

function HeaderLoginButton({ token, navigate }) {
  const { setShowLogin } = useLogin()
  return (!token ? (
    <button
      onClick={() => {
        console.debug('Header Login clicked: attempting to open login panel')
        // try context first
        try {
          setShowLogin(true)
        } catch (e) {
          console.debug('setShowLogin failed, falling back to event/sessionStorage', e)
          try { sessionStorage.setItem('openTenantLogin', '1') } catch (err) {}
          try { window.dispatchEvent(new CustomEvent('open-tenant-login')) } catch (err) {}
        }
        try { navigate('/subscriptions') } catch (e) { console.debug('navigate failed', e) }
      }}
      className="linkish"
      style={{marginLeft:12, background:'#0b486b', color:'#fff', border:'none', padding:'8px 12px', borderRadius:6, cursor:'pointer'}}
    >
      Login
    </button>
  ) : null)
}

export default function App() {
  const [token, setToken] = useState(getToken())
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('adminToken') || '')
  const [ordersCount, setOrdersCount] = useState(0)
  const [prevCount, setPrevCount] = useState(0)
  const [badgePulse, setBadgePulse] = useState(false)
  const [tenantBadge, setTenantBadge] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const h = () => setToken(getToken())
    window.addEventListener('tenant-auth-changed', h)
    const ha = () => setAdminToken(localStorage.getItem('adminToken') || '')
    window.addEventListener('admin-auth-changed', ha)
    const oc = (e) => setOrdersCount(Number(e?.detail || 0))
    window.addEventListener('orders-count', oc)
    // storage events for cross-tab updates
    const onStorage = (e) => {
      if (e.key === 'adminToken') setAdminToken(e.newValue || '')
      if (e.key === 'tenant_token') setToken(getToken())
    }
    window.addEventListener('storage', onStorage)
    // --- changed: return a single cleanup that removes ALL listeners ---
    return () => {
      window.removeEventListener('tenant-auth-changed', h)
      window.removeEventListener('admin-auth-changed', ha)
      window.removeEventListener('orders-count', oc)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // fetch orders count when token/adminToken changes (so header badge updates)
  useEffect(() => {
    let mounted = true
    const loadCount = async () => {
      try {
        const t = token
        if (t) {
          const me = await api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${t}` } })
          const tenantId = me?.data?.id
          const res = await api.get('/orders/latest', { params: { tenantId: tenantId || undefined, limit: 3 }, headers: { Authorization: `Bearer ${t}` } })
          console.debug('orders.latest (tenant) response:', res && res.data ? res.data : res)
           if (!mounted) return
           const arr = Array.isArray(res.data) ? res.data : []
           const visible = arr.length
           setOrdersCount(visible)
         } else if (adminToken) {
          const res = await api.get('/orders/latest', { params: { limit: 3 }, headers: { Authorization: `Bearer ${adminToken}` } })
          console.debug('orders.latest (admin) response:', res && res.data ? res.data : res)
           if (!mounted) return
           const arr = Array.isArray(res.data) ? res.data : []
           setOrdersCount(arr.length)
         } else {
           setOrdersCount(0)
         }
       } catch (e) {
         console.debug('Failed to load orders count for header', e)
       }
     }
    loadCount()
    return () => { mounted = false }
  }, [token, adminToken])

  // pulse animation when ordersCount increases
  useEffect(() => {
    if (ordersCount > prevCount) {
      setBadgePulse(true)
      const t = setTimeout(() => setBadgePulse(false), 900)
      setPrevCount(ordersCount)
      return () => clearTimeout(t)
    }
    setPrevCount(ordersCount)
  }, [ordersCount])

  function logoutAndRedirect() {
    try { removeTokenLocal() } catch (e) {}
    setToken('')
    setTenantBadge('')
    setTenantName('')
    // send global event so other components update
    try { window.dispatchEvent(new Event('tenant-auth-changed')) } catch (e) {}
    // navigate to home
    try { navigate('/') } catch (e) {}
  }

  // Fetch tenant info for header badge when token changes
  useEffect(() => {
    let mounted = true
    const loadTenant = async () => {
      if (!token) { if (mounted) setTenantBadge(''); return }
      try {
        const res = await api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } })
        if (!mounted) return
        const name = res?.data?.name || res?.data?.adminEmail || ''
        // compute short badge (initials upto 2 chars) or fallback to first word
        let badge = ''
        if (name) {
          const parts = String(name).trim().split(/\s+/).filter(Boolean)
          if (parts.length === 1) badge = parts[0].slice(0,3).toUpperCase()
          else badge = (parts[0][0] || '') + (parts[1][0] || '')
          badge = badge.toUpperCase()
        }
        setTenantBadge(badge || '')
        setTenantName(name || '')
        setTenantId(res?.data?.id || null)
      } catch (e) {
        console.debug('Failed to fetch tenant for badge', e)
        if (mounted) { setTenantBadge(''); setTenantName(''); setTenantId(null) }
      }
    }
    loadTenant()
    return () => { mounted = false }
  }, [token])

  return (
    <CartProvider>
      <div>
        <header className="header-container">
          <Link to="/menu" className="header-brand" style={{display:'flex',alignItems:'center',gap:12,textDecoration:'none'}}>
            <div className="brand-image" style={{width:64,height:64}}>
              <img src={dizminuLogo} alt="Dizminu logo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div>
              <div style={{fontWeight:800, fontSize:20, color:'white'}}>Dizminu</div>
              <div style={{fontSize:12, color:'rgba(255,255,255,0.85)'}}>Axinq Technology • for Smarter Dining</div>
            </div>
          </Link>

          <nav className="header-nav">
            {!token && <Link to="/restaurants" className="nav-link">Restaurants</Link>}
            {!token && <Link to="/" className="nav-home nav-link">Home</Link>}
            {(token || adminToken) && (
              <div style={{display:'inline-block',marginLeft:6}}>
                <OrdersDropdown token={token} adminToken={adminToken} tenantId={tenantId} badgeCount={ordersCount} />
                {ordersCount > 0 ? <span className={badgePulse ? 'orders-badge-pulse' : 'orders-badge-hidden'} aria-hidden></span> : null}
              </div>
            )}
            {(token || adminToken) && <Link to="/admin/orders/history" className="nav-link">Order History</Link>}
            {(token || adminToken) && <Link to="/admin/orders/recent" className="nav-link">Recent Orders</Link>}
            {!token ? (
              <Link to="/login" className="nav-link">Login</Link>
            ) : null}
            {/* Add Item moved into AccountMenu dropdown when logged in */}
          </nav>

          {token ? (
            <div className="nav-end">
              <AccountMenu tenantBadge={tenantBadge} tenantName={tenantName} tenantId={tenantId} onLogout={logoutAndRedirect} />
            </div>
          ) : null}
        </header>

        <main className="container">
          <Routes>
            {/* Default landing should be /subscriptions; root redirects there when not logged in */}
            {/* If logged in, send users to the customer menu (avoid rendering AdminHome at root which caused hook mismatch) */}
            <Route path="/" element={token ? <Navigate to="/menu" replace /> : <HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/subscriptions" element={<SubscriptionPage />} />
            <Route path="/restaurants" element={<RestaurantsList />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/:id/:restaurant/admin" element={<RequireAuth><TenantSettings /></RequireAuth>} />
            {/* Tenant setup link should be public so emailed setup token works for onboarding */}
            <Route path="/tenant/:id/settings" element={<TenantSettings />} />
            <Route path="/admin" element={<RequireAuth><ErrorBoundary><AdminPage /></ErrorBoundary></RequireAuth>} />
            <Route path="/admin/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
            <Route path="/admin/orders/recent" element={<RequireAuth><OrdersRecent /></RequireAuth>} />
            <Route path="/admin/orders/history" element={<RequireAuth><OrdersHistory /></RequireAuth>} />
            <Route path="/admin/orders/today" element={<RequireAuth><OrdersToday /></RequireAuth>} />
            <Route path="/401" element={<Error401 />} />
            <Route path="/403" element={<Error403 />} />
            <Route path="/order-success/:id" element={<OrderSuccessPage />} />
            <Route path="/order-status/:id" element={<OrderStatus />} />
            {/* Generic tenant routes are intentionally placed after specific routes so they don't
                accidentally capture paths like /order-status/:id or /order-success/:id. */}
            <Route path="/:token/:restaurant" element={<MenuPage />} />
            {/* Public restaurant link when clicked from Home: /base/{id}/{slug} */}
            <Route path="/base/:id/:restaurant" element={<MenuPage />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  )
}
