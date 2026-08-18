import React, { useState } from 'react'
import { toast } from 'sonner'

interface AccountSettingsScreenProps {
  onBack: () => void
}

const STORAGE_ACCOUNT_KEY = 'billiard_account_settings_v1'

interface AccountData {
  fullName: string
  username: string
  roleName: string
  phone: string
  email: string
  hasPin: boolean
}

export function AccountSettingsScreen({ onBack }: AccountSettingsScreenProps): React.JSX.Element {
  // Load saved profile data
  const getInitialAccount = (): AccountData => {
    try {
      const raw = localStorage.getItem(STORAGE_ACCOUNT_KEY)
      if (raw) {
        return JSON.parse(raw)
      }
    } catch (e) {
      console.warn('Could not read account settings from localStorage', e)
    }
    return {
      fullName: 'Lê Văn Hậu',
      username: 'admin',
      roleName: 'Chủ cửa hàng (Owner)',
      phone: '0777464347',
      email: 'vanhau1410@gmail.com',
      hasPin: true
    }
  }

  const initialAccount = getInitialAccount()

  // Profile Form state
  const [fullName, setFullName] = useState(initialAccount.fullName)
  const [username] = useState(initialAccount.username) // Read-only
  const [roleName] = useState(initialAccount.roleName) // Read-only
  const [phone, setPhone] = useState(initialAccount.phone)
  const [email, setEmail] = useState(initialAccount.email)

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // PIN Form state
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  // Forgot PIN Modal state
  const [isForgotPinModalOpen, setIsForgotPinModalOpen] = useState(false)
  const [verifyPasswordForPin, setVerifyPasswordForPin] = useState('')
  const [resetNewPin, setResetNewPin] = useState('')
  const [resetConfirmPin, setResetConfirmPin] = useState('')

  // 1. Save Profile Info
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    const updated: AccountData = {
      fullName: fullName.trim(),
      username,
      roleName,
      phone: phone.trim(),
      email: email.trim(),
      hasPin: true
    }
    try {
      localStorage.setItem(STORAGE_ACCOUNT_KEY, JSON.stringify(updated))
    } catch (err) {
      console.error('Failed to save account to localStorage:', err)
    }
    toast.success('Đã cập nhật thông tin tài khoản thành công!')
  }

  // 2. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại!')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự!')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không khớp!')
      return
    }

    try {
      const res = await window.desktopApi.auth.changePassword({
        currentPassword,
        newPassword
      })

      if (res.ok) {
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        toast.success('Đổi mật khẩu thành công!', {
          description: 'Mật khẩu mới đã được lưu vào cơ sở dữ liệu. Hãy dùng mật khẩu mới trong lần đăng nhập tiếp theo.'
        })
      } else {
        toast.error(res.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại!')
      }
    } catch (err) {
      console.error('Change password failed:', err)
      toast.error('Không thể kết nối máy chủ để đổi mật khẩu.')
    }
  }

  // 3. Change PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(newPin)) {
      toast.error('Mã PIN mới phải gồm đúng 4 chữ số!')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('Xác nhận mã PIN mới không trùng khớp!')
      return
    }

    try {
      const res = await window.desktopApi.auth.changePin({
        currentPin: currentPin || undefined,
        newPin
      })

      if (res.ok) {
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
        toast.success('Đổi mã PIN POS thành công!', {
          description: 'Mã PIN 4 số mới đã được lưu vào cơ sở dữ liệu và sẵn sàng để đăng nhập nhanh tại quầy'
        })
      } else {
        toast.error(res.message || 'Mã PIN hiện tại không chính xác!')
      }
    } catch (err) {
      console.error('Change PIN failed:', err)
      toast.error('Không thể kết nối máy chủ để đổi mã PIN.')
    }
  }

  // 4. Reset PIN via Account Password (Quên mã PIN)
  const handleResetPinViaPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyPasswordForPin) {
      toast.error('Vui lòng nhập mật khẩu tài khoản để xác thực!')
      return
    }
    if (!/^\d{4}$/.test(resetNewPin)) {
      toast.error('Mã PIN mới phải gồm đúng 4 chữ số!')
      return
    }
    if (resetNewPin !== resetConfirmPin) {
      toast.error('Xác nhận mã PIN mới không trùng khớp!')
      return
    }

    try {
      const res = await window.desktopApi.auth.changePin({
        verifyPassword: verifyPasswordForPin,
        newPin: resetNewPin
      })

      if (res.ok) {
        setIsForgotPinModalOpen(false)
        setVerifyPasswordForPin('')
        setResetNewPin('')
        setResetConfirmPin('')
        toast.success('Khôi phục mã PIN thành công!', {
          description: 'Đã thiết lập lại mã PIN mới vào cơ sở dữ liệu qua xác thực mật khẩu chủ quán'
        })
      } else {
        toast.error(res.message || 'Mật khẩu tài khoản chủ quán không chính xác!')
      }
    } catch (err) {
      console.error('Reset PIN failed:', err)
      toast.error('Không thể kết nối máy chủ để cấp lại mã PIN.')
    }
  }

  return (
    <div className="account-settings-page">
      {/* Top Header with Back Navigation */}
      <div className="account-settings-topbar">
        <button type="button" className="zone-breadcrumb-back-btn" onClick={onBack}>
          <span>‹ Quay lại thiết lập cửa hàng</span>
        </button>
        <h1 className="account-settings-main-title">Thông tin tài khoản</h1>
      </div>

      {/* =========================================================
          SECTION 1: THÔNG TIN TÀI KHOẢN (MATCHING SCREENSHOT)
          ========================================================= */}
      <div className="account-section-grid">
        {/* Left Column */}
        <div className="account-meta-col">
          <h2 className="account-meta-heading">Thông tin tài khoản</h2>
          <p className="account-meta-desc">
            Thông tin về chủ cửa hàng, tên, email và số điện thoại
          </p>
        </div>

        {/* Right Form Card */}
        <div className="account-form-card">
          <form onSubmit={handleSaveProfile} className="account-form-body">
            {/* Họ và tên */}
            <div className="account-field-group">
              <label className="account-field-label">Họ và tên chủ cửa hàng</label>
              <input
                type="text"
                className="account-input-field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nhập họ và tên"
                required
              />
            </div>

            {/* Row: Tên đăng nhập (Read-only) + Vai trò (Read-only) */}
            <div className="account-row-2col">
              <div className="account-field-group">
                <label className="account-field-label">
                  Tên đăng nhập <span className="text-muted-tag">(Không thể sửa)</span>
                </label>
                <input
                  type="text"
                  className="account-input-field disabled-field"
                  value={username}
                  disabled
                  readOnly
                />
              </div>

              <div className="account-field-group">
                <label className="account-field-label">
                  Vai trò hệ thống <span className="text-muted-tag">(Không thể sửa)</span>
                </label>
                <input
                  type="text"
                  className="account-input-field disabled-field"
                  value={roleName}
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Row: Số điện thoại + Email */}
            <div className="account-row-2col">
              <div className="account-field-group">
                <label className="account-field-label">Số điện thoại</label>
                <input
                  type="text"
                  className="account-input-field"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0777464347"
                />
              </div>

              <div className="account-field-group">
                <label className="account-field-label">Email</label>
                <input
                  type="email"
                  className="account-input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Nhập địa chỉ email"
                />
              </div>
            </div>

            <div className="account-card-footer">
              <button type="submit" className="account-btn-save">
                Lưu thông tin
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="account-section-divider"></div>

      {/* =========================================================
          SECTION 2: ĐỔI MẬT KHẨU
          ========================================================= */}
      <div className="account-section-grid">
        {/* Left Column */}
        <div className="account-meta-col">
          <h2 className="account-meta-heading">Đổi mật khẩu</h2>
          <p className="account-meta-desc">
            Cập nhật mật khẩu định kỳ để tăng cường an toàn và bảo mật cho tài khoản quản trị.
          </p>
        </div>

        {/* Right Form Card */}
        <div className="account-form-card">
          <form onSubmit={handleChangePassword} className="account-form-body">
            <div className="account-field-group">
              <label className="account-field-label">Mật khẩu hiện tại (*)</label>
              <input
                type="password"
                className="account-input-field"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu hiện tại"
                required
              />
            </div>

            <div className="account-row-2col">
              <div className="account-field-group">
                <label className="account-field-label">Mật khẩu mới (*)</label>
                <input
                  type="password"
                  className="account-input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>

              <div className="account-field-group">
                <label className="account-field-label">Xác nhận mật khẩu mới (*)</label>
                <input
                  type="password"
                  className="account-input-field"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>
            </div>

            <div className="account-card-footer">
              <button type="submit" className="account-btn-save">
                Đổi mật khẩu
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="account-section-divider"></div>

      {/* =========================================================
          SECTION 3: MÃ PIN ĐĂNG NHẬP NHANH (CÓ TÍNH NĂNG QUÊN MÃ PIN)
          ========================================================= */}
      <div className="account-section-grid">
        {/* Left Column */}
        <div className="account-meta-col">
          <h2 className="account-meta-heading">Mã PIN POS (4 số)</h2>
          <p className="account-meta-desc">
            Mã PIN dùng để đăng nhập nhanh tại máy POS quầy thu ngân và xác thực các hành động nhạy cảm (hủy bàn, xóa món, chiết khấu).
          </p>
        </div>

        {/* Right Form Card */}
        <div className="account-form-card">
          <form onSubmit={handleChangePin} className="account-form-body">
            <div className="pin-status-banner">
              <div className="pin-status-icon">🔐</div>
              <div className="pin-status-info">
                <strong>Trạng thái mã PIN: Đang kích hoạt (••••)</strong>
                <p>Đang bảo vệ các thao tác quản trị tại quầy thu ngân</p>
              </div>
            </div>

            <div className="account-field-group">
              <div className="field-label-with-action">
                <label className="account-field-label">Mã PIN hiện tại</label>
                <button
                  type="button"
                  className="btn-forgot-pin-link"
                  onClick={() => setIsForgotPinModalOpen(true)}
                >
                  Quên mã PIN?
                </button>
              </div>
              <input
                type="password"
                maxLength={4}
                className="account-input-field"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập mã PIN cũ"
              />
            </div>

            <div className="account-row-2col">
              <div className="account-field-group">
                <label className="account-field-label">Mã PIN mới (4 chữ số)</label>
                <input
                  type="password"
                  maxLength={4}
                  className="account-input-field"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="vd: 1234"
                  required
                />
              </div>

              <div className="account-field-group">
                <label className="account-field-label">Xác nhận mã PIN mới</label>
                <input
                  type="password"
                  maxLength={4}
                  className="account-input-field"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập lại 4 chữ số"
                  required
                />
              </div>
            </div>

            <div className="account-card-footer">
              <button type="submit" className="account-btn-save">
                Cập nhật mã PIN
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =========================================================
          MODAL: QUÊN MÃ PIN -> XÁC THỰC BẰNG MẬT KHẨU CHỦ QUÁN
          ========================================================= */}
      {isForgotPinModalOpen && (
        <div className="modal-overlay" onClick={() => setIsForgotPinModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🔑 Khôi Phục & Đặt Lại Mã PIN</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsForgotPinModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPinViaPassword} className="admin-modal-form">
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px', lineHeight: 1.5 }}>
                Nếu bạn quên mã PIN 4 số, vui lòng nhập <strong>Mật khẩu đăng nhập tài khoản chủ quán</strong> để xác thực quyền quản trị và thiết lập mã PIN mới:
              </p>

              <div className="admin-form-group">
                <label className="admin-form-label">Mật khẩu tài khoản chủ quán (*)</label>
                <input
                  type="password"
                  className="admin-form-input"
                  value={verifyPasswordForPin}
                  onChange={(e) => setVerifyPasswordForPin(e.target.value)}
                  placeholder="Nhập mật khẩu tài khoản"
                  autoFocus
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Mã PIN 4 số mới (*)</label>
                <input
                  type="password"
                  maxLength={4}
                  className="admin-form-input"
                  value={resetNewPin}
                  onChange={(e) => setResetNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập 4 chữ số mới (vd: 5678)"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Xác nhận mã PIN mới (*)</label>
                <input
                  type="password"
                  maxLength={4}
                  className="admin-form-input"
                  value={resetConfirmPin}
                  onChange={(e) => setResetConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập lại 4 chữ số mới"
                  required
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsForgotPinModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="admin-btn-primary">
                  Xác nhận & Cấp lại PIN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
