import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useCart } from '../context/CartContext'

export default function CartPanel({ qrImageUrl }) {
  const { items, updateQuantity, clearCart, total } = useCart()
  const navigate = useNavigate()

  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [email, setEmail] = useState('') // Added email state
  const [paymentReference, setPaymentReference] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const placeOrder = async () => {
    setError('')
    if (!customerName || !phoneNumber || !deliveryAddress) {
      setError('Please fill customer name, phone number and address.')
      return
    }
    if (items.length === 0) {
      setError('Cart is empty.')
      return
    }

    setLoading(true)
    try {
      const payload = {
        customerName,
        phoneNumber,
        email, // Include email in payload
        deliveryAddress,
        paymentReference,
        items: items.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity
        }))
      }

      const response = await api.post('/orders', payload)
      clearCart()
      const data = response?.data || {}
      let orderId = data.orderId ?? data.id
      if (!orderId) {
        const loc = response?.headers?.location || response?.headers?.Location
        if (loc) {
          orderId = loc.split('/').pop()
        }
      }

      if (orderId) {
        navigate(`/order-success/${orderId}`)
      } else {
        setError('Order placed but server did not return an order id.')
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to place order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cart">
      <h2>Your Order</h2>

      {items.length === 0 && <p>No items added yet.</p>}

      {items.map((item) => (
        <div key={item.id} className="cart-item">
          <div>
            <strong>{item.name}</strong>
            <div>₹ {item.price} × {item.quantity}</div>
          </div>
          <div className="qty-box">
            <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
            <span>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
          </div>
        </div>
      ))}

      <hr />
      <div className="row-between">
        <strong>Total</strong>
        <strong>₹ {total.toFixed(2)}</strong>
      </div>

      <div className="form-section">
        <h3>Delivery Details</h3>
        <input placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        <input placeholder="Phone Number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
        <input placeholder="Email ID" value={email} onChange={(e) => setEmail(e.target.value)} /> {/* Email input */}
        <textarea placeholder="Delivery Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows="3" />
      </div>

      <div className="form-section">
        <h3>Pay by QR Code</h3>
        <img className="qr-image" src={qrImageUrl} alt="Payment QR" />
        <input
          placeholder="Payment Reference / UTR Number"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <button className="full-btn" onClick={placeOrder} disabled={loading}>
        {loading ? 'Placing Order...' : 'Place Delivery Order'}
      </button>
    </div>
  )
}
