import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { setToken as saveToken } from '../tenantAuth'

function slugify(name) {
  if (!name) return ''
  return encodeURIComponent(
    name.trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-]/g, '')
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [restaurant, setRestaurant] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState(0) // 0=enter email, 1=enter otp
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function sendOtp() {
    setMessage('')
    if (!email) { setMessage('Please enter admin email'); return }
    try {
      await api.post('/tenant-auth/send-otp', { email, restaurantName: restaurant })
      setStep(1)
      setMessage(`OTP sent to ${email}. Check inbox or spam.`)
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to send OTP')
    }
  }

  async function verifyOtp() {
    setMessage('')
    if (!otp) { setMessage('Enter the 6-digit OTP'); return }
    try {
      const res = await api.post('/tenant-auth/verify-otp', { email, otp })
      const token = res.data.token || res.data
      if (token) {
        saveToken(token)
        // fetch tenant info and navigate to /<tenantId>/<slug>/admin
        try {
          const me = await api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } })
          const tenant = me.data
          const id = tenant?.id || ''
          const nameSlug = slugify(tenant?.name || restaurant || email)
          if (id) {
            navigate(`/${id}/${nameSlug}/admin`)
          } else {
            // fallback: go home
            navigate('/')
          }
        } catch (e) {
          // If fetching tenant fails, still redirect to root with token
          navigate('/')
        }
      } else {
        setMessage('Login succeeded but token missing')
      }
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to verify OTP')
    }
  }

  return (
    <div className="card pad mb">
      <h2>Tenant Login</h2>
      {message && <div className="muted" style={{marginBottom:8}}>{message}</div>}
      <div className="form-grid">
        <input placeholder="Tenant admin email" value={email} onChange={e => setEmail(e.target.value)} />
        <input placeholder="Restaurant name (optional)" value={restaurant} onChange={e => setRestaurant(e.target.value)} />
        {step === 1 && (
          <input placeholder="Enter 6-digit OTP" value={otp} onChange={e => setOtp(e.target.value)} />
        )}
        {step === 0 ? (
          <button onClick={sendOtp}>Send OTP</button>
        ) : (
          <div style={{display:'flex',gap:8}}>
            <button onClick={verifyOtp}>Verify OTP</button>
            <button onClick={() => { setStep(0); setOtp(''); setMessage('') }}>Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
