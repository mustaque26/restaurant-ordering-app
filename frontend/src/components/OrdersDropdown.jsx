import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function OrdersDropdown({ token, adminToken, tenantId, badgeCount }) {
  const navigate = useNavigate()

  function handleClick() {
    // Navigate to orders page with recent flag; OrdersPage will show latest 3 when ?recent=1
    navigate('/admin/orders?recent=1')
  }

  return (
    <div style={{display:'inline-block',marginLeft:6}}>
      <button onClick={handleClick} className="nav-link" style={{display:'inline-flex',alignItems:'center',gap:8,background:'transparent',border:'none',cursor:'pointer'}}>
        <span>Orders</span>
        {badgeCount > 0 ? (
          <span style={{background:'#0b486b',color:'#fff',padding:'2px 8px',borderRadius:12,marginLeft:6,fontSize:12,fontWeight:700}}>{badgeCount}</span>
        ) : null}
      </button>
    </div>
  )
}
