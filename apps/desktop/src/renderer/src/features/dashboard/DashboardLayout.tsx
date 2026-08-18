import React, { useEffect, useState } from 'react'
import type { DesktopAuthState } from '../../../../shared/auth-api'
import { StaffManagementScreen } from '../staff/StaffManagementScreen'

interface DashboardLayoutProps {
  authState: DesktopAuthState
  onLogout: () => void
}

type TabKey = 'pos' | 'staff' | 'products' | 'customers' | 'invoices' | 'reports'

export function DashboardLayout({ authState, onLogout }: DashboardLayoutProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabKey>('pos')
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('vi-VN'))

  // Demo tables state for POS
  const [tables, setTables] = useState([
    { id: 't1', name: 'Bàn 01 - Pool 9-Ball', type: 'Pool', status: 'playing', duration: '01:45:20', amount: '125,000đ', items: 3 },
    { id: 't2', name: 'Bàn 02 - Pool 9-Ball', type: 'Pool', status: 'available', duration: '00:00:00', amount: '0đ', items: 0 },
    { id: 't3', name: 'Bàn 03 - Carom 3C', type: 'Carom', status: 'playing', duration: '00:52:10', amount: '65,000đ', items: 1 },
    { id: 't4', name: 'Bàn 04 - Libre', type: 'Libre', status: 'available', duration: '00:00:00', amount: '0đ', items: 0 },
    { id: 't5', name: 'Bàn 05 - Pool 9-Ball', type: 'Pool', status: 'playing', duration: '02:10:05', amount: '180,000đ', items: 4 },
    { id: 't6', name: 'Bàn 06 - Carom 3C', type: 'Carom', status: 'available', duration: '00:00:00', amount: '0đ', items: 0 }
  ])

  // Verify PIN modal state for sensitive actions
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinSuccessActionName, setPinSuccessActionName] = useState<string>('')

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const user = authState.status === 'authenticated' ? authState.user : null
  const store = authState.status === 'authenticated' ? authState.store : null

  const handleOpenPinVerification = (actionName: string) => {
    setPinInput('')
    setPinError(null)
    setPinSuccessActionName(actionName)
    setIsPinModalOpen(true)
  }

  const handleVerifyPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{4}$/.test(pinInput)) {
      setPinError('Vui lòng nhập đúng 4 chữ số PIN.')
      return
    }

    try {
      const res = await window.desktopApi.auth.verifyPin({ pin: pinInput })
      if (res.ok) {
        setIsPinModalOpen(false)
        alert(`✅ Xác thực mã PIN thành công cho thao tác: "${pinSuccessActionName}"`)
      } else {
        setPinError(res.message || 'Mã PIN không đúng.')
      }
    } catch {
      setPinError('Lỗi xác thực máy chủ.')
    }
  }

  return (
    <div className="billiard-app-container">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-brand">
          <div style={{ fontSize: '22px' }}>🎱</div>
          <div className="store-badge">
            <span className="status-dot"></span>
            <span>{store?.name || 'Billiard Club'}</span>
          </div>
          <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>⏰ {currentTime}</span>
        </div>

        <nav className="header-nav">
          <button
            type="button"
            className={`nav-item-btn ${activeTab === 'pos' ? 'active' : ''}`}
            onClick={() => setActiveTab('pos')}
          >
            🎱 Sơ đồ Bàn & POS
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeTab === 'staff' ? 'active' : ''}`}
            onClick={() => setActiveTab('staff')}
          >
            👥 Nhân viên
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            🍽️ Thực đơn & Mặt hàng
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            🤝 Khách hàng & Công nợ
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            🧾 Hóa đơn
          </button>
          <button
            type="button"
            className={`nav-item-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📊 Báo cáo
          </button>
        </nav>

        <div className="header-user">
          <div className="user-info-tag">
            <span className="user-name">{user?.displayName || 'Người dùng'}</span>
            <span className="user-role-badge">{user?.roleName || 'Staff'}</span>
          </div>
          <button type="button" className="btn-logout" onClick={onLogout} title="Đăng xuất">
            🚪 Thoát
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="dashboard-content">
        {activeTab === 'staff' && <StaffManagementScreen />}

        {activeTab === 'pos' && (
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <h2 className="card-title">🎱 Sơ đồ Bàn Bida & Tính giờ</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                  Theo dõi thời gian thực, mở bàn, gọi món và thanh toán
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-logout"
                  onClick={() => handleOpenPinVerification('Hủy hóa đơn bàn')}
                >
                  🔒 Thử xác thực PIN 4 số
                </button>
              </div>
            </div>

            <div className="billiard-tables-grid">
              {tables.map((t) => (
                <div
                  key={t.id}
                  className={`billiard-table-card ${t.status === 'playing' ? 'table-card-active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '15px' }}>{t.name}</strong>
                    <span className={t.status === 'playing' ? 'table-badge-playing' : 'table-badge-available'}>
                      {t.status === 'playing' ? '🟢 Đang chơi' : '⚪ Trống'}
                    </span>
                  </div>

                  <div className="table-timer-display">{t.duration}</div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '13px',
                      color: '#64748b',
                      margin: '10px 0'
                    }}
                  >
                    <span>Dịch vụ: {t.items} món</span>
                    <strong style={{ color: '#0f172a' }}>Tạm tính: {t.amount}</strong>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                    {t.status === 'playing' ? (
                      <>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ height: '36px', fontSize: '13px', background: '#10b981' }}
                          onClick={() => alert(`Tính tiền cho ${t.name}`)}
                        >
                          💳 Thanh toán
                        </button>
                        <button
                          type="button"
                          className="btn-logout"
                          style={{ height: '36px', fontSize: '13px' }}
                          onClick={() => alert(`Thêm món cho ${t.name}`)}
                        >
                          🍽️ Thêm món
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ height: '36px', fontSize: '13px', gridColumn: 'span 2' }}
                        onClick={() => {
                          setTables((prev) =>
                            prev.map((item) =>
                              item.id === t.id
                                ? { ...item, status: 'playing', duration: '00:00:01', amount: '0đ' }
                                : item
                            )
                          )
                        }}
                      >
                        ⚡ Bắt đầu chơi (Mở bàn)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <h2 className="card-title">🍽️ Thực đơn, Danh mục & Mặt hàng</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                  Quản lý các loại thực đơn (Đồ ăn, Đồ uống, Cafe, Ăn tại bàn, Mang đi) và phân loại
                </p>
              </div>
              <button type="button" className="btn-primary" style={{ width: 'auto', padding: '0 20px', height: '42px' }}>
                ➕ Thêm Mặt hàng
              </button>
            </div>
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              📦 Module Thực đơn & Mặt hàng: Đang sẵn sàng dữ liệu menu và danh mục theo quy chuẩn phân quyền.
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <h2 className="card-title">🤝 Danh sách Khách hàng & Thu nợ</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                  Quản lý khách hàng, nhóm khách hàng VIP/thành viên và thu nợ
                </p>
              </div>
              <button type="button" className="btn-primary" style={{ width: 'auto', padding: '0 20px', height: '42px' }}>
                ➕ Thêm Khách hàng
              </button>
            </div>
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              👤 Module Khách hàng & Công nợ: Sẵn sàng cho nghiệp vụ quản lý khách và thu nợ.
            </div>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <h2 className="card-title">🧾 Hóa đơn Bán hàng</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                  Lịch sử hóa đơn, in biên lai, xuất Excel và hủy hóa đơn (có PIN)
                </p>
              </div>
            </div>
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              🧾 Module Hóa đơn: Danh sách hóa đơn bán hàng, in hóa đơn và đối soát.
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="content-card">
            <div className="card-header-flex">
              <div>
                <h2 className="card-title">📊 Báo cáo Doanh thu & Thống kê</h2>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13.5px' }}>
                  Báo cáo tổng hợp tiền giờ chơi, tiền dịch vụ ăn uống và hiệu suất ca
                </p>
              </div>
            </div>
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
              📈 Module Báo cáo Doanh thu: Báo cáo trực quan theo ngày/tháng/ca.
            </div>
          </div>
        )}
      </main>

      {/* Verify PIN Modal */}
      {isPinModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPinModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '380px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🔒 Xác thực mã PIN 4 số</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsPinModalOpen(false)}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#64748b', marginTop: 0 }}>
              Thao tác "{pinSuccessActionName}" yêu cầu xác nhận mã PIN bảo mật của bạn.
            </p>

            {pinError && (
              <div className="alert-box alert-danger">
                <span>⚠️</span>
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyPinSubmit}>
              <div className="form-group">
                <input
                  className="form-input"
                  style={{
                    background: '#fff',
                    color: '#0f172a',
                    border: '2px solid #2563eb',
                    fontSize: '24px',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    fontWeight: 800
                  }}
                  type="password"
                  maxLength={4}
                  placeholder="••••"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-logout"
                  style={{ flex: 1 }}
                  onClick={() => setIsPinModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
