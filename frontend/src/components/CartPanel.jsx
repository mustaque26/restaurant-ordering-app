import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { useCart } from '../context/CartContext'
import QrSvg from './QrSvg'

export default function CartPanel({ qrImageUrl, tenantId = null }) {
  const { items, updateQuantity, clearCart, total } = useCart()
  const navigate = useNavigate()

  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [email, setEmail] = useState('') // Added email state
  const [paymentReference, setPaymentReference] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendWhatsappFlag, setSendWhatsappFlag] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const emailRef = useRef(null)
  const phoneRef = useRef(null)

  useEffect(() => {
    // email input is shown only when user explicitly selects the Email checkbox
    // (do not auto-toggle sendEmail based on email value)
  }, [email])

  useEffect(() => {
    // Do not auto-toggle WhatsApp when phone changes; the user should explicitly select the WhatsApp checkbox
    // Keep clearing validation message as user types
    if (phoneNumber && isValidPhone(phoneNumber)) {
      setPhoneError('')
    }
  }, [phoneNumber])

  // derived boolean: whether the form is ready to place order
  const canPlaceOrder = (() => {
    if (!customerName || !deliveryAddress) return false
    // at least one channel must be selected
    if (!sendEmail && !sendWhatsappFlag) return false
    // if email selected, email must be valid
    if (sendEmail && !isValidEmail(email)) return false
    // if whatsapp selected, phone must be valid
    if (sendWhatsappFlag && !isValidPhone(phoneNumber)) return false
    // basic checks passed
    return true
  })()

  const placeOrder = async () => {
    setError('')
    if (!customerName || !deliveryAddress) {
      setError('Please fill customer name and address.')
      return
    }
    if (items.length === 0) {
      setError('Cart is empty.')
      return
    }

    if (!sendEmail && !sendWhatsappFlag) {
      setError('Please select at least one delivery channel: Email or WhatsApp.')
      return
    }

    // validate selected channels have contact info
    if (sendEmail && !isValidEmail(email)) {
      setEmailError('Enter a valid email address to send by email')
      emailRef.current?.focus()
      return
    }
    if (sendWhatsappFlag && !isValidPhone(phoneNumber)) {
      setPhoneError('Enter a valid phone number (with country code) to send by WhatsApp')
      phoneRef.current?.focus()
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
        })),
        sendEmail,
        sendWhatsapp: sendWhatsappFlag,
        tenantId // include tenantId when present so server can attach order to tenant
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
        // Fetch full order details and pass via navigation state so the OrderSuccess page can show items
        try {
          const orderRes = await api.get(`/orders/${orderId}`)
          const orderObj = orderRes?.data
          navigate(`/order-success/${orderId}`, { state: { order: orderObj } })
        } catch (e) {
          // fallback to old behavior if fetch fails
          navigate(`/order-success/${orderId}`)
        }
      } else {
        setError('Order placed but server did not return an order id.')
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to place order')
    } finally {
      setLoading(false)
    }
  }

  // Helper to build a WhatsApp-friendly text summary for the current cart
  function buildWhatsappText() {
    const lines = items.map((it) => `- ${it.name} x${it.quantity} @ ₹${it.price.toFixed(2)} = ₹${(it.price * it.quantity).toFixed(2)}`).join('\n')
    return `Thank you for your order, ${customerName || 'Customer'}!\n\nItems:\n${lines}\n\nTotal: ₹${total.toFixed(2)}\n\nCustomer Phone: ${phoneNumber || ''}\nCustomer Email: ${email || ''}\nDelivery Address: ${deliveryAddress || ''}`
  }

  function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  }

  function normalizePhone(phone) {
    return phone.replace(/\D/g, '')
  }

  function isValidEmail(email) {
    return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const sendWhatsapp = () => {
    setMessage('')
    setError('')
    if (!isValidPhone(phoneNumber)) {
      setError('Please enter a valid phone number to send WhatsApp message.')
      return
    }
    if (items.length === 0) {
      setError('Cart is empty.')
      return
    }
    const phone = normalizePhone(phoneNumber)
    const text = buildWhatsappText()
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    // open in new tab
    window.open(url, '_blank')
    setMessage('WhatsApp window opened')
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
        <textarea placeholder="Delivery Address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows="3" />

        {/* Channel selectors placed below delivery address for clearer UX */}
        <div className="field-row">
          <label className="inline-checkbox">
            <input type="checkbox" checked={sendWhatsappFlag} onChange={(e) => {
              if (e.target.checked) {
                setSendWhatsappFlag(true)
                // show and focus the phone input
                setTimeout(() => phoneRef.current?.focus(), 0)
              } else {
                setSendWhatsappFlag(false)
                setPhoneError('')
              }
            }} />
            WhatsApp
          </label>
          {/* always render input to avoid layout shift; hide/disable when not selected */}
          <input
            ref={phoneRef}
            placeholder="Phone Number (with country code)"
            value={phoneNumber}
            onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError('') }}
            className={sendWhatsappFlag ? '' : 'input-hidden'}
            disabled={!sendWhatsappFlag}
          />
        </div>
        {phoneError && <div className="field-error">{phoneError}</div>}

        <div className="field-row">
          <label className="inline-checkbox">
            <input type="checkbox" checked={sendEmail} onChange={(e) => {
              if (e.target.checked) {
                setSendEmail(true)
                setTimeout(() => emailRef.current?.focus(), 0)
              } else {
                setSendEmail(false)
                setEmailError('')
              }
            }} />
            Email
          </label>
          {/* always render input to preserve layout; hide/disable when not selected */}
          <input
            ref={emailRef}
            placeholder="Email ID"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
            className={sendEmail ? '' : 'input-hidden'}
            disabled={!sendEmail}
          />
        </div>
        {emailError && <div className="field-error">{emailError}</div>}
      </div>

      <div className="form-section">
        <h3>Pay by QR Code</h3>
        {qrImageUrl ? (
          <img className="qr-image" src={qrImageUrl} alt="Payment QR" />
        ) : (
          <QrSvg className="qr-image" />
        )}
        <input
          placeholder="Payment Reference / UTR Number"
          value={paymentReference}
          onChange={(e) => setPaymentReference(e.target.value)}
        />
      </div>

      {error && <div className="error">{error}</div>}
      {message && <div className="message">{message}</div>}

      <button className="full-btn" onClick={placeOrder} disabled={loading || !canPlaceOrder}>
        {loading ? 'Placing Order...' : 'Place Delivery Order'}
      </button>
      {!canPlaceOrder && (
        <div className="helper">Please complete required fields and select a delivery channel with valid contact.</div>
      )}

      {/* Manual WhatsApp share removed: messages will be sent automatically according to selected channels */}
    </div>
  )
}
