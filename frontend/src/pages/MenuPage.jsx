import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import api from '../api'
import MenuCard from '../components/MenuCard'
import CartPanel from '../components/CartPanel'

export default function MenuPage() {
  // Support routes: /:token/:restaurant (token) and /base/:id/:restaurant (id)
  const routeParams = useParams()
  const token = routeParams.token || routeParams.id || '' // token may be numeric tenant id or a slug
  const [tenantId, setTenantId] = useState(null)
  const [resolved, setResolved] = useState(false)

  const [items, setItems] = useState([])
  const [settings, setSettings] = useState(null)
  const [category, setCategory] = useState('All')

  useEffect(() => {
    // Resolve the token once (numeric id or slug -> tenantId)
    let mounted = true
    async function resolve() {
      setResolved(false)
      setTenantId(null)
      if (!token) {
        setResolved(true)
        return
      }
      // numeric id
      if (/^\d+$/.test(token)) {
        setTenantId(Number(token))
        setResolved(true)
        return
      }
      try {
        const resp = await api.get(`/tenants/slug/${encodeURIComponent(token)}`)
        if (!mounted) return
        if (resp && resp.data && resp.data.id) {
          setTenantId(resp.data.id)
        }
      } catch (e) {
        // failed to resolve slug - leave tenantId null
        console.debug('Failed to resolve tenant slug:', token, e?.response?.status)
      } finally {
        if (mounted) setResolved(true)
      }
    }
    resolve()
    return () => { mounted = false }
  }, [token])

  useEffect(() => {
    if (!resolved) return
    fetchMenu()
    fetchSettings()
  }, [resolved, tenantId])

  const fetchMenu = async () => {
    const url = tenantId ? `/menu-items/available?tenantId=${tenantId}` : '/menu-items/available'
    const response = await api.get(url)
    setItems(response.data)
  }

  const fetchSettings = async () => {
    // pass tenantId as query param when available to get tenant-specific settings
    const url = tenantId ? `/settings?tenantId=${tenantId}` : '/settings'
    const response = await api.get(url)
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
        <CartPanel qrImageUrl={settings?.paymentQrImageUrl} tenantId={tenantId} />
      </aside>
    </div>
  )
}
