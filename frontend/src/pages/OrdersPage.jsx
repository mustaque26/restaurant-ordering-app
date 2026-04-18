import { useEffect, useState } from 'react'
import api from '../api'
import { getToken } from '../tenantAuth'
import { useNavigate, useLocation } from 'react-router-dom'

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState({})
  const [updatingOrderId, setUpdatingOrderId] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const showRecentOnly = params.get('recent') === '1'

  useEffect(() => {
     let mounted = true
     const load = async () => {
       setLoading(true)
       try {
         const token = getToken()
         const adminToken = typeof window !== 'undefined' ? (localStorage.getItem('adminToken') || '') : ''
         let me = null
         // if tenant token exists, fetch tenant info to determine tenantId
         if (token) {
           try {
             me = await api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } })
             if (mounted && me?.data?.id) setTenantId(me.data.id)
           } catch (e) {
             // ignore - not logged in as tenant
             console.debug('OrdersPage: failed to fetch tenant info', e)
           }
         }
         const reqOpts = token ? { headers: { Authorization: `Bearer ${token}` } } : (adminToken ? { headers: { Authorization: `Bearer ${adminToken}` } } : {})
         let res
         // If page requested recent-only, use the lightweight /orders/latest endpoint which supports tenantId and limit
        // recompute showRecentOnly from current location.search so changes to the query trigger a reload
        const curParams = new URLSearchParams(location.search)
        const curShowRecentOnly = curParams.get('recent') === '1'
        if (curShowRecentOnly) {
          const params = { limit: 3 }
          if (me && me.data && me.data.id) params.tenantId = me.data.id
          res = await api.get('/orders/latest', { params, ...(reqOpts || {}) })
          // Fallback: if tenant-scoped latest returns empty, try without tenantId
          if (Array.isArray(res.data) && res.data.length === 0 && params.tenantId) {
            console.debug('OrdersPage: /orders/latest returned empty for tenantId, retrying without tenantId')
            res = await api.get('/orders/latest', { params: { limit: 3 }, ...(reqOpts || {}) })
          }
          // Last resort: if still empty, fetch full list
          if (Array.isArray(res.data) && res.data.length === 0) {
            console.debug('OrdersPage: fallback to /orders since /orders/latest returned empty')
            res = await api.get('/orders', { ...(reqOpts || {}) })
          }
        } else {
          res = await api.get('/orders', { ...(reqOpts || {}) })
        }
         if (!mounted) return
         const arr = Array.isArray(res.data) ? res.data : []
         // initialize selectedStatus for rows
         const sel = {}
         arr.forEach(o => { sel[o.id] = (o.status ? mapStatusToSimple(o.status) : 'CREATED') })
         setSelectedStatus(sel)
         setOrders(arr)
         // compute visible count for tenant (only tenant-owned) or all
         const visibleCount = token && me?.data?.id ? arr.filter(o => o.tenantId && Number(o.tenantId) === Number(me.data.id)).length : arr.length
         try { window.dispatchEvent(new CustomEvent('orders-count', { detail: visibleCount })) } catch (e) {}
       } catch (err) {
         console.error('Failed to load orders', err)
         if (mounted) setError('Unable to load orders')
       } finally {
         if (mounted) setLoading(false)
       }
     }
     load()
    return () => { mounted = false }
  }, [location.search])

  async function performStatusUpdate(orderId) {
    const newStatus = selectedStatus[orderId]
    if (!newStatus) return
    setUpdatingOrderId(orderId)
    try {
      const token = getToken()
      const headers = { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      const resp = await api.post(`/orders/${orderId}/status`, { status: newStatus }, headers)
      // update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: resp.data.status } : o))
    } catch (err) {
      console.error('Failed to update order status', err)
      alert(err?.response?.data?.error || err?.message || 'Unable to update status')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  if (loading) return <div className="card pad">Loading orders...</div>
  if (error) return <div className="card pad">{error}</div>

  // If tenant is logged in, only show orders for that tenant
  let visible = tenantId ? orders.filter(o => o.tenantId && Number(o.tenantId) === Number(tenantId)) : orders
  // If recent flag present, show latest 3 by createdAt desc
  if (showRecentOnly) {
    visible = visible.slice().sort((a,b) => {
      const da = new Date(a.createdAt || a.created || 0)
      const db = new Date(b.createdAt || b.created || 0)
      return db - da
    }).slice(0,3)
  }
  const displayedOrders = visible

  return (
    <div>
      <div className="card pad mb">
        <h2>{showRecentOnly ? 'Recent Orders' : 'All Orders'}</h2>
        <p className="muted">{showRecentOnly ? 'Most recent orders for quick access.' : 'List of orders placed by customers.'}</p>
      </div>

      <div className="card pad">
        {displayedOrders.length === 0 ? (
          <div className="muted">No orders found.</div>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map(o => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.customerName || '—'}</td>
                    <td>{o.status}</td>
                    <td>{o.phoneNumber || '—'}</td>
                    <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.deliveryAddress || '—'}</td>
                    <td>₹{(Number(o.totalAmount) || 0).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-sm" onClick={() => navigate('/admin/orders/history')}>View</button>
                      <button className="btn btn-sm" style={{marginLeft:8}} onClick={() => navigate('/admin/orders/today')}>Track</button>
                      {/* If we're in recent-only mode, show a read-only status; otherwise allow inline updates for tenant-owned orders */}
                      {showRecentOnly ? (
                        <span style={{marginLeft:12}} className="status-pill">{o.status}</span>
                      ) : (
                        (tenantId && o.tenantId && Number(o.tenantId) === Number(tenantId)) ? (
                          <span style={{marginLeft:12}}>
                            <select value={selectedStatus[o.id] || 'CREATED'} onChange={(e) => setSelectedStatus(prev => ({...prev, [o.id]: e.target.value}))} style={{marginRight:8}}>
                              <option value="CREATED">Ordered</option>
                              <option value="CONFIRMED">In Progress</option>
                              <option value="DELIVERED">Served</option>
                              <option value="CANCELLED">Closed</option>
                            </select>
                            <button className="btn btn-sm" onClick={() => performStatusUpdate(o.id)} disabled={updatingOrderId === o.id}>{updatingOrderId === o.id ? 'Updating...' : 'Update'}</button>
                          </span>
                        ) : null
                      )}
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

// helper mapping for select default value (simple mapping similar to AdminHome)
function mapStatusToSimple(status) {
  if (!status) return 'CREATED'
  const s = String(status).toUpperCase()
  if (s === 'DELIVERED') return 'DELIVERED'
  if (s === 'CONFIRMED' || s === 'OUT_FOR_DELIVERY') return 'CONFIRMED'
  if (s === 'CANCELLED') return 'CANCELLED'
  return 'CREATED'
}
