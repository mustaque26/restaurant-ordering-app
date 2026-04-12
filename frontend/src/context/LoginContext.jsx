import React, { createContext, useContext, useState } from 'react'

const LoginContext = createContext(null)

export function LoginProvider({ children }) {
  const [showLogin, setShowLogin] = useState(false)
  return (
    <LoginContext.Provider value={{ showLogin, setShowLogin }}>
      {children}
    </LoginContext.Provider>
  )
}

export function useLogin() {
  const ctx = useContext(LoginContext)
  if (!ctx) throw new Error('useLogin must be used within LoginProvider')
  return ctx
}

