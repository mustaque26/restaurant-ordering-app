import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import MenuPage from './pages/MenuPage'
import AdminPage from './pages/AdminPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
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

// import the dizminu logo image placed in src/images
import dizminuLogo from './images/dizminuLogo.png'

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
  const [tenantBadge, setTenantBadge] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const h = () => setToken(getToken())
    window.addEventListener('tenant-auth-changed', h)
    return () => window.removeEventListener('tenant-auth-changed', h)
  }, [])

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
          <div className="header-brand">
            <div className="brand-image" style={{width:64,height:64}}>
              <img src={dizminuLogo} alt="Dizminu logo" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            </div>
            <div>
              <div style={{fontWeight:800, fontSize:20, color:'white'}}>Dizminu</div>
              <div style={{fontSize:12, color:'rgba(255,255,255,0.85)'}}>Axinq Technology • for Smarter Dining</div>
            </div>
          </div>

          <nav className="header-nav">
            {!token && <Link to="/restaurants" className="nav-link">Restaurants</Link>}
            {!token && <Link to="/" className="nav-home nav-link">Home</Link>}
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
            {/* Token-based tenant landing: /<token>/<restaurant-name> */}
            <Route path="/:token/:restaurant" element={<MenuPage />} />
            {/* Public restaurant link when clicked from Home: /base/{id}/{slug} */}
            <Route path="/base/:id/:restaurant" element={<MenuPage />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/:id/:restaurant/admin" element={<RequireAuth><TenantSettings /></RequireAuth>} />
            {/* Tenant setup link should be public so emailed setup token works for onboarding */}
            <Route path="/tenant/:id/settings" element={<TenantSettings />} />
            <Route path="/admin" element={<RequireAuth><ErrorBoundary><AdminPage /></ErrorBoundary></RequireAuth>} />
            <Route path="/401" element={<Error401 />} />
            <Route path="/403" element={<Error403 />} />
            <Route path="/order-success/:id" element={<OrderSuccessPage />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  )
}
