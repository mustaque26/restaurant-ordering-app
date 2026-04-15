import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'

function slugify(name) {
  if (!name) return ''
  return encodeURIComponent(
    name.trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9\-]/g, '')
  )
}

export default function AccountMenu({ tenantBadge, tenantName, tenantId, onLogout }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const dropdownRef = useRef(null)
  const closeTimerRef = useRef(null)
  const hoverRootRef = useRef(false)
  const hoverDropdownRef = useRef(false)
  const [dropdownStyle, setDropdownStyle] = useState(null)
  const navigate = useNavigate()
  const HOVER_PAD = 4 // overlap dropdown over the button by 4px to avoid tiny cursor gaps

  useEffect(() => {
    function onDoc(e) {
      const target = e.target
      const insideRoot = rootRef.current && rootRef.current.contains(target)
      const insideDropdown = dropdownRef.current && dropdownRef.current.contains(target)
      if (!insideRoot && !insideDropdown) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('click', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
      if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (open && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect()
      // compute center x of the button; we'll center the dropdown on this point
      const centerX = rect.left + rect.width / 2 + window.scrollX
      const top = rect.bottom + window.scrollY + 8 // small gap
      setDropdownStyle({ top, centerX })
    } else {
      setDropdownStyle(null)
    }
  }, [open])

  // recompute on resize/scroll while open
  useEffect(() => {
    function onResize() {
      if (!open || !rootRef.current) return
      const rect = rootRef.current.getBoundingClientRect()
      setDropdownStyle({ top: rect.bottom + window.scrollY - HOVER_PAD, left: rect.left + window.scrollX })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onResize)
    return () => { window.removeEventListener('resize', onResize); window.removeEventListener('scroll', onResize) }
  }, [open])

  const slug = slugify(tenantName)
  const tenantAdminUrl = tenantId ? `/${tenantId}/${slug}/admin` : '/admin'

  function clearCloseTimer() {
    if (closeTimerRef.current) { clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
  }
  function scheduleClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    // wait, then close only if neither root nor dropdown are hovered
    closeTimerRef.current = setTimeout(() => {
      if (!hoverRootRef.current && !hoverDropdownRef.current) {
        setOpen(false)
      }
      closeTimerRef.current = null
    }, 300)
  }

  // pointer-based handlers (more reliable than mouseenter for touch/mouse mixing)
  function handleRootPointerEnter() {
    hoverRootRef.current = true
    clearCloseTimer()
    setOpen(true)
  }
  function handleRootPointerLeave() {
    hoverRootRef.current = false
    scheduleClose()
  }

  function handleDropdownPointerEnter() {
    hoverDropdownRef.current = true
    clearCloseTimer()
  }
  function handleDropdownPointerLeave() {
    hoverDropdownRef.current = false
    scheduleClose()
  }

  useEffect(() => {
    if (!open) return
    // When dropdown is open, also treat the top-level nav Menu link as part of the hover area.
    // Lookup logic: match anchors where pathname === '/menu' or textContent === 'Menu' (robust for Vite/SSR).
    const anchors = Array.from(document.querySelectorAll('a'))
    const menuEl = anchors.find(a => {
      try {
        const href = a.getAttribute('href') || ''
        if (href === '/menu') return true
        const url = new URL(a.href, window.location.origin)
        if (url.pathname === '/menu') return true
      } catch (e) {
        // ignore URL parsing errors
      }
      // fallback: match visible text 'Menu'
      if ((a.textContent || '').trim() === 'Menu') return true
      return false
    })

    function onMenuEnter() {
      hoverRootRef.current = true
      clearCloseTimer()
    }
    function onMenuLeave() {
      hoverRootRef.current = false
      scheduleClose()
    }

    if (menuEl) {
      menuEl.addEventListener('pointerenter', onMenuEnter)
      menuEl.addEventListener('pointerleave', onMenuLeave)
    }
    return () => {
      if (menuEl) {
        menuEl.removeEventListener('pointerenter', onMenuEnter)
        menuEl.removeEventListener('pointerleave', onMenuLeave)
      }
    }
  }, [open])

  // Render dropdown centered under the account button. After mount, clamp left so it stays within viewport.
  const dropdownNode = open && dropdownStyle ? createPortal(
    <div
      ref={dropdownRef}
      className="account-dropdown"
      role="menu"
      style={{ position: 'absolute', top: dropdownStyle.top + 'px', left: dropdownStyle.centerX + 'px', transform: 'translateX(-50%) translateY(6px)' }}
      onPointerEnter={handleDropdownPointerEnter}
      onPointerLeave={handleDropdownPointerLeave}
    >
      <Link to="/menu" className="account-item" role="menuitem" onClick={() => setOpen(false)}>Open Menu</Link>
      <Link to={tenantAdminUrl} className="account-item" role="menuitem" onClick={() => setOpen(false)}>Tenant Settings</Link>
      {/* Add Item for admins (moved from header) */}
      <Link to="/admin" className="account-item" role="menuitem" onClick={() => setOpen(false)}>Add Item</Link>
      <Link to="/subscriptions" className="account-item" role="menuitem" onClick={() => setOpen(false)}>Subscriptions</Link>
      <div
        className="account-item account-action"
        role="menuitem"
        tabIndex={0}
        onClick={() => { setOpen(false); onLogout && onLogout(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setOpen(false); onLogout && onLogout(); } }}
      >Logout</div>
    </div>,
    document.body
  ) : null

  // After the dropdown mounts, measure and clamp to viewport so it doesn't overflow edges
  useEffect(() => {
    if (!open || !dropdownRef.current) return
    const el = dropdownRef.current
    const rect = el.getBoundingClientRect()
    const half = rect.width / 2
    const minLeft = half + 8
    const maxLeft = window.innerWidth - half - 8
    let desired = dropdownStyle?.centerX || 0
    if (desired < minLeft) desired = minLeft
    if (desired > maxLeft) desired = maxLeft
    // update inline style to clamped value
    el.style.left = desired + 'px'
    el.style.transform = 'translateX(-50%) translateY(6px)'
  }, [open, dropdownStyle])

  return (
    <div
      className="account-menu"
      ref={rootRef}
      onPointerEnter={handleRootPointerEnter}
      onPointerLeave={handleRootPointerLeave}
    >
      <button
        className="account-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={tenantName ? `${tenantName} account` : 'Account menu'}
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        {tenantBadge ? <span className="tenant-badge">{tenantBadge}</span> : null}
        <span className="tenant-name">{tenantName}</span>
        <span className="caret">▾</span>
      </button>

      {dropdownNode}
    </div>
  )
}
