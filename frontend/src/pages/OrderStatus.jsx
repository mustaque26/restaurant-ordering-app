import { useParams, Link } from 'react-router-dom'
import { useEffect, useState, useRef } from 'react'
import api from '../api'
import { getToken } from '../tenantAuth'

const STATUS_STEP = ['ORDERED', 'IN_PROGRESS', 'SERVED', 'CLOSED']

function mapOrderStatusToStep(orderStatus) {
  if (!orderStatus) return 0
  const s = String(orderStatus).toUpperCase()
  // Map backend OrderStatus values to the 4-step customer-friendly flow
  if (s === 'CANCELLED') return 3 // closed
  if (s === 'DELIVERED') return 2 // served
  if (s === 'CONFIRMED' || s === 'OUT_FOR_DELIVERY') return 1 // in progress
  if (s === 'CREATED' || s === 'PAYMENT_PENDING' || s === 'PAYMENT_SUBMITTED') return 0 // ordered
  return 0
}

function mapStepToStatus(stepIndex) {
  switch (stepIndex) {
    case 0: return 'CREATED'
    case 1: return 'CONFIRMED'
    case 2: return 'DELIVERED'
    case 3: return 'CANCELLED'
    default: return 'CREATED'
  }
}

function Step({ idx, activeIdx, label, onClick, clickable }) {
  const isActive = idx === activeIdx
  const isDone = idx < activeIdx
  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: clickable ? 'pointer' : 'default'
  }
  const circleStyle = {
    width: 36,
    height: 36,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    color: isActive || isDone ? '#000' : '#fff',
    background: isActive || isDone ? '#fff' : 'transparent',
    border: '2px solid #fff',
  }
  const labelStyle = { color: '#fff', fontWeight: isActive ? 800 : 600, opacity: isActive ? 1 : 0.9 }
  return (
    <div style={base} onClick={clickable ? onClick : undefined}>
      <div style={circleStyle}>{isDone ? '✓' : idx + 1}</div>
      <div style={labelStyle}>{label}</div>
    </div>
  )
}

export default function OrderStatus() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [updating, setUpdating] = useState(false)
  const esRef = useRef(null)
  const pollRef = useRef(null)

  useEffect(() => {
    let mounted = true
    const fetchOrder = async () => {
      try {
        // Use the lightweight status endpoint to reduce payload
        const res = await api.get(`/orders/${id}/status`)
        if (!mounted) return
        // res.data is expected to be { id, status, createdAt, totalAmount }
        setOrder(res.data)
        setStepIndex(mapOrderStatusToStep(res.data?.status))
        setLoading(false)
      } catch (err) {
        console.error('OrderStatus: failed to load order status', err)
        if (mounted) {
          // If 404, show not found; otherwise show generic error
          const status = err?.response?.status
          const serverMsg = err?.response?.data?.error || err?.response?.data?.message
          if (status === 404) setError(serverMsg || 'Order not found.')
          else setError(serverMsg || 'Unable to load order status')
          setLoading(false)
        }
      }
    }
    fetchOrder()
    // Poll every 5 seconds to update status
    const iv = setInterval(fetchOrder, 5000)
    return () => { mounted = false; clearInterval(iv) }
  }, [id])

  useEffect(() => {
    if (order) setStepIndex(mapOrderStatusToStep(order.status))
  }, [order])

  const canUpdate = (() => {
    try {
      const t = getToken()
      const admin = localStorage.getItem('adminToken')
      return Boolean(t || admin)
    } catch (e) { return false }
  })()

  async function handleUpdateStep(targetIdx) {
    if (!canUpdate) {
      alert('You are not authorized to update order status. Please login as tenant or admin.')
      return
    }
    const newStatus = mapStepToStatus(targetIdx)
    // avoid redundant update
    const current = order?.status
    if (String(current).toUpperCase() === String(newStatus).toUpperCase()) return
    setUpdating(true)
    // choose token: tenant first, then admin
    const tenantToken = getToken()
    const adminToken = localStorage.getItem('adminToken')
    const headers = { headers: { Authorization: tenantToken ? `Bearer ${tenantToken}` : (adminToken ? `Bearer ${adminToken}` : '') } }
    try {
      const resp = await api.post(`/orders/${id}/status`, { status: newStatus }, headers)
      // update local UI optimistically
      setOrder(prev => ({ ...(prev || {}), status: resp.data?.status || newStatus }))
      setStepIndex(mapOrderStatusToStep(resp.data?.status || newStatus))
    } catch (e) {
      console.error('Failed to update order status', e)
      alert(e?.response?.data?.error || e.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const currentStatusLabel = STATUS_STEP[stepIndex] || 'ORDERED'

  const containerStyle = {
    minHeight: '70vh',
    padding: 24,
    background: '#000',
    color: '#fff',
    borderRadius: 12,
  }

  if (loading) return <div style={containerStyle}>Loading order status...</div>
  if (error) return <div style={containerStyle}>{error}</div>
  if (!order) return <div style={containerStyle}>Order not found.</div>

  // For lightweight responses some fields may be missing; guard them
  const customerName = order.customerName || order.name || '—'
  const phoneNumber = order.phoneNumber || order.phone || '—'
  const deliveryAddress = order.deliveryAddress || order.address || '—'
  const totalAmount = Number(order.totalAmount || order.total || 0)

  return (
    <div style={containerStyle} className="order-status-page">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}>
        <div>
          <div style={{fontSize:18,fontWeight:700}}>Order Status</div>
          <div style={{marginTop:8,opacity:0.9}}>Order Token: <strong style={{fontFamily:'monospace'}}>{order.id}</strong></div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:26,fontWeight:900,color:'#fff'}}>{currentStatusLabel.replaceAll('_',' ')}</div>
          <div style={{fontSize:12,opacity:0.75}}>Last updated: {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</div>
        </div>
      </div>

      <div style={{marginTop:24,display:'flex',gap:18,flexWrap:'wrap'}}>
        <Step idx={0} activeIdx={stepIndex} label="Ordered" onClick={() => handleUpdateStep(0)} clickable={!updating && canUpdate} />
        <div style={{flex:'0 0 24px', alignSelf:'center', height:2, background:'#fff', opacity:0.35, width:40}} />
        <Step idx={1} activeIdx={stepIndex} label="In progress" onClick={() => handleUpdateStep(1)} clickable={!updating && canUpdate} />
        <div style={{flex:'0 0 24px', alignSelf:'center', height:2, background:'#fff', opacity:0.35, width:40}} />
        <Step idx={2} activeIdx={stepIndex} label="Served" onClick={() => handleUpdateStep(2)} clickable={!updating && canUpdate} />
        <div style={{flex:'0 0 24px', alignSelf:'center', height:2, background:'#fff', opacity:0.35, width:40}} />
        <Step idx={3} activeIdx={stepIndex} label="Closed" onClick={() => handleUpdateStep(3)} clickable={!updating && canUpdate} />
      </div>

      <div style={{marginTop:28}}>
        <h4 style={{marginTop:0,color:'#fff'}}>Order details</h4>
        <div style={{color:'#fff',opacity:0.95}}><strong>Customer:</strong> {customerName}</div>
        <div style={{color:'#fff',opacity:0.95}}><strong>Phone:</strong> {phoneNumber}</div>
        <div style={{color:'#fff',opacity:0.95}}><strong>Address:</strong> {deliveryAddress}</div>
        <div style={{color:'#fff',opacity:0.95}}><strong>Total:</strong> ₹{totalAmount.toFixed(2)}</div>
      </div>

      <div style={{marginTop:18}}>
        <Link to="/" className="subscribe-btn" style={{background:'#fff',color:'#000'}}>Back to Menu</Link>
        <Link to={`/order-success/${order.id}`} className="subscribe-btn" style={{marginLeft:12}}>Order summary</Link>
      </div>
    </div>
  )
}
