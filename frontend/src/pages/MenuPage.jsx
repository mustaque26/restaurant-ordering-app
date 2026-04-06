import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import MenuCard from '../components/MenuCard'
import CartPanel from '../components/CartPanel'

export default function MenuPage() {
  const [items, setItems] = useState([])
  const [settings, setSettings] = useState(null)
  const [category, setCategory] = useState('All')

  useEffect(() => {
    fetchMenu()
    fetchSettings()
  }, [])

  const fetchMenu = async () => {
    const response = await api.get('/menu-items/available')
    setItems(response.data)
  }

  const fetchSettings = async () => {
    const response = await api.get('/settings')
    setSettings(response.data)
  }

  const categories = useMemo(() => ['All', ...new Set(items.map((item) => item.category))], [items])

  const filteredItems = category === 'All' ? items : items.filter((item) => item.category === category)

  return (
    <div className="layout">
      <section className="menu-section">
        <div className="row-between">
          <div>
            <h2>Today&apos;s Menu</h2>
            <p>Order your favorite dishes for delivery.</p>
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((cat) => <option key={cat}>{cat}</option>)}
          </select>
        </div>

        <div className="grid">
          {filteredItems.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <aside>
        <CartPanel qrImageUrl={settings?.paymentQrImageUrl} />
      </aside>
    </div>
  )
}
