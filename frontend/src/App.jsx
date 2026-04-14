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
        <header className="topbar">
          <div className="topbar-container">
            {/* brand: show icon (cropped) and render brand text outside the image for clarity */}
            <div className="brand">
              <div className="brand-image">
                <img src={dizminuLogo} alt="Dizminu logo" />
              </div>
              <div className="brand-wordmark">
                <div className="brand-svg" aria-hidden="false">
                  <svg xmlns="http://www.w3.org/2000/svg" width="380" height="72" viewBox="0 0 380 72" role="img" aria-label="Dizminu">
                   <defs>
                     <linearGradient id="dizGrad" x1="0%" x2="100%">
                       <stop offset="0%" stopColor="#0b61d0" />
                       <stop offset="38%" stopColor="#0ea5e9" />
                       <stop offset="68%" stopColor="#1fb36a" />
                       <stop offset="100%" stopColor="#28c76f" />
                     </linearGradient>
                     {/* subtle embossed lighting */}
                     <filter id="emboss" x="-20%" y="-20%" width="140%" height="140%">
                       <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur"/>
                       <feSpecularLighting in="blur" surfaceScale="2" specularConstant="0.6" specularExponent="20" lighting-color="#ffffff" result="specOut">
                         <fePointLight x="-5000" y="-10000" z="20000"/>
                       </feSpecularLighting>
                       <feComposite in="specOut" in2="SourceAlpha" operator="in" result="specOut2"/>
                       <feMerge>
                         <feMergeNode in="specOut2"/>
                         <feMergeNode in="SourceGraphic"/>
                       </feMerge>
                     </filter>
                   </defs>
                   <text x="0" y="50" fontFamily="Poppins, Arial, sans-serif" fontWeight="800" fontSize="48" fill="url(#dizGrad)" filter="url(#emboss)">Dizminu</text>
                  </svg>
                </div>
                <div className="brand-tagline">
                  <div className="tag-line-1">Axinq Technology</div>
                  <div className="tag-line-2">for Smarter Dining</div>
                </div>
              </div>
            </div>
            <div style={{display:'flex', alignItems:'center', marginLeft:'auto'}}>
              <nav className="nav" style={{display:'flex', gap:20}}>
                {/* Always show public restaurants list */}
                <Link to="/restaurants" className="nav-link">Restaurants</Link>
                {/* show Home label only for non-logged-in users */}
                {!token && <Link to="/" className="nav-home nav-link">Home</Link>}
                {/* If not logged in, show Login link */}
                {!token ? (
                  <Link to="/login" className="nav-link">Login</Link>
                ) : null}
                <Link to="/subscriptions" className="nav-link">Subscriptions</Link>
                {token ? <Link to="/admin" className="nav-link">Add Item</Link> : null}
              </nav>
            </div>
            {/* Render account menu as a sibling so it stays at the extreme right */}
            {token ? (
              <div className="nav-end">
                <AccountMenu tenantBadge={tenantBadge} tenantName={tenantName} tenantId={tenantId} onLogout={logoutAndRedirect} />
              </div>
            ) : null}
           </div>
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
