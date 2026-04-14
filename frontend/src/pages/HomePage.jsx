import { useNavigate } from 'react-router-dom'
import dizminuLogo from '../images/dizminuLogo.png'
import { useEffect, useState } from 'react'
import api from '../api'

export default function HomePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    api.get('/restaurants').then(res => {
      if (!mounted) return
      setLoading(false)
    }).catch(e => {
      console.debug('failed to load restaurants', e)
      if (mounted) setLoading(false)
    })
    return () => { mounted = false }
  }, [])

  return (
    <div>
      <div className="home-hero card pad mb">
        <div className="home-wordmark">Dizminu</div>
        <p className="home-subtitle muted">Digital menus, instant ordering and secure QR payments with automated Email & WhatsApp receipts. Setup in minutes. No apps required.</p>
        <div className="home-cta-row">
          <button className="subscribe-btn primary" onClick={() => {
            try { sessionStorage.setItem('openSubscriptionPlan', 'prime') } catch (e) {}
            navigate('/subscriptions')
          }}>Get Started</button>
          <button className="subscribe-btn" style={{marginLeft:8,background:'#ffffff',color:'#071027'}} onClick={() => { const el = document.getElementById('features'); if (el) el.scrollIntoView({behavior:'smooth'}); }}>See Demo</button>
        </div>
      </div>

      {/* Restaurants list moved to /restaurants page */}

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
        <div><button className="subscribe-btn primary" onClick={() => { try { sessionStorage.setItem('openSubscriptionPlan', 'prime') } catch (e) {} navigate('/subscriptions') }}>Start Free Trial</button></div>
        <div style={{marginTop:8}} className="muted">Free 14‑day trial · First month free · Cancel anytime</div>
      </div>
    </div>
  )
}
