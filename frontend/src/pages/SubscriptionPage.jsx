import { useState } from 'react'

const FEATURE_PRICE = 100 // per extra feature (payment, email, whatsapp)

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState(null) // 'basic'|'prime'
  const [features, setFeatures] = useState({ payment: false, email: false, whatsapp: false })
  const [message, setMessage] = useState('')

  function toggleFeature(name) {
    setMessage('')
    setFeatures(prev => ({ ...prev, [name]: !prev[name] }))
  }

  function subscribe(plan) {
    setSelectedPlan(plan)
    setMessage('')
    // calculate price
    let base = plan === 'basic' ? 299 : 599
    let extras = 0
    if (plan === 'prime') {
      extras = Object.values(features).filter(Boolean).length * FEATURE_PRICE
    }
    const total = base + extras
    // Here you would call backend API to create subscription / payment
    // For now just simulate success
    setTimeout(() => {
      setMessage(`Subscribed to ${plan === 'basic' ? 'Basic' : 'Prime'} plan. Amount: ₹${total}`)
    }, 300)
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
          <button onClick={() => subscribe('basic')} className="subscribe-btn">Subscribe ₹{basicBase}</button>
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
          <button onClick={() => subscribe('prime')} className="subscribe-btn primary">Subscribe ₹{primeTotal}</button>
        </div>
      </div>

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
