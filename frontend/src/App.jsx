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
import AdminHome from './pages/AdminHome'
import RequireAuth from './components/RequireAuth'
import Error401 from './pages/Error401'
import Error403 from './pages/Error403'
import ErrorBoundary from './components/ErrorBoundary'

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
  const navigate = useNavigate()

  useEffect(() => {
    const h = () => setToken(getToken())
    window.addEventListener('tenant-auth-changed', h)
    return () => window.removeEventListener('tenant-auth-changed', h)
  }, [])

  function logoutAndRedirect() {
    try { removeTokenLocal() } catch (e) {}
    setToken('')
    // send global event so other components update
    try { window.dispatchEvent(new Event('tenant-auth-changed')) } catch (e) {}
    // navigate to home
    try { navigate('/') } catch (e) {}
  }

  return (
    <CartProvider>
      <div>
        <header className="topbar">
          <div className="nav topbar-container">
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
            <nav>
              {/* Always show subscription link; show Menu/Admin only when tenant is logged in */}
              {token ? <Link to="/menu">Menu</Link> : null}
              {/* show Home label only for non-logged-in users */}
              {!token && <Link to="/" className="nav-home">Home</Link>}
              {/* If not logged in, show Login link; otherwise show Logout button */}
              {!token ? (
                <Link to="/login" style={{marginLeft:12}}>Login</Link>
              ) : (
                <button onClick={logoutAndRedirect} className="header-btn secondary" style={{marginLeft:12}}>Logout</button>
              )}
              <Link to="/subscriptions" style={{marginLeft:12}} aria-label="Subscriptions">Subscriptions</Link>
              {token ? <Link to="/admin">Admin</Link> : null}
             </nav>
           </div>
         </header>

         <main className="container">
           <Routes>
             {/* Default landing should be /subscriptions; root redirects there when not logged in */}
            {/* If logged in, send users to the customer menu (avoid rendering AdminHome at root which caused hook mismatch) */}
            <Route path="/" element={token ? <Navigate to="/menu" replace /> : <HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/subscriptions" element={<SubscriptionPage />} />
            {/* Token-based tenant landing: /<token>/<restaurant-name> */}
            <Route path="/:token/:restaurant" element={<MenuPage />} />
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
