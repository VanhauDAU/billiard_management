import React, { useEffect, useState } from 'react'
import type { CreateStaffRequest, StaffItem } from '@billiards/contracts'

export function StaffManagementScreen(): React.JSX.Element {
  const [staffList, setStaffList] = useState<StaffItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createFormError, setCreateFormError] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [roleCode, setRoleCode] = useState<'manager' | 'staff' | 'cashier'>('staff')

  const fetchStaff = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await window.desktopApi.staff.list()
      if (res.ok) {
        setStaffList(res.data.staff)
      } else {
        setErrorMsg('Không thể tải danh sách nhân viên.')
      }
    } catch {
      setErrorMsg('Lỗi kết nối máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchStaff()
  }, [])

  const handleOpenCreateModal = () => {
    setDisplayName('')
    setUsername('')
    setPassword('')
    setPin('1234')
    setPhone('')
    setEmail('')
    setRoleCode('staff')
    setCreateFormError(null)
    setIsCreateModalOpen(true)
  }

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim() || !username.trim() || !password.trim()) {
      setCreateFormError('Vui lòng điền họ tên, tên đăng nhập và mật khẩu.')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setCreateFormError('Mã PIN bắt buộc phải gồm đúng 4 chữ số.')
      return
    }

    setCreating(true)
    setCreateFormError(null)

    const payload: CreateStaffRequest = {
      displayName: displayName.trim(),
      username: username.trim(),
      password: password.trim(),
      pin: pin.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      roleCode
    }

    try {
      const res = await window.desktopApi.staff.create(payload)
      if (res.ok) {
        setIsCreateModalOpen(false)
        await fetchStaff()
      } else {
        setCreateFormError(res.message || 'Không thể tạo nhân viên.')
      }
    } catch {
      setCreateFormError('Lỗi mạng khi tạo nhân viên.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa nhân viên "${name}"?`)) {
      return
    }

    try {
      const res = await window.desktopApi.staff.delete(id)
      if (res.ok) {
        await fetchStaff()
      } else {
        alert(res.message || 'Không thể xóa nhân viên này.')
      }
    } catch {
      alert('Lỗi kết nối máy chủ.')
    }
  }

  return (
    <div className="content-card">
      <div className="card-header-flex">
        <div>
          <h2 className="card-title">👥 Quản lý Nhân viên Cửa hàng</h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
            Tạo tài khoản, phân quyền ca làm việc và cấp mã PIN 4 số cho nhân viên
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ width: 'auto', padding: '0 20px', height: '42px' }}
          onClick={handleOpenCreateModal}
        >
          ➕ Thêm Nhân viên
        </button>
      </div>

      {errorMsg && (
        <div className="alert-box alert-danger">
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          ⏳ Đang tải danh sách nhân viên...
        </div>
      ) : staffList.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
          Chưa có nhân viên nào trong cửa hàng. Hãy bấm "Thêm Nhân viên" để tạo tài khoản đầu tiên!
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Tên đăng nhập</th>
              <th>Vai trò</th>
              <th>Mã PIN</th>
              <th>Số điện thoại</th>
              <th>Trạng thái</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.displayName}</strong>
                </td>
                <td>
                  <code style={{ background: '#f1f5f9', padding: '3px 7px', borderRadius: '4px' }}>
                    {item.username}
                  </code>
                </td>
                <td>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '12px',
                      fontWeight: 700,
                      background: item.roleCode === 'owner' ? '#fef3c7' : item.roleCode === 'manager' ? '#e0e7ff' : '#f1f5f9',
                      color: item.roleCode === 'owner' ? '#92400e' : item.roleCode === 'manager' ? '#3730a3' : '#475569'
                    }}
                  >
                    {item.roleName}
                  </span>
                </td>
                <td>
                  {item.hasPin ? (
                    <span style={{ color: '#10b981', fontWeight: 600 }}>✅ Đã cấp (4 số)</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>Chưa cấp</span>
                  )}
                </td>
                <td>{item.phone || '—'}</td>
                <td>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background: item.status === 'active' ? '#ecfdf5' : '#fef2f2',
                      color: item.status === 'active' ? '#065f46' : '#991b1b'
                    }}
                  >
                    {item.status === 'active' ? 'Đang hoạt động' : 'Tạm khóa'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.roleCode !== 'owner' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(item.id, item.displayName)}
                      style={{
                        padding: '5px 10px',
                        border: '1px solid #fecaca',
                        background: '#fff',
                        color: '#dc2626',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12.5px'
                      }}
                    >
                      🗑️ Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Create Staff */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Tạo Tài Khoản Nhân Viên Mới</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {createFormError && (
              <div className="alert-box alert-danger">
                <span>⚠️</span>
                <span>{createFormError}</span>
              </div>
            )}

            <form onSubmit={handleCreateStaff}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Họ và tên nhân viên *</label>
                  <input
                    className="form-input"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', paddingLeft: '14px' }}
                    type="text"
                    placeholder="VD: Nguyễn Văn Nam"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tên đăng nhập *</label>
                  <input
                    className="form-input"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', paddingLeft: '14px' }}
                    type="text"
                    placeholder="VD: namnv01"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mật khẩu đăng nhập *</label>
                  <input
                    className="form-input"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', paddingLeft: '14px' }}
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mã PIN xác thực (4 số) *</label>
                  <input
                    className="form-input"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', paddingLeft: '14px', letterSpacing: '3px', fontWeight: 'bold' }}
                    type="text"
                    maxLength={4}
                    placeholder="VD: 1234"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vai trò</label>
                  <select
                    className="form-input"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', paddingLeft: '14px' }}
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value as any)}
                  >
                    <option value="staff">Nhân viên phục vụ (Staff)</option>
                    <option value="cashier">Thu ngân (Cashier)</option>
                    <option value="manager">Quản lý ca (Manager)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    className="form-input"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', paddingLeft: '14px' }}
                    type="tel"
                    placeholder="Tùy chọn..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    style={{ background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', paddingLeft: '14px' }}
                    type="email"
                    placeholder="Tùy chọn..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-logout"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={creating}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ width: 'auto', padding: '0 24px', height: '42px' }}
                  disabled={creating}
                >
                  {creating ? 'Đang tạo...' : 'Lưu Nhân Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
