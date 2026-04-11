import { Link, Route, Routes, Navigate, useNavigate } from 'react-router-dom'
import MenuPage from './pages/MenuPage'
import AdminPage from './pages/AdminPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import { CartProvider } from './context/CartContext'
import SubscriptionPage from './pages/SubscriptionPage'
import TenantSettings from './pages/TenantSettings'
import { useEffect, useState } from 'react'
import { getToken } from './tenantAuth'

// import the dizminu logo image placed in src/images
import dizminuLogo from './images/dizminuLogo.png'

export default function App() {
  const [token, setToken] = useState(getToken())

  useEffect(() => {
    const h = () => setToken(getToken())
    window.addEventListener('tenant-auth-changed', h)
    return () => window.removeEventListener('tenant-auth-changed', h)
  }, [])

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
              {token ? <Link to="/">Menu</Link> : null}
              <Link to="/subscriptions" className="nav-home">Home</Link>
              {token ? <Link to="/admin">Admin</Link> : null}
            </nav>
          </div>
        </header>

        <main className="container">
          <Routes>
            {/* Default landing should be /subscriptions; root redirects there when not logged in */}
            <Route path="/" element={token ? <MenuPage /> : <Navigate to="/subscriptions" replace />} />
            <Route path="/subscriptions" element={<SubscriptionPage />} />
            <Route path="/tenant/:id/settings" element={<TenantSettings />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/order-success/:id" element={<OrderSuccessPage />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  )
}
