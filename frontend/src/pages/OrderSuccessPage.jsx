import { Link, useParams, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api from '../api'

export default function OrderSuccessPage() {
  const { id } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(location.state?.order || null)
  const [loading, setLoading] = useState(!order)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const fetchOrder = async () => {
      if (order) return
      setLoading(true)
      try {
        const res = await api.get(`/orders/${id}`)
        if (!mounted) return
        setOrder(res.data)
      } catch (err) {
        console.error('Failed to load order', err)
        if (mounted) setError('Unable to load order details')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetchOrder()
    return () => { mounted = false }
  }, [id, order])

  if (loading) return <div className="pad card">Loading order details...</div>
  if (error) return <div className="pad card">{error}</div>
  if (!order) return <div className="pad card">Order not found.</div>

  const items = Array.isArray(order.items) ? order.items : []
  const totalFromItems = items.reduce((s, it) => s + Number(it.lineTotal || (it.price || 0) * (it.quantity || 1) || 0), 0)
  const total = Number(order.totalAmount || order.total || totalFromItems || 0)

  return (
    <div className="pad card">
      <h2>Order Placed Successfully</h2>
      <p style={{marginTop:6}}>Thank you, <strong>{order.customerName || 'Customer'}</strong>!</p>
      <p>Order ID: <strong>#{order.id}</strong></p>

      <div style={{marginTop:12,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontFamily:'Arial,Helvetica,sans-serif'}}>
          <thead>
            <tr style={{background:'#f6f8fa',textAlign:'left'}}>
              <th style={{padding:8,borderBottom:'1px solid #eaeaea'}}>Item</th>
              <th style={{padding:8,borderBottom:'1px solid #eaeaea'}}>Qty</th>
              <th style={{padding:8,borderBottom:'1px solid #eaeaea'}}>Price</th>
              <th style={{padding:8,borderBottom:'1px solid #eaeaea'}}>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id || `${it.menuItemId}-${it.itemName}`}>
                <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{it.itemName || it.name || 'Item'}</td>
                <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>{it.quantity}</td>
                <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>₹{Number(it.price || it.unitPrice || 0).toFixed(2)}</td>
                <td style={{padding:8,borderBottom:'1px solid #f1f1f1'}}>₹{Number(it.lineTotal || (it.price * it.quantity) || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{textAlign:'right',marginTop:12,fontSize:16,fontWeight:700}}>Total: ₹{total.toFixed(2)}</div>

      <div style={{marginTop:18}}>
        <h4 style={{margin:'6px 0'}}>Delivery Details</h4>
        <div style={{color:'#333'}}><strong>Address:</strong> {order.deliveryAddress || '—'}</div>
        <div style={{color:'#333'}}><strong>Phone:</strong> {order.phoneNumber || '—'}</div>
        <div style={{color:'#333'}}><strong>Email:</strong> {order.email || '—'}</div>
        {order.paymentReference && <div style={{color:'#333'}}><strong>Payment Ref:</strong> {order.paymentReference}</div>}
      </div>

      <div style={{marginTop:18,display:'flex',gap:12}}>
        <Link to="/" className="subscribe-btn">Back to Menu</Link>
        <button
          className="subscribe-btn"
          onClick={async () => {
            try {
              const resp = await fetch(`/api/orders/${order.id}/receipt.pdf`, { method: 'GET' })
              if (!resp.ok) {
                console.error('Failed to download receipt', resp.status)
                alert('Unable to download receipt at the moment')
                return
              }

              const contentType = resp.headers.get('content-type') || ''
              // Validate server actually returned a PDF; otherwise read body and show message
              if (!contentType.includes('application/pdf')) {
                const text = await resp.text()
                console.error('Receipt download returned non-PDF response:', contentType, text)
                alert('Server did not return a PDF when downloading the receipt. See console for details.')
                return
              }

              const blob = await resp.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `receipt-${order.id}.pdf`
              document.body.appendChild(a)
              a.click()
              a.remove()
              URL.revokeObjectURL(url)
            } catch (err) {
              console.error('Error fetching receipt PDF', err)
              alert('Error downloading receipt')
            }
          }}
        >Download Receipt</button>
      </div>
    </div>
  )
}
