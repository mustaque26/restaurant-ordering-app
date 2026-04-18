import { useEffect, useState } from 'react'
import api from '../api'
import { getToken } from '../tenantAuth'
import { useNavigate } from 'react-router-dom'

export default function OrdersToday() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState(null)

  function statusColor(status) {
    const s = String(status || '').toUpperCase()
    switch (s) {
      case 'PAYMENT_PENDING': return '#ff9800' // orange
      case 'PAYMENT_SUBMITTED': return '#2196f3' // blue
      case 'CONFIRMED': return '#2196f3'
      case 'OUT_FOR_DELIVERY': return '#1976d2'
      case 'DELIVERED': return '#4caf50' // green
      case 'CANCELLED': return '#9e9e9e' // gray
      default: return '#607d8b' // default blue-gray
    }
  }

  function StatusBadge({ status }) {
    const color = statusColor(status)
    const label = status ? String(status).replaceAll('_', ' ') : '—'
    return (
      <span style={{display:'inline-block',padding:'6px 10px',borderRadius:12,background:color,color:'#fff',fontWeight:700,fontSize:12}}>{label}</span>
    )
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const token = getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined
      try {
        const res = await api.get('/orders/today', { params: { tenantId: tenantId || undefined, limit: 200 }, headers })
        if (!mounted) return
        const arr = Array.isArray(res.data) ? res.data : []

        // Defensive client-side filter for today's date (server does this already)
        const start = new Date(); start.setHours(0,0,0,0)
        const end = new Date(); end.setHours(23,59,59,999)
        const today = arr.filter(o => {
          try {
            const d = new Date(o.createdAt || o.created || o.date)
            if (isNaN(d)) return false
            return d >= start && d <= end
          } catch (e) {
            return false
          }
        })

        if (mounted) {
          setOrders(today)
          setError('')
        }
      } catch (e) {
        console.error('Failed to load today orders', e)
        if (mounted) setError('Unable to load today orders')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [tenantId])

  if (loading) return <div className="card pad">Loading today's orders...</div>
  if (error) return <div className="card pad">{error}</div>

  return (
    <div>
      <div className="card pad mb">
        <h2>Today's Orders</h2>
        <p className="muted">All orders placed today (newest first).</p>
      </div>

      <div className="card pad">
        {orders.length === 0 ? (
          <div className="muted">No orders for today.</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="table" style={{minWidth:900}}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Total</th>
                  <th>Track</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.customerName || '—'}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{o.phoneNumber || '—'}</td>
                    <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.deliveryAddress || '—'}</td>
                    <td>₹{(Number(o.totalAmount) || 0).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => navigate(`/order-status/${o.id}`)} style={{background:'#0b486b',color:'#fff',border:'none',padding:'6px 10px',borderRadius:6,cursor:'pointer'}}>Track</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
