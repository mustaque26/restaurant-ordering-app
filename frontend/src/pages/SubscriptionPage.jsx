import { useState, useEffect } from 'react'
import api from '../api'
import { setToken as saveToken, getToken, clearToken as removeToken } from '../tenantAuth'
import { useNavigate } from 'react-router-dom'
import { trackEvent } from '../analytics'

const FEATURE_PRICE = 100 // per extra feature (payment, email, whatsapp)

export default function SubscriptionPage() {
  // Plans and features
  const [selectedPlan, setSelectedPlan] = useState(null) // 'basic'|'prime'
  const [features, setFeatures] = useState({ payment: false, email: false, whatsapp: false })

  // Tenant/forms state
  const [tenantForms, setTenantForms] = useState({
    basic: { name: '', logo: '', email: '', address: '' },
    prime: { name: '', logo: '', email: '', address: '' }
  })
  const [tenantErrors, setTenantErrors] = useState({
    basic: { name: '', email: '', address: '' },
    prime: { name: '', email: '', address: '' }
  })

  // UI state
  const [message, setMessage] = useState('')
  const [existingTenants, setExistingTenants] = useState([])
  const [loginStep, setLoginStep] = useState(0) // 0 idle,1=otp sent
  const [token, setToken] = useState(getToken())
  const [tenantInfo, setTenantInfo] = useState(null)
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  // recently created tenant response (used to show success card with details + email note)
  const [createdTenantResp, setCreatedTenantResp] = useState(null)

  // Login fields
  const [loginEmail, setLoginEmail] = useState('')
  const [loginRestaurant, setLoginRestaurant] = useState('')
  const [loginOtp, setLoginOtp] = useState('')

  // Pricing (simple constants; keep editable)
  const basicBase = 299
  const primeBase = 599

  const navigate = useNavigate()

  useEffect(() => {
    if (token) {
      api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(res => setTenantInfo(res.data))
        .catch(() => {
          setToken('')
          removeToken()
          setTenantInfo(null)
        })
    } else {
      setTenantInfo(null)
    }
    // If navigated from Home's Get Started, auto-open selected plan stored in sessionStorage
    try {
      const p = sessionStorage.getItem('openSubscriptionPlan')
      if (p) {
        sessionStorage.removeItem('openSubscriptionPlan')
        // call choosePlan asynchronously to avoid hook dependency warnings
        setTimeout(() => {
          try { choosePlan(p) } catch (e) { console.debug('auto choosePlan failed', e) }
        }, 60)
      }
    } catch (e) {}
  }, [token])

  function toggleToSubscribe() {
    setMessage('')
  }

  function toggleFeature(name) {
    setMessage('')
    setFeatures(prev => ({ ...prev, [name]: !prev[name] }))
  }

  function choosePlan(plan) {
    // ensure login panel is closed when choosing a plan
    setMessage('')

    // toggle behavior: collapse if clicking same plan
    if (showTenantForm && selectedPlan === plan) {
      setShowTenantForm(false)
      setSelectedPlan(null)
      setMessage('')
      return
    }
    setSelectedPlan(plan)
    setShowTenantForm(true)
    setMessage('')

    // scroll into view with retries (component may render asynchronously)
    (function scrollToTenantFormWithRetry(attempts = 10, delay = 120) {
      let tries = 0
      const tryScroll = () => {
        const el = document.getElementById('tenant-form')
        if (el) {
          // tenant-form found; scroll into view
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            const firstInput = el.querySelector('input')
            if (firstInput) firstInput.focus()
          } catch (e) {
            // ignore DOM exceptions and stop
          }
          try { trackEvent('plan_selected', { plan }) } catch (e) {}
          return
        }
        // tenant-form not found yet; retry
        tries++
        if (tries <= attempts) {
          setTimeout(tryScroll, delay)
        } else {
          // fallback: still fire analytics even if form didn't render
          try { trackEvent('plan_selected', { plan }) } catch (e) {}
        }
      }
      // start after a short delay to allow React to schedule DOM updates
      setTimeout(tryScroll, 60)
    })()
  }

  // helpers
  function setTenantField(plan, field, value) {
    setTenantForms(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: value } }))
    setTenantErrors(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: '' } }))
  }

  function validateEmail(email) {
    if (!email) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function validateField(plan, field) {
    const value = tenantForms[plan][field]
    let err = ''
    if (field === 'name') {
      if (!value || !value.trim()) err = 'Restaurant name is required'
    }
    if (field === 'email') {
      if (!value || !value.trim()) err = 'Admin email is required'
      else if (!validateEmail(value)) err = 'Enter a valid email address'
    }
    setTenantErrors(prev => ({ ...prev, [plan]: { ...prev[plan], [field]: err } }))
    return err === ''
  }

  async function sendLoginOtp() {
    setMessage('')
    try {
      await api.post('/tenant-auth/send-otp', { email: loginEmail, restaurantName: loginRestaurant })
      setLoginStep(1)
      setMessage(`OTP sent to ${loginEmail}. Please check your inbox or spam and enter the 6-digit code here.`)
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to send OTP')
    }
  }

  async function verifyLoginOtp() {
    setMessage('')
    try {
      const res = await api.post('/tenant-auth/verify-otp', { email: loginEmail, otp: loginOtp })
      const t = res.data.token
      saveToken(t)
      setToken(t)
      setLoginStep(0)
      setMessage('Logged in successfully — redirecting to the menu...')
      navigate('/')
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Failed to verify OTP')
    }
  }

  function logout() {
    removeToken()
    setToken('')
    setTenantInfo(null)
    setMessage('Logged out')
  }

  async function submitSubscription() {
    setMessage('')
    if (!selectedPlan) {
      setMessage('Please choose a plan first.')
      return
    }
    const planKey = selectedPlan === 'basic' ? 'basic' : 'prime'
    const { name, email, logo, address } = tenantForms[planKey]
    const okName = validateField(planKey, 'name')
    const okEmail = validateField(planKey, 'email')
    if (!okName || !okEmail) {
      setMessage('Please fix validation errors before submitting.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        logoUrl: logo?.trim() || '',
        adminEmail: email.trim(),
        address: address?.trim() || '',
        plan: selectedPlan.toUpperCase(),
        featuresJson: JSON.stringify(features)
      }
      // api.baseURL already contains '/api', so use '/tenants' to avoid double '/api/api'
      const res = await api.post('/tenants', payload, { headers: authHeaders() })
      // backend returns { tenant: {...}, setupToken: '...' } (or older response may be tenant directly)
      const data = res.data || {}
      const tenant = data.tenant || data
      const setupToken = data.setupToken || null

      // Show a detailed success card with subscription details and a note about the email
      setCreatedTenantResp({ tenant, setupToken })
      setMessage('')
      setTenantForms(prev => ({ ...prev, [planKey]: { name: '', logo: '', email: '', address: '' } }))
      setShowTenantForm(false)
      setSelectedPlan(null)
      try { trackEvent('subscription_created', { tenantId: tenant?.id || null, plan: selectedPlan }) } catch (e) {}
    } catch (err) {
      // If backend returns 409 with existing tenants, show actionable message
      const status = err?.response?.status
      const data = err?.response?.data
      if (status === 409 && data) {
        setMessage(data.error || 'A tenant already exists for this admin email.')
        setExistingTenants(data.existingTenants || [])
      } else {
        setMessage(data?.message || 'Failed to create tenant')
        setExistingTenants([])
      }
    } finally {
      setSubmitting(false)
    }
  }

  function authHeaders() {
    return { headers: { Authorization: token ? `Bearer ${token}` : '' } }
  }

  // Billing modal state (kept simple)
  const [showBillingModal, setShowBillingModal] = useState(false)
  const [billingModalPlan, setBillingModalPlan] = useState(null)
  function openBillingModal(plan) { setBillingModalPlan(plan); setShowBillingModal(true) }
  function closeBillingModal() { setShowBillingModal(false); setBillingModalPlan(null) }

  return (
    <div className="subscription-page">
      {/* Success card shown right after successful subscription creation */}
      {createdTenantResp && createdTenantResp.tenant && (
        <div className="card pad mb success-card" style={{borderLeft:'4px solid #0b486b'}}>
          <h3 style={{marginTop:0}}>Tenant created successfully</h3>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{fontWeight:700,fontSize:18}}>{createdTenantResp.tenant.name || '—'}</div>
              <div className="muted">Admin: {createdTenantResp.tenant.adminEmail || '—'}</div>
              {createdTenantResp.tenant.address ? <div className="muted">Address: {createdTenantResp.tenant.address}</div> : null}
            </div>
            <div style={{marginLeft:'auto',textAlign:'right'}}>
              <div style={{fontSize:16,fontWeight:700}}>{createdTenantResp.tenant.plan || '—'}</div>
              <div className="muted">{createdTenantResp.tenant.subscriptionAmount ? `₹${createdTenantResp.tenant.subscriptionAmount}` : 'Amount: —'}</div>
            </div>
          </div>
          <div style={{marginTop:12}}>
            <p style={{margin:0}}>We have sent an onboarding email to <strong>{createdTenantResp.tenant.adminEmail}</strong>. Please open the email and click the <strong>Complete setup</strong> link to finish configuration (you may need to check your spam folder).</p>
            <p style={{marginTop:8}} className="muted">If you didn't receive the email within a few minutes, contact support@dizminu.com or try resending from the admin dashboard.</p>
          </div>
        </div>
      )}

      {/* Billing modal */}
      {showBillingModal && (
        <div className="modal-overlay" onClick={closeBillingModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Billing details">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h4 style={{margin:0}}>Billing details</h4>
              <button onClick={closeBillingModal}>Close</button>
            </div>
            <div style={{marginTop:10}}>
              <p className="muted" style={{marginBottom:8}}>
                Your first month is free for the <strong>{billingModalPlan || 'selected plan'}</strong>. After the free month, billing starts automatically at:
              </p>
              <ul>
                <li>Prime: <strong>₹{primeBase}/month</strong> (plus any optional feature fees)</li>
                <li>Basic: <strong>₹{basicBase}/month</strong></li>
              </ul>
              <p className="muted" style={{marginTop:8}}>
                Extras (like Email or WhatsApp) are charged from the second month onward when enabled. Cancel anytime before the renewal to avoid charges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page header for Subscriptions */}
      <div className="card pad mb">
        <h2 className="page-title">Subscriptions</h2>
        <p className="muted">Choose a plan that fits your restaurant. First month free.</p>
      </div>

      {/* If user is logged in and tenantInfo exists, show existing subscription details with a simple timeline */}
      {tenantInfo && (
        <div className="card pad mb">
          <h3>Your subscription</h3>
          <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
            <div>
              <div style={{fontWeight:700,fontSize:18}}>{tenantInfo.name || 'Your Restaurant'}</div>
              <div className="muted">Admin: {tenantInfo.adminEmail}</div>
            </div>
            <div style={{marginLeft:'auto',textAlign:'right'}}>
              <div style={{fontSize:16,fontWeight:700}}>{tenantInfo.plan || '—'}</div>
              <div className="muted">{tenantInfo.subscriptionAmount ? `₹${tenantInfo.subscriptionAmount}` : 'Amount: —'}</div>
            </div>
          </div>

          <div style={{marginTop:12}}>
            <h4 style={{marginBottom:8}}>Timeline</h4>
            <ul className="timeline" style={{paddingLeft:16,margin:0}}>
              <li style={{marginBottom:6}}><strong>Created:</strong> {tenantInfo.createdAt ? new Date(tenantInfo.createdAt).toLocaleString() : '—'}</li>
              <li style={{marginBottom:6}}><strong>Plan:</strong> {tenantInfo.plan || '—'}</li>
              <li style={{marginBottom:6}}><strong>Onboarded:</strong> {tenantInfo.onboarded ? 'Yes' : 'Pending'}</li>
              {tenantInfo.gmailAppPasswordMasked ? (
                <li style={{marginBottom:6}}><strong>Gmail SMTP:</strong> Stored ({tenantInfo.gmailAppPasswordMasked})</li>
              ) : (
                <li style={{marginBottom:6}}><strong>Gmail SMTP:</strong> Not configured</li>
              )}
            </ul>
          </div>

          <div style={{marginTop:12,display:'flex',gap:8}}>
            <button onClick={() => { setMessage('To change your plan, contact support or create a new subscription.'); }} className="subscribe-btn">Manage / Upgrade</button>
            <button onClick={() => { navigate('/admin') }} className="subscribe-btn">Open Admin</button>
          </div>
        </div>
      )}

      {/* Subscription plans grid (Basic / Prime) */}
      <div className="subscription-grid" style={{marginTop:18}}>
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
          <button onClick={() => choosePlan('basic')} className="subscribe-btn" style={{marginTop:12}}>Choose Basic</button>
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
          </ul>
          <div className="extras" style={{marginTop:10}}>
            <div className="extra-row">
              <div className="col-checkbox"><input id="feat-email" type="checkbox" checked={features.email} onChange={() => toggleFeature('email')} /></div>
              <label htmlFor="feat-email" className="col-label">Email notifications</label>
              <div className="col-price">+ ₹{FEATURE_PRICE}</div>
            </div>
            <div className="extra-row">
              <div className="col-checkbox"><input id="feat-whatsapp" type="checkbox" checked={features.whatsapp} onChange={() => toggleFeature('whatsapp')} /></div>
              <label htmlFor="feat-whatsapp" className="col-label">WhatsApp notifications</label>
              <div className="col-price">+ ₹{FEATURE_PRICE}</div>
            </div>
          </div>
          <button onClick={() => choosePlan('prime')} className="subscribe-btn primary" style={{marginTop:12}}>Choose Prime</button>
        </div>
      </div>

      {/* If a plan is selected, show the tenant details form below the hero */}
      {/* Collapsible container for tenant form (smooth expand + appear animation) */}
      {selectedPlan && (
        <div id="tenant-form-wrapper" className={`tenant-form-container ${showTenantForm ? 'expanded' : ''}`}>
          {showTenantForm && (
            <div id="tenant-form" className={`card pad mt tenant-form appear`}>
              <h4>Tenant details — {selectedPlan?.toUpperCase()}</h4>
              <input placeholder="Restaurant name" value={tenantForms[selectedPlan].name} onChange={(e) => setTenantField(selectedPlan,'name',e.target.value)} onBlur={() => validateField(selectedPlan,'name')} />
              {tenantErrors[selectedPlan].name && <div className="field-error">{tenantErrors[selectedPlan].name}</div>}
              <input placeholder="Logo URL (optional)" value={tenantForms[selectedPlan].logo} onChange={(e) => setTenantField(selectedPlan,'logo',e.target.value)} />
              <input placeholder="Admin email" value={tenantForms[selectedPlan].email} onChange={(e) => setTenantField(selectedPlan,'email',e.target.value)} onBlur={() => validateField(selectedPlan,'email')} />
              {tenantErrors[selectedPlan].email && <div className="field-error">{tenantErrors[selectedPlan].email}</div>}

              {/* New address field */}
              <input placeholder="Restaurant address (optional)" value={tenantForms[selectedPlan].address} onChange={(e) => setTenantField(selectedPlan,'address',e.target.value)} />
              {tenantErrors[selectedPlan].address && <div className="field-error">{tenantErrors[selectedPlan].address}</div>}

              <div style={{marginTop:12}}>
                <button onClick={submitSubscription} disabled={submitting || !tenantForms[selectedPlan].name || !tenantForms[selectedPlan].email} className="subscribe-btn">{submitting ? 'Submitting...' : `Submit & Create Tenant (${selectedPlan ? selectedPlan.toUpperCase() : ''})`}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
