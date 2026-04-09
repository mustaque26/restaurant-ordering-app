import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api'

export default function TenantSettings(){
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const id = searchParams.get('id')
  const token = searchParams.get('token')

  const [tenant, setTenant] = useState(null)
  const [name, setName] = useState('')
  const [logo, setLogo] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!id || !token) return
    api.get(`/tenants/${id}/validate`, { params: { token } })
      .then(res => {
        setTenant(res.data)
        setName(res.data.name || '')
        setLogo(res.data.logoUrl || '')
      })
      .catch(err => {
        setMessage('Invalid or expired setup link')
      })
  }, [id, token])

  const save = async () => {
    try {
      const payload = { name, logoUrl: logo }
      await api.put(`/tenants/${id}`, payload)
      setMessage('Tenant settings updated')
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
          <button onClick={save}>Save</button>
        </div>
      ) : (
        <div>Validating...</div>
      )}
    </div>
  )
}

