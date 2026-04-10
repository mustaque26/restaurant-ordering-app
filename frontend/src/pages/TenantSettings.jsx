import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import api from '../api'

export default function TenantSettings(){
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const params = useParams()
  // allow id to be passed either as query param (?id=) or as path param (/tenant/:id/settings)
  const id = searchParams.get('id') || params.id
  const token = searchParams.get('token')

  const [tenant, setTenant] = useState(null)
  const [name, setName] = useState('')
  const [logo, setLogo] = useState('')
  const [gmailAppPassword, setGmailAppPassword] = useState('')
  const [maskedPassword, setMaskedPassword] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!id || !token) return
    api.get(`/tenants/${id}/validate`, { params: { token } })
      .then(res => {
        setTenant(res.data)
        setName(res.data.name || '')
        setLogo(res.data.logoUrl || '')
        setMaskedPassword(res.data.gmailAppPasswordMasked || null)
      })
      .catch(err => {
        // surface backend error message when available (401 responses include { error: '...' })
        const serverMsg = err?.response?.data?.error || err?.response?.data?.message
        setMessage(serverMsg || 'Invalid or expired setup link')
      })
  }, [id, token])

  const save = async () => {
    try {
      const payload = { name, logoUrl: logo }
      if (gmailAppPassword && gmailAppPassword.length > 0) {
        payload.gmailAppPassword = gmailAppPassword
      }
      await api.put(`/tenants/${id}`, payload)
      setMessage('Tenant settings updated')
      // clear the local password field after save
      setGmailAppPassword('')
      // redirect to admin or login
      setTimeout(() => navigate('/admin'), 1000)
    } catch (err) {
      setMessage('Failed to save settings')
    }
  }

  if (!id || !token) return <div className="pad card">Invalid setup link</div>
  return (
    <div className="pad card">
      <h2>Tenant Setup</h2>
      {message && <div className="subscribe-message">{message}</div>}
      {tenant ? (
        <div>
          <input placeholder="Restaurant name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Logo URL" value={logo} onChange={(e) => setLogo(e.target.value)} />

          <div style={{marginTop:12}}>
            <label style={{display:'block',fontSize:12,color:'#666'}}>Gmail App Password (optional) - used to send emails from your address</label>
            {maskedPassword ? <div style={{marginBottom:6,fontSize:13,color:'#333'}}>Stored: {maskedPassword}</div> : null}
            <input placeholder="Enter Gmail app password to use tenant SMTP" value={gmailAppPassword} onChange={(e) => setGmailAppPassword(e.target.value)} />
            <small className="muted">If you set an app password here the system will attempt to send order emails using your Gmail account.</small>
          </div>

          <button onClick={save}>Save</button>
        </div>
      ) : (
        <div>Validating...</div>
      )}
    </div>
  )
}
