import { useState, useEffect } from 'react'
import api from '../api'
import { setToken as saveToken, getToken, clearToken as removeToken } from '../tenantAuth'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../analytics'

const FEATURE_PRICE = 100 // per extra feature (payment, email, whatsapp)

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState(null) // 'basic'|'prime'
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [features, setFeatures] = useState({ payment: false, email: false, whatsapp: false })
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Per-plan tenant form state (preserves entries when switching plans)
  const [tenantForms, setTenantForms] = useState({
    basic: { name: '', logo: '', email: '' },
    prime: { name: '', logo: '', email: '' }
  })
  const [tenantErrors, setTenantErrors] = useState({
    basic: { name: '', email: '' },
    prime: { name: '', email: '' }
  })

  function setTenantField(plan, field, value) {
    setTenantForms(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: value } }))
    setTenantErrors(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: '' } }))
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validateField(plan) {
    const form = tenantForms[plan]
    const errors = {}
    if (!form.name.trim()) errors.name = 'Restaurant name is required'
    if (!form.email.trim()) errors.email = 'Email is required'
    else if (!validateEmail(form.email)) errors.email = 'Please enter a valid email'
    setTenantErrors(prev => ({ ...prev, [plan]: { ...prev[plan], ...errors } }))
    return Object.keys(errors).length === 0
  }

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

  // Toggle plan selection — clicking the same plan again collapses the form
  function choosePlan(plan) {
    if (showTenantForm && selectedPlan === plan) {
      setShowTenantForm(false)
      setSelectedPlan(null)
      return
    }
    setSelectedPlan(plan)
    setShowTenantForm(true)
    setMessage('')
    trackEvent('plan_selected', { plan })
    setTimeout(() => {
      const el = document.getElementById(`tenant-form-${plan}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        const input = el.querySelector('input')
        if (input) input.focus()
      }
    }, 100)
  }

  // Submit tenant + subscription to backend
  async function submitSubscription() {
    if (!selectedPlan) return
    if (!validateField(selectedPlan)) return
    const form = tenantForms[selectedPlan]
    setMessage('')
    setSubmitting(true)
    try {
      let base = selectedPlan === 'basic' ? 299 : 599
      let extras = 0
      if (selectedPlan === 'prime') {
        extras = Object.values(features).filter(Boolean).length * FEATURE_PRICE
      }
      const total = base + extras
      const payload = {
        name: form.name,
        logoUrl: form.logo,
        adminEmail: form.email,
        plan: selectedPlan.toUpperCase(),
        featuresJson: JSON.stringify(features)
      }
      const res = await api.post('/tenants', payload)
      const tenant = res.data.tenant || res.data
      const setupToken = res.data.setupToken
      trackEvent('subscription_created', { plan: selectedPlan, total })
      setMessage(`Tenant created (id=${tenant.id}). Setup token: ${setupToken}. Subscribed for ₹${total}`)
      setShowTenantForm(false)
      setSelectedPlan(null)
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
    trackEvent('billing_modal_open', { plan })
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

      {/* HOMEPAGE / LANDING CONTENT (inserted into subscription dashboard) */}
      <div className="home-hero card pad mb">
        <div className="home-wordmark">Dizminu</div>
        <p className="home-subtitle muted">Digital menus, instant ordering and secure QR payments with automated Email & WhatsApp receipts. Setup in minutes. No apps required.</p>
        <div className="home-cta-row">
          <button className="subscribe-btn primary" onClick={() => choosePlan('prime')}>Get Started</button>
          <button className="subscribe-btn" style={{marginLeft:8,background:'#ffffff',color:'#071027'}} onClick={() => { const el = document.getElementById('features'); if (el) el.scrollIntoView({behavior:'smooth'}); }}>See Demo</button>
        </div>
        <div style={{marginTop:8}} className="muted">14‑day free trial · First month free · No credit card required</div>
      </div>

      <div id="benefits" className="card pad mb">
        <h3>Key benefits</h3>
        <ul className="features-list">
          <li>Faster table turns — guests order and pay from their phones.</li>
          <li>Fewer mistakes — orders route directly to your kitchen.</li>
          <li>Higher revenue — QR checkout and repeat-order prompts increase bills.</li>
          <li>Less admin work — update menus in seconds, publish instantly.</li>
        </ul>
      </div>

      <div id="how" className="card pad mb">
        <h3>How it works</h3>
        <ol className="features-list">
          <li>Create your menu in a clean dashboard.</li>
          <li>Publish a QR or share a link — no app needed.</li>
          <li>Accept orders and QR payments; orders reach the kitchen immediately.</li>
          <li>Automated Email & WhatsApp receipts for every order.</li>
        </ol>
      </div>

      <div id="features" className="card pad mb">
        <h3>Features</h3>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
          <div className="card pad"><strong>Digital Menu</strong><div className="muted">Mobile-first menus that load instantly from any QR or link.</div></div>
          <div className="card pad"><strong>Ordering System</strong><div className="muted">Two-tap ordering that routes directly to the kitchen.</div></div>
          <div className="card pad"><strong>QR Payments</strong><div className="muted">Fast, secure payments at table or takeaway.</div></div>
          <div className="card pad"><strong>WhatsApp Notifications</strong><div className="muted">Automated order confirmations and updates.</div></div>
          <div className="card pad"><strong>Email Notifications</strong><div className="muted">Branded receipts sent automatically to guests.</div></div>
          <div className="card pad"><strong>Daily Menu Updates</strong><div className="muted">Add, hide or change items in seconds.</div></div>
        </div>
      </div>

      <div className="card pad mb">
        <h3>Pricing at a glance</h3>
        <p className="muted">Basic — core ordering, QR menu and Email receipts. Prime — everything in Basic plus QR Payments, WhatsApp automation and priority support. Both plans include the first month free.</p>
      </div>

      <div className="card pad mb">
        <h3>Why Dizminu</h3>
        <ul className="features-list">
          <li>Built for restaurateurs — simple and reliable.</li>
          <li>Reduces queue times and order errors.</li>
          <li>Works with any QR reader — no apps required.</li>
          <li>Fast onboarding and local support.</li>
        </ul>
      </div>

      <div className="card pad mb" style={{textAlign:'center'}}>
        <h3>Ready to modernize service and grow revenue?</h3>
        <div><button className="subscribe-btn primary" onClick={() => choosePlan('prime')}>Start Free Trial</button></div>
        <div style={{marginTop:8}} className="muted">Free 14‑day trial · First month free · Cancel anytime</div>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h2 className="page-title">Home</h2>
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
            <button onClick={() => choosePlan('basic')} className="subscribe-btn" aria-expanded={showTenantForm && selectedPlan === 'basic'}>
              {showTenantForm && selectedPlan === 'basic' ? 'Cancel' : 'Choose Basic'}
            </button>
            <div
              id="tenant-form-basic"
              className={`tenant-form-container${showTenantForm && selectedPlan === 'basic' ? ' expanded' : ''}`}
              aria-hidden={!(showTenantForm && selectedPlan === 'basic')}
            >
              <div className="card pad mt">
                <h4>Tenant details — Basic</h4>
                <div>
                  <input placeholder="Restaurant name *" value={tenantForms.basic.name} onChange={(e) => setTenantField('basic', 'name', e.target.value)} />
                  {tenantErrors.basic.name && <div className="field-error">{tenantErrors.basic.name}</div>}
                </div>
                <input placeholder="Logo URL (optional)" value={tenantForms.basic.logo} onChange={(e) => setTenantField('basic', 'logo', e.target.value)} />
                <div>
                  <input placeholder="Admin email *" value={tenantForms.basic.email} onChange={(e) => setTenantField('basic', 'email', e.target.value)} />
                  {tenantErrors.basic.email && <div className="field-error">{tenantErrors.basic.email}</div>}
                </div>
                <div style={{marginTop:8}}>
                  <small className="muted">Tenant will be created on submit. You will receive admin details on the provided email.</small>
                </div>
                <div style={{marginTop:12}}>
                  <button onClick={submitSubscription} disabled={submitting} className="subscribe-btn">
                    {submitting ? 'Submitting...' : 'Submit & Create Tenant (BASIC)'}
                  </button>
                </div>
              </div>
            </div>
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
            <button onClick={() => choosePlan('prime')} className="subscribe-btn primary" aria-expanded={showTenantForm && selectedPlan === 'prime'}>
              {showTenantForm && selectedPlan === 'prime' ? 'Cancel' : 'Choose Prime'}
            </button>
            <div
              id="tenant-form-prime"
              className={`tenant-form-container${showTenantForm && selectedPlan === 'prime' ? ' expanded' : ''}`}
              aria-hidden={!(showTenantForm && selectedPlan === 'prime')}
            >
              <div className="card pad mt">
                <h4>Tenant details — Prime</h4>
                <div>
                  <input placeholder="Restaurant name *" value={tenantForms.prime.name} onChange={(e) => setTenantField('prime', 'name', e.target.value)} />
                  {tenantErrors.prime.name && <div className="field-error">{tenantErrors.prime.name}</div>}
                </div>
                <input placeholder="Logo URL (optional)" value={tenantForms.prime.logo} onChange={(e) => setTenantField('prime', 'logo', e.target.value)} />
                <div>
                  <input placeholder="Admin email *" value={tenantForms.prime.email} onChange={(e) => setTenantField('prime', 'email', e.target.value)} />
                  {tenantErrors.prime.email && <div className="field-error">{tenantErrors.prime.email}</div>}
                </div>
                <div style={{marginTop:8}}>
                  <small className="muted">Tenant will be created on submit. You will receive admin details on the provided email.</small>
                </div>
                <div style={{marginTop:12}}>
                  <button onClick={submitSubscription} disabled={submitting} className="subscribe-btn primary">
                    {submitting ? 'Submitting...' : `Submit & Create Tenant (PRIME — ₹${primeTotal}/mo)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && <div className="subscribe-message">{message}</div>}

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
