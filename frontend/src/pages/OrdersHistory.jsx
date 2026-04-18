import { useEffect, useState } from 'react'
import api from '../api'
import { getToken } from '../tenantAuth'

export default function OrdersHistory() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState(null)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    let mounted = true
    // load first page
    const load = async (pg = 0) => {
      if (pg === 0) setLoading(true)
      else setLoadingMore(true)
      try {
        const token = getToken()
        let headers = {}
        if (token) headers = { headers: { Authorization: `Bearer ${token}` } }
        const res = await api.get('/orders/history', { params: { page: pg, size }, ...(headers || {}) })
        if (!mounted) return
        const data = res.data || {}
        const content = Array.isArray(data.content) ? data.content : []
        // append or replace
        setOrders(prev => (pg === 0 ? content : [...prev, ...content]))
        setPage(data.page || pg)
        setTotalPages(data.totalPages || 0)
      } catch (e) {
        console.error('Failed to fetch history', e)
        if (mounted) setError('Unable to load order history')
      } finally {
        if (mounted) { setLoading(false); setLoadingMore(false) }
      }
    }
    load(0)
    return () => { mounted = false }
  }, [size])

  async function loadMore() {
    if (page + 1 >= totalPages) return
    await (async () => {
      try {
        const next = page + 1
        const token = getToken()
        let headers = {}
        if (token) headers = { headers: { Authorization: `Bearer ${token}` } }
        const res = await api.get('/orders/history', { params: { page: next, size }, ...(headers || {}) })
        const data = res.data || {}
        const content = Array.isArray(data.content) ? data.content : []
        setOrders(prev => [...prev, ...content])
        setPage(data.page || next)
        setTotalPages(data.totalPages || 0)
      } catch (e) {
        console.error('Failed to load more history', e)
        setError('Unable to load more history')
      }
    })()
  }

  if (loading) return <div className="card pad">Loading history...</div>
  if (error) return <div className="card pad">{error}</div>

  // group by date (local date string)
  const groups = orders.reduce((acc, o) => {
    const d = new Date(o.createdAt || o.created || Date.now())
    const key = d.toLocaleDateString()
    acc[key] = acc[key] || []
    acc[key].push(o)
    return acc
  }, {})

  const dates = Object.keys(groups).sort((a,b) => new Date(b) - new Date(a))

  return (
    <div>
      <div className="card pad mb">
        <h2>Order history</h2>
        <p className="muted">All orders grouped by date (newest first).</p>
      </div>

      {dates.length === 0 ? (
        <div className="card pad">No orders found.</div>
      ) : (
        dates.map(dateKey => (
          <div key={dateKey} className="card pad mb">
            <h4 style={{marginTop:0}}>{dateKey}</h4>
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
                  </tr>
                </thead>
                <tbody>
                  {groups[dateKey].map(o => (
                    <tr key={o.id}>
                      <td>{o.id}</td>
                      <td>{o.customerName || '—'}</td>
                      <td>{o.status}</td>
                      <td>{o.phoneNumber || '—'}</td>
                      <td style={{maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{o.deliveryAddress || '—'}</td>
                      <td>₹{(Number(o.totalAmount) || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {totalPages > (page + 1) ? (
        <div style={{textAlign:'center', marginTop:12}}>
          <button className="btn btn-sm" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Loading...' : 'Load more'}</button>
        </div>
      ) : null}
    </div>
  )
}
