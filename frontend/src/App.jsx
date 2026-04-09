import { Link, Route, Routes } from 'react-router-dom'
import MenuPage from './pages/MenuPage'
import AdminPage from './pages/AdminPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import { CartProvider } from './context/CartContext'
import SubscriptionPage from './pages/SubscriptionPage'
import TenantSettings from './pages/TenantSettings'

export default function App() {
  return (
    <CartProvider>
      <div>
        <header className="topbar">
          <div className="container nav">
            <h1>Franzzo</h1>
            <nav>
              <Link to="/">Menu</Link>
              <Link to="/subscriptions">Subscription</Link>
              <Link to="/admin">Admin</Link>
            </nav>
          </div>
        </header>

        <main className="container">
          <Routes>
            <Route path="/" element={<MenuPage />} />
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
