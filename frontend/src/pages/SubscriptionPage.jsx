import { useState, useEffect } from 'react'
import api from '../api'
import { setToken as saveToken, getToken, clearToken as removeToken } from '../tenantAuth'
import { useNavigate } from 'react-router-dom'

const FEATURE_PRICE = 100 // per extra feature (payment, email, whatsapp)

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState(null) // 'basic'|'prime'
  const [features, setFeatures] = useState({ payment: false, email: false, whatsapp: false })
  const [message, setMessage] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantLogo, setTenantLogo] = useState('')
  const [tenantEmail, setTenantEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showTenantForm, setShowTenantForm] = useState(false)

  // Login state
  const [showLogin, setShowLogin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginRestaurant, setLoginRestaurant] = useState('')
  const [loginOtp, setLoginOtp] = useState('')
  const [loginStep, setLoginStep] = useState(0) // 0 idle,1=otp sent
  const [token, setToken] = useState(getToken())
  const [tenantInfo, setTenantInfo] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (token) {
      // fetch tenant info
      api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setTenantInfo(res.data))
        .catch(() => {
          // invalid token -> clear
          setToken('')
          removeToken()
          setTenantInfo(null)
        })
    } else {
      setTenantInfo(null)
    }
  }, [token])

  function toggleToLogin() {
    setShowLogin(true)
    setMessage('')
  }

  function toggleToSubscribe() {
    setShowLogin(false)
    setMessage('')
  }

  const authHeaders = () => ({ headers: { Authorization: token ? `Bearer ${token}` : '' } })

  const sendLoginOtp = async () => {
    setMessage('')
    try {
      await api.post('/tenant-auth/send-otp', { email: loginEmail, restaurantName: loginRestaurant })
      setLoginStep(1)
      setMessage(`OTP sent to ${loginEmail}. Please check your inbox or spam and enter the 6-digit code here.`)
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to send OTP')
    }
  }

  const verifyLoginOtp = async () => {
    setMessage('')
    try {
      const res = await api.post('/tenant-auth/verify-otp', { email: loginEmail, otp: loginOtp })
      const t = res.data.token
      saveToken(t)
      setToken(t)
      setLoginStep(0)
      setMessage('Logged in successfully — redirecting to the menu...')
      // navigate to menu (App will show Menu when token present)
      navigate('/')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to verify OTP')
    }
  }

  const logout = () => {
    removeToken()
    setToken('')
    setTenantInfo(null)
    setMessage('Logged out')
    // remain on subscriptions page
  }

  function toggleFeature(name) {
    setMessage('')
    setFeatures(prev => ({ ...prev, [name]: !prev[name] }))
  }

  // When user chooses a plan, reveal the tenant details form
  function choosePlan(plan) {
    setSelectedPlan(plan)
    setShowTenantForm(true)
    setMessage('')
    // scroll to form (optional)
    setTimeout(() => {
      const el = document.querySelector('.tenant-form')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  // Submit tenant + subscription to backend
  async function submitSubscription() {
    setMessage('')
    if (!tenantName || !tenantEmail) {
      setMessage('Please provide restaurant name and admin email before submitting.')
      return
    }
    setSubmitting(true)
    try {
      let base = selectedPlan === 'basic' ? 299 : 599
      let extras = 0
      if (selectedPlan === 'prime') {
        extras = Object.values(features).filter(Boolean).length * FEATURE_PRICE
      }
      const total = base + extras
      const payload = {
        name: tenantName,
        logoUrl: tenantLogo,
        adminEmail: tenantEmail,
        plan: (selectedPlan || 'basic').toUpperCase(),
        featuresJson: JSON.stringify(features)
      }
      const res = await api.post('/tenants', payload)
      const tenant = res.data.tenant || res.data
      const setupToken = res.data.setupToken
      setMessage(`Tenant created (id=${tenant.id}). Setup token: ${setupToken}. Subscribed for ₹${total}`)
      // optionally navigate to tenant settings with token
      // location.href = `/tenant/${tenant.id}/settings?token=${setupToken}`
      setShowTenantForm(false)
    } catch (err) {
      console.error(err)
      setMessage('Failed to create tenant. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const basicBase = 299
  const primeBase = 599
  const selectedExtras = Object.entries(features).filter(([k, v]) => v).map(([k]) => k)
  const extrasTotal = selectedExtras.length * FEATURE_PRICE
  const primeTotal = primeBase + extrasTotal

  // Billing modal state
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [billingModalPlan, setBillingModalPlan] = useState(null)

  function openBillingModal(plan) {
    setBillingModalPlan(plan)
    setShowBillingModal(true)
  }

  function closeBillingModal() {
    setShowBillingModal(false)
    setBillingModalPlan(null)
  }

  return (
    <div className="subscription-page">
      {/* Billing modal (shows when user clicks info) */}
      {showBillingModal && (
        <div className="modal-overlay" onClick={closeBillingModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Billing details">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h4 style={{margin:0}}>Billing details</h4>
              <button className="modal-close" onClick={closeBillingModal} aria-label="Close">×</button>
            </div>
            <div style={{marginTop:10}}>
              <p className="muted" style={{marginBottom:8}}>
                Your first month is free for the <strong>{billingModalPlan || 'selected plan'}</strong>. After the free month, billing starts automatically at:
              </p>
              <ul className="features-list" style={{marginTop:0}}>
                <li>Basic: <strong>₹{basicBase}/month</strong></li>
                <li>Prime: <strong>₹{primeBase}/month</strong> (plus any optional feature fees)</li>
              </ul>
              <p className="muted" style={{marginTop:8}}>
                Extras (like Email or WhatsApp) are charged from the second month onward when enabled. Cancel anytime before the renewal to avoid charges.
              </p>
              <p className="muted" style={{marginTop:8}}>
                Need help? Contact support at <strong>support@dizminu.com</strong> and we’ll assist with setup or billing questions.
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 className="page-title">Subscriptions</h2>
        <div>
          <button className={`linkish ${!showLogin? 'active':''}`} onClick={toggleToSubscribe}>Subscribe</button>
          <button className={`linkish ${showLogin? 'active':''}`} onClick={toggleToLogin} style={{marginLeft:8}}>Login</button>
        </div>
      </div>
      <p className="muted">Subscribe or Login — choose a plan that fits your needs. Pricing shown in INR.</p>

      {/* If logged in, show tenant quick panel and hide subscription options */}
      {token && tenantInfo ? (
        <div className="card pad mb">
          <h3>Logged in as: {tenantInfo.name}</h3>
          <div>Admin: {tenantInfo.adminEmail}</div>
          <div style={{marginTop:8}}>
            <button onClick={() => navigate('/')}>Go to Menu</button>
            <button onClick={() => navigate('/admin')} style={{marginLeft:8}}>Go to Admin</button>
            <button onClick={logout} style={{marginLeft:8}}>Logout</button>
          </div>
        </div>
      ) : null}

      {/* Login panel */}
      {showLogin && !token && (
        <div className="card pad mb">
          <h3>Tenant Login</h3>
          {message && <div className="muted">{message}</div>}
          <div className="form-grid">
            <input placeholder="Tenant admin email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            <input placeholder="Restaurant name" value={loginRestaurant} onChange={(e) => setLoginRestaurant(e.target.value)} />
            {loginStep === 1 && (
              <input placeholder="Enter 6-digit OTP" value={loginOtp} onChange={(e) => setLoginOtp(e.target.value)} />
            )}
            {loginStep === 0 ? (
              <button onClick={sendLoginOtp}>Send OTP</button>
            ) : (
              <button onClick={verifyLoginOtp}>Verify OTP</button>
            )}
          </div>
        </div>
      )}

      {/* If not in login mode, show subscription options */}
      {!showLogin && !token && (
        <div className="subscription-grid">
          <div className={`sub-card ${selectedPlan === 'basic' ? 'selected' : ''}`}>
            <h3 className="sub-title">Basic</h3>
            <div className="price-row">
              <span className="strike">₹599</span>
              <span className="price">₹{basicBase}/month</span>
            </div>
            <ul className="features-list">
              <li>Access to menu and ordering</li>
              <li>Basic support</li>
              <li>No extra communication features</li>
            </ul>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div className="muted" style={{marginTop:6,fontWeight:700}}>Free for the first month</div>
              <button className="info-btn" onClick={() => openBillingModal('Basic')} aria-label="Billing info">i</button>
            </div>
            <button onClick={() => choosePlan('basic')} className="subscribe-btn">Choose Basic</button>
          </div>

          <div className={`sub-card ${selectedPlan === 'prime' ? 'selected' : ''}`}>
            <h3 className="sub-title">Prime</h3>
            <div className="price-row">
                <span className="strike">₹999</span>
              <span className="price">₹{primeBase}/month</span>
            </div>
            <ul className="features-list">
              <li>All Basic features</li>
              <li>Priority support</li>
              <li>Payment integration</li>
              <li>Enable extra facilities below (optional)</li>
            </ul>

            <div className="extras">
              <div className="extra-note">Payment integration</div>

              <div className="extra-row">
                <div className="col-checkbox">
                  <input id="feat-email" type="checkbox" checked={features.email} onChange={() => toggleFeature('email')} />
                </div>
                <label htmlFor="feat-email" className="col-label">Email notifications</label>
                <div className="col-price">+ ₹{FEATURE_PRICE}</div>
              </div>

              <div className="extra-row">
                <div className="col-checkbox">
                  <input id="feat-whatsapp" type="checkbox" checked={features.whatsapp} onChange={() => toggleFeature('whatsapp')} />
                </div>
                <label htmlFor="feat-whatsapp" className="col-label">WhatsApp notifications</label>
                <div className="col-price">+ ₹{FEATURE_PRICE}</div>
              </div>
            </div>

            <div className="price-summary">Total: <strong>₹{primeTotal}</strong></div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div className="muted" style={{marginTop:6,fontWeight:700}}>Free for the first month</div>
              <button className="info-btn" onClick={() => openBillingModal('Prime')} aria-label="Billing info">i</button>
            </div>
            <button onClick={() => choosePlan('prime')} className="subscribe-btn primary">Choose Prime</button>
          </div>
        </div>
      )}

      {message && <div className="subscribe-message">{message}</div>}

      {/* Tenant details form - shown after choosing a plan */}
      <div className={`card pad mt tenant-form ${showTenantForm ? '' : 'hidden'}`} style={{display: showTenantForm ? 'block' : 'none'}}>
         <h4>Tenant details</h4>
         <input placeholder="Restaurant name" value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
         <input placeholder="Logo URL (optional)" value={tenantLogo} onChange={(e) => setTenantLogo(e.target.value)} />
         <input placeholder="Admin email" value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} />
         <div style={{marginTop:8}}>
          <small className="muted">Tenant will be created on submit. You will receive admin details on the provided email.</small>
         </div>
         <div style={{marginTop:12}}>
          <button onClick={submitSubscription} disabled={submitting || !tenantName || !tenantEmail} className="subscribe-btn">{submitting ? 'Submitting...' : `Submit & Create Tenant (${selectedPlan ? selectedPlan.toUpperCase() : 'BASIC'})`}</button>
         </div>
       </div>

      <div className="faq card pad mt">
         <h4>Notes</h4>
         <ul>
           <li>Subscription will be activated after payment processing (simulated locally).</li>
           <li>WhatsApp/email features require server-side configuration (Twilio/SMTP).</li>
         </ul>
       </div>
     </div>
   )
}
