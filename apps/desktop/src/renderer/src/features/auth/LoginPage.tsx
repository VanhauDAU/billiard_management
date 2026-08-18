import React, { useState } from 'react'
import type { DesktopAuthState } from '../../../../shared/auth-api'
import loginIllustration from '../../assets/login-illustration.png'

interface LoginPageProps {
  onLoginSuccess: (authState: DesktopAuthState) => void
}

export function LoginPage({ onLoginSuccess }: LoginPageProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'owner' | 'staff'>('staff')

  // Form states
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const res = await window.desktopApi.auth.loginWithPassword({
        username: username.trim(),
        password: password.trim(),
        roleType: activeTab === 'owner' ? 'owner' : 'staff'
      })

      if (res.ok) {
        onLoginSuccess({
          status: 'authenticated',
          session: {
            sessionId: res.data.sessionId,
            expiresAt: res.data.expiresAt,
            actor: {
              id: res.data.user.id,
              displayName: res.data.user.displayName,
              membershipId: `mem_${res.data.user.id}`,
              roleId: `role_${res.data.user.roleCode}`,
              roleName: res.data.user.roleName
            }
          },
          user: res.data.user,
          store: res.data.store
        })
      } else {
        setErrorMsg(res.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setErrorMsg('Không thể kết nối máy chủ. Vui lòng kiểm tra lại dịch vụ.')
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (tab: 'owner' | 'staff') => {
    setActiveTab(tab)
    setErrorMsg(null)
  }

  return (
    <div className="sapo-login-page">
      <div className="sapo-login-container">
        {/* Left column: Illustration & Value Proposition */}
        <div className="sapo-login-left">
          <div className="sapo-illustration-wrapper">
            <img
              src={loginIllustration}
              alt="Billiard Management Illustration"
              className="sapo-illustration-img"
            />
          </div>

          <div className="sapo-intro-text">
            <h3 className="sapo-intro-title">
              ProPOS – Phần mềm quản lý Nhà hàng và Dịch vụ dễ sử dụng nhất
            </h3>
            <p className="sapo-intro-desc">
              Tính tiền nhanh chóng & vận hành ổn định với phần mềm quản lý nhà hàng và dịch vụ được 230,000+ khách hàng tin dùng
            </p>
          </div>
        </div>

        {/* Right column: Login Card */}
        <div className="sapo-login-right">
          <div className="sapo-login-card">
            {/* Sapo Logo */}
            <div className="sapo-brand-logo">
              <span className="sapo-logo-text-green">Pro</span>
              <span className="sapo-logo-text-blue">POS</span>
            </div>

            {/* Navigation Tabs */}
            <div className="sapo-tabs-nav">
              <button
                type="button"
                className={`sapo-tab-item ${activeTab === 'owner' ? 'active' : ''}`}
                onClick={() => handleTabChange('owner')}
              >
                Chủ cửa hàng / Quản lý
              </button>
              <button
                type="button"
                className={`sapo-tab-item ${activeTab === 'staff' ? 'active' : ''}`}
                onClick={() => handleTabChange('staff')}
              >
                Nhân viên
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="sapo-alert-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="sapo-form">
              {/* Username field */}
              <div className="sapo-form-group">
                <div className="sapo-input-box">
                  <span className="sapo-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className="sapo-input-field"
                    placeholder="Tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="sapo-form-group">
                <div className="sapo-input-box">
                  <span className="sapo-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="sapo-input-field"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="sapo-toggle-pwd"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button type="submit" className="sapo-btn-submit" disabled={loading}>
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>

            {/* Bottom Support Info */}
            <div className="sapo-support-footer">
              <div className="sapo-hotline">
                Tổng đài hỗ trợ: <strong>1900 6750</strong>
              </div>
              <div className="sapo-working-hours">
                7h00 – 22h00 từ thứ 2 đến chủ nhật
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
