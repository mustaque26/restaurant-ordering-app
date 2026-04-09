import { useState } from 'react'
import api from '../api'

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

  return (
    <div className="subscription-page">
      <h2 className="page-title">Subscriptions</h2>
      <p className="muted">Choose a plan that fits your needs. Pricing shown in INR.</p>

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
          <button onClick={() => choosePlan('prime')} className="subscribe-btn primary">Choose Prime</button>
        </div>
      </div>

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
