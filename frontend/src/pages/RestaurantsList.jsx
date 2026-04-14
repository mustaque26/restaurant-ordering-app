import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import dizminuLogo from '../images/dizminuLogo.png'
import api from '../api'

export default function RestaurantsList() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState([])
  const [loading, setLoading] = useState(true)

  // Map thumbnail component: shows image when it loads, otherwise shows a simple fallback link+icon
  function MapThumb({ src, address, alt }) {
    const [ok, setOk] = useState(false)
    const [tried, setTried] = useState(false)

    if (!address) return null

    return (
      <div style={{width:'100%'}}>
        {src ? (
          <img
            src={src}
            alt={alt}
            className="map-thumb"
            onLoad={() => { setOk(true); setTried(true) }}
            onError={() => { setOk(false); setTried(true) }}
            style={{display: ok ? 'block' : 'none'}}
            onClick={(e)=>e.stopPropagation()}
          />
        ) : null}
        {/* if image not available or failed, show compact 'View map' link instead of repeating the address */}
        {(!ok && tried) || !src ? (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e)=>{ e.stopPropagation() }}
            className="map-link"
            title={address}
          >
            {/* inline pin SVG */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 2C8.686 2 6 4.686 6 8c0 4.5 6 12 6 12s6-7.5 6-12c0-3.314-2.686-6-6-6z" fill="#0b486b"/>
              <circle cx="12" cy="8" r="2" fill="#fff"/>
            </svg>
            <span style={{fontSize:13, fontWeight:600, marginLeft:6}}>View map</span>
          </a>
        ) : null}
      </div>
    )
  }

  useEffect(() => {
    let mounted = true
    api.get('/restaurants').then(res => {
      if (!mounted) return
      const list = res.data || []
      setRestaurants(list)
      // for items without address, fetch details and merge in (some backends may omit address in list)
      list.forEach(item => {
        if (!item.address) {
          api.get(`/restaurants/${item.id}`).then(d => {
            if (!mounted) return
            setRestaurants(prev => prev.map(p => p.id === item.id ? { ...p, address: d.data?.address || '' } : p))
          }).catch(()=>{})
        }
      })
      setLoading(false)
    }).catch(e => { console.debug('failed to load restaurants', e); if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  // Normalize logo URL: if relative, prefix with origin so <img> can load it correctly.
  function logoSrc(url) {
    if (!url) return dizminuLogo
    try {
      // treat absolute http(s) as-is
      if (/^https?:\/\//i.test(url)) return url
      // if starts with // treat as protocol-relative
      if (/^\/\//.test(url)) return window.location.protocol + url
      // otherwise make absolute relative to origin
      const leading = url.startsWith('/') ? '' : '/'
      return window.location.origin + leading + url
    } catch (e) {
      return dizminuLogo
    }
  }

  // Truncate a long string but keep full value in title/tooltip
  function truncate(text, max = 60) {
    if (!text) return ''
    if (text.length <= max) return text
    return text.slice(0, max - 1).trim() + '…'
  }

  // Parse/format description safely. If description is a JSON-like feature map, show enabled features only.
  function formatDescription(raw) {
    if (!raw) return ''
    // if it's already an object, use it
    let maybeObj = null
    if (typeof raw === 'object') maybeObj = raw
    else if (typeof raw === 'string') {
      const s = raw.trim()
      // avoid rendering raw JSON blob like {"payment":false,...}
      if (s.startsWith('{') && s.endsWith('}')) {
        try {
          maybeObj = JSON.parse(s)
        } catch (e) {
          // not valid JSON, fallthrough to return raw string
          return s
        }
      } else {
        return s
      }
    } else {
      return ''
    }

    // If we have a parsed object, check for known feature flags and build a human string
    const features = []
    if (maybeObj.payment) features.push('QR Payments')
    if (maybeObj.email) features.push('Email receipts')
    if (maybeObj.whatsapp) features.push('WhatsApp notifications')

    // If features list is empty, don't show the JSON object — return empty string
    if (features.length === 0) return ''
    return features.join(' • ')
  }

  return (
    <div>
      <div className="card pad mb">
        <h2>Restaurants</h2>
        {loading ? <div className="muted">Loading restaurants…</div> : (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:12}}>
            {restaurants.length === 0 ? <div className="muted">No restaurants available.</div> : restaurants.map(r => {
              const desc = formatDescription(r.description)
              const imgSrc = logoSrc(r.logoUrl)
              const address = r.address || ''
              const truncated = truncate(address, 70)
              // Build a Google Static Maps thumbnail URL. If a Vite env var VITE_GOOGLE_MAPS_KEY is set it will be appended.
              const MAP_KEY = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_KEY) ? String(import.meta.env.VITE_GOOGLE_MAPS_KEY).trim() : ''
              let staticMapUrl = null
              if (address) {
                const base = `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(address)}&zoom=15&size=240x120&scale=1&markers=color:red|${encodeURIComponent(address)}`
                staticMapUrl = MAP_KEY ? `${base}&key=${MAP_KEY}` : base
              }

              return (
                <div key={r.id} className="restaurant-card card pad" style={{cursor:'pointer'}} onClick={() => navigate(`/base/${r.id}/${r.slug}`)}>
                  <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                    {/* left column: logo + address + map thumbnail */}
                    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,width:100}}>
                      <img
                        src={imgSrc}
                        alt={r.name}
                        style={{width:72,height:72,objectFit:'cover',borderRadius:10}}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = dizminuLogo }}
                      />
                      <div style={{width:'100%', textAlign:'center'}}>
                        <div style={{fontSize:12, color:'#6b7280', marginBottom:4}}>Address</div>
                        {address ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={address}
                            onClick={(e) => e.stopPropagation()}
                            style={{textDecoration:'none', fontSize:13, color: 'inherit', fontWeight:600}}
                          >
                            {truncated}
                          </a>
                        ) : (
                          <div className="muted" style={{fontSize:13}}>Not provided</div>
                        )}
                      </div>
                      <MapThumb
                        src={staticMapUrl}
                        address={address}
                        alt={`Map for ${r.name}`}
                      />
                    </div>

                    {/* right column: name + description */}
                    <div style={{flex:1}}>
                      <div style={{fontWeight:800, fontSize:18, marginBottom:6}}>{r.name}</div>
                      {desc ? <div className="muted" style={{fontSize:13}}>{desc}</div> : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
