import React, { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getToken } from '../tenantAuth'
import api from '../api'

export default function RequireAuth({ children }) {
  const token = getToken()
  const location = useLocation()
  const [status, setStatus] = useState('checking') // 'checking'|'ok'|'login'|'401'|'403'

  useEffect(() => {
    if (!token) { setStatus('login'); return }
    // verify token by calling /tenant-auth/me
    api.get('/tenant-auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(() => setStatus('ok'))
      .catch(err => {
        const code = err?.response?.status
        if (code === 401) setStatus('401')
        else if (code === 403) setStatus('403')
        else setStatus('401')
      })
  }, [token])

  if (status === 'checking') return <div style={{padding:20}}>Checking authentication...</div>
  if (status === 'login') return <Navigate to="/login" state={{ from: location }} replace />
  if (status === '401') return <Navigate to="/401" replace />
  if (status === '403') return <Navigate to="/403" replace />
  return children
}
