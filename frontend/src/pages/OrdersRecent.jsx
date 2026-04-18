import { useEffect, useState } from 'react'
import api from '../api'
import { getToken } from '../tenantAuth'
import { useNavigate } from 'react-router-dom'

export default function OrdersRecent() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      try {
        const token = getToken()
        const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') || '') : ''
        // infer tenant id if tenant token
        let tid = null
        if (token) {
          try {
            const me = await api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } })
            tid = me?.data?.id
            if (mounted) setTenantId(tid)
          } catch (e) {
            // ignore
          }
        }
        const reqOpts = token ? { headers: { Authorization: `Bearer ${token}` } } : (adminToken ? { headers: { Authorization: `Bearer ${adminToken}` } } : {})
        const params = tid ? { tenantId: tid, limit: 200 } : { limit: 200 }
        const res = await api.get('/orders/recent', { params, ...(reqOpts || {}) })
        if (!mounted) return
        setOrders(Array.isArray(res.data) ? res.data : [])
        setError('')
      } catch (e) {
        console.error('Failed to load recent orders', e)
        if (mounted) setError('Unable to load recent orders')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  async function updateStatus(orderId, newStatus) {
    setUpdatingId(orderId)
    try {
      const token = getToken()
      const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') || '') : ''
      const headers = token ? { headers: { Authorization: `Bearer ${token}` } } : (adminToken ? { headers: { Authorization: `Bearer ${adminToken}` } } : {})
      const resp = await api.post(`/orders/${orderId}/status`, { status: newStatus }, headers)
      // If status moved to closed (DELIVERED or CANCELLED), remove from recent list
      const closed = String(newStatus).toUpperCase() === 'DELIVERED' || String(newStatus).toUpperCase() === 'CANCELLED'
      setOrders(prev => prev.filter(o => o.id !== orderId))
      // update header badge count by refetching latest recent count
      try {
        const params = tenantId ? { tenantId, limit: 200 } : { limit: 200 }
        const latest = await api.get('/orders/recent', { params, ...(headers || {}) })
        const cnt = Array.isArray(latest.data) ? latest.data.length : 0
        window.dispatchEvent(new CustomEvent('orders-count', { detail: cnt }))
      } catch (e) {
        try { window.dispatchEvent(new CustomEvent('orders-count', { detail: 0 })) } catch {}
      }
    } catch (e) {
      console.error('Failed to update status', e)
      alert(e?.response?.data?.error || e?.message || 'Unable to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  function statusColor(status) {
    const s = String(status || '').toUpperCase()
    switch (s) {
      case 'PAYMENT_PENDING': return '#ff9800'
      case 'PAYMENT_SUBMITTED': return '#2196f3'
      case 'CONFIRMED': return '#2196f3'
      case 'OUT_FOR_DELIVERY': return '#1976d2'
      case 'DELIVERED': return '#4caf50'
      case 'CANCELLED': return '#9e9e9e'
      default: return '#607d8b'
    }
  }

  if (loading) return <div className="card pad">Loading recent orders...</div>
  if (error) return <div className="card pad">{error}</div>

  return (
    <div>
      <div className="card pad mb">
        <h2>Recent Orders</h2>
        <p className="muted">Active orders (not closed). Administrators can update status or mark as closed.</p>
      </div>

      <div className="card pad">
        {orders.length === 0 ? (
          <div className="muted">No recent orders.</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table className="table" style={{minWidth:1000}}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.customerName || '—'}</td>
                    <td><span style={{display:'inline-block',padding:'6px 10px',borderRadius:12,background:statusColor(o.status),color:'#fff',fontWeight:700}}>{String(o.status||'').replaceAll('_',' ')}</span></td>
                    <td>{o.phoneNumber || '—'}</td>
                    <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.deliveryAddress || '—'}</td>
                    <td>₹{(Number(o.totalAmount) || 0).toFixed(2)}</td>
                    <td>
                      <select defaultValue={o.status || 'CREATED'} onChange={(e) => updateStatus(o.id, e.target.value)} disabled={updatingId===o.id}>
                        <option value="CREATED">Ordered</option>
                        <option value="CONFIRMED">In Progress</option>
                        <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Closed</option>
                      </select>
                      <button className="btn btn-sm" style={{marginLeft:8}} onClick={() => updateStatus(o.id, 'CANCELLED')} disabled={updatingId===o.id}>Mark Closed</button>
                      <button className="btn btn-sm" style={{marginLeft:8}} onClick={() => navigate(`/order-status/${o.id}`)}>Track</button>
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

