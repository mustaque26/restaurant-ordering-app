import { Link, Route, Routes } from 'react-router-dom'
import MenuPage from './pages/MenuPage'
import AdminPage from './pages/AdminPage'
import OrderSuccessPage from './pages/OrderSuccessPage'
import { CartProvider } from './context/CartContext'

export default function App() {
  return (
    <CartProvider>
      <div>
        <header className="topbar">
          <div className="container nav">
            <h1>Franzzo</h1>
            <nav>
              <Link to="/">Menu</Link>
              <Link to="/admin">Admin</Link>
            </nav>
          </div>
        </header>

        <main className="container">
          <Routes>
            <Route path="/" element={<MenuPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/order-success/:id" element={<OrderSuccessPage />} />
          </Routes>
        </main>
      </div>
    </CartProvider>
  )
}
