import React, { useEffect, useState } from 'react'
import type { DesktopAuthState } from '../../shared/auth-api'
import { LoginPage } from './features/auth/LoginPage'
import { DashboardLayout } from './features/dashboard/DashboardLayout'

function App(): React.JSX.Element {
  const [authState, setAuthState] = useState<DesktopAuthState | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuthState = async () => {
    try {
      const state = await window.desktopApi.auth.getState()
      setAuthState(state)
    } catch (err) {
      console.error('Failed to get auth state:', err)
      setAuthState({ status: 'signed_out' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void checkAuthState()
  }, [])

  const handleLogout = async () => {
    try {
      await window.desktopApi.auth.logout()
    } finally {
      setAuthState({ status: 'signed_out' })
    }
  }

  if (loading) {
    return (
      <div className="sapo-login-page">
        <div style={{ textAlign: 'center', color: '#1e293b' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎱</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
            Đang khởi động Billiard POS...
          </div>
        </div>
      </div>
    )
  }

  if (authState && authState.status === 'authenticated') {
    return <DashboardLayout authState={authState} onLogout={handleLogout} />
  }

  return <LoginPage onLoginSuccess={setAuthState} />
}

export default App