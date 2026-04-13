import { useEffect, useState } from 'react'
import api from '../api'
import QrSvg from '../components/QrSvg'
import { setToken as saveToken, clearToken as removeToken, getToken } from '../tenantAuth'

const emptyForm = {
  name: '',
  description: '',
  price: '',
  category: '',
  imageUrl: '',
  available: true
}

export default function AdminPage() {
  const [items, setItems] = useState([])
  const [qrUrl, setQrUrl] = useState('')
  const [form, setForm] = useState(emptyForm)

  // new state for auth
  const [email, setEmail] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(0) // 0 = not logged in, 1 = otp sent, 2 = logged in
  const [token, setToken] = useState(getToken())

  const [message, setMessage] = useState('')
  const [tenant, setTenant] = useState(null)

  const authHeaders = () => ({ headers: { Authorization: token ? `Bearer ${token}` : '' } })

  useEffect(() => {
    const h = () => setToken(getToken())
    window.addEventListener('tenant-auth-changed', h)
    return () => window.removeEventListener('tenant-auth-changed', h)
  }, [])

  const load = async () => {
    const [itemsRes, settingsRes] = await Promise.all([
      api.get('/menu-items'),
      api.get('/settings')
    ])
    setItems(itemsRes.data)
    setQrUrl(settingsRes.data.paymentQrImageUrl)
  }

  useEffect(() => {
    if (token) {
      setStep(2)
      // fetch tenant details
      api.get('/tenant-auth/me', authHeaders()).then(res => setTenant(res.data)).catch(() => {
        setTenant(null)
        // token invalid -> clear
        setToken('')
        removeToken()
        setStep(0)
      })
    }
    load()
  }, [token])

  const createItem = async (e) => {
    e.preventDefault()
    try {
      await api.post('/menu-items', {
        ...form,
        price: Number(form.price)
      }, authHeaders())
      setForm(emptyForm)
      load()
      setMessage('Menu item created')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to create item')
    }
  }

  const toggleAvailability = async (item) => {
    try {
      await api.patch(`/menu-items/${item.id}/availability?available=${!item.available}`, null, authHeaders())
      load()
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to toggle availability')
    }
  }

  const updateQr = async () => {
    try {
      await api.put('/settings/payment-qr', { paymentQrImageUrl: qrUrl }, authHeaders())
      alert('QR updated successfully')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to update QR')
    }
  }

  // Auth flows
  const sendOtp = async () => {
    setMessage('')
    try {
      await api.post('/admin/send-otp', { email })
      setStep(1)
      setMessage(`OTP sent to ${email}. Please check your inbox or spam and enter the 6-digit code here.`)
    } catch (err) {
      // show backend message if available
      setMessage(err?.response?.data?.message || 'Failed to send OTP')
    }
  }

  const verifyOtp = async () => {
    setMessage('')
    try {
      const res = await api.post('/admin/verify-otp', { email, otp })
      const t = res.data.token
      setToken(t)
      saveToken(t)
      setStep(2)
      setMessage('Logged in successfully — redirecting to the admin dashboard...')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to verify OTP')
    }
  }

  const logout = () => {
    setToken('')
    removeToken()
    setStep(0)
    setMessage('Logged out')
  }

  return (
    <div className="admin-page">
      {/* Auth panel */}
      <div className="card pad mb">
        {message && <div className="message">{message}</div>}
        {step !== 2 ? (
          <div className="form-grid">
            <input placeholder="Tenant admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="Restaurant name" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} />
            {step === 1 && (
              <input placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            )}
            {step === 0 ? (
              <button onClick={sendOtp}>Send OTP</button>
            ) : (
              <button onClick={verifyOtp}>Verify OTP</button>
            )}
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Show admin features only when logged in */}
      {step === 2 ? (
        <>
          <div className="admin-grid">
            <div className="card pad">
              <h2>Add Menu Item</h2>
              <form onSubmit={createItem} className="form-grid">
                <input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required />
                <input placeholder="Category" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} required />
                <input placeholder="Price" type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} required />
                <input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({...form, imageUrl: e.target.value})} />
                <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows="3" />
                <label className="checkbox">
                  <input type="checkbox" checked={form.available} onChange={(e) => setForm({...form, available: e.target.checked})} />
                  Available today
                </label>
                <button type="submit">Save Menu Item</button>
              </form>
            </div>

            <div className="card pad">
              <h2>Payment QR Settings</h2>
              <input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="QR image URL" />
              <button onClick={updateQr}>Update QR</button>
              {qrUrl ? (
                <img src={qrUrl} alt="QR preview" className="qr-image" />
              ) : (
                <QrSvg className="qr-image" />
              )}
            </div>
          </div>

          <div className="card pad mt">
            <h2>Daily Menu Control</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>₹ {item.price}</td>
                    <td>{item.available ? 'Available' : 'Unavailable'}</td>
                    <td>
                      <button onClick={() => toggleAvailability(item)}>
                        Mark {item.available ? 'Unavailable' : 'Available'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card pad">
          <p>Please login with the tenant admin email and restaurant name to access tenant features.</p>
        </div>
      )}
    </div>
  )
}
