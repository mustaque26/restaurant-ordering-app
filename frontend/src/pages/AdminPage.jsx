import { useEffect, useState } from 'react'
import api from '../api'
import QrSvg from '../components/QrSvg'

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
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(0) // 0 = not logged in, 1 = otp sent, 2 = logged in
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [message, setMessage] = useState('')

  const authHeaders = () => ({ headers: { Authorization: token ? `Bearer ${token}` : '' } })

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
      setMessage('OTP sent to your email')
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
      localStorage.setItem('admin_token', t)
      setStep(2)
      setMessage('Logged in')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to verify OTP')
    }
  }

  const logout = () => {
    setToken('')
    localStorage.removeItem('admin_token')
    setStep(0)
    setMessage('Logged out')
  }

  return (
    <div className="admin-page">
      {/* Auth panel */}
      <div className="card pad mb">
        <h2>Admin Login</h2>
        {message && <div className="message">{message}</div>}
        {step !== 2 ? (
          <div className="form-grid">
            <input placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {step === 1 && (
              <input placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} />
            )}
            {step === 0 ? (
              <button onClick={sendOtp}>Send OTP</button>
            ) : (
              <button onClick={verifyOtp}>Verify OTP</button>
            )}
          </div>
        ) : (
          <div>
            <div>Logged in as {email}</div>
            <button onClick={logout}>Logout</button>
          </div>
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
          <p>Please login with the admin email to access admin features.</p>
        </div>
      )}
    </div>
  )
}
