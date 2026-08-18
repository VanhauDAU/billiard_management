import React, { useEffect, useState } from 'react'
import type { DesktopAuthState } from '../../../../shared/auth-api'
import { PosZoneTablesScreen } from './PosZoneTablesScreen'
import { PosOrdersScreen } from './PosOrdersScreen'
import { PosMoreSettingsScreen } from './PosMoreSettingsScreen'

interface StaffPosLayoutProps {
  authState: DesktopAuthState
  onLogout: () => void
}

type StaffTabKey = 'orders' | 'zone' | 'qr' | 'more'

export function StaffPosLayout({ authState, onLogout }: StaffPosLayoutProps): React.JSX.Element {
  // Default tab is 'orders' as requested
  const [activeTab, setActiveTab] = useState<StaffTabKey>('orders')
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date())

  const user = authState.status === 'authenticated' ? authState.user : null
  const store = authState.status === 'authenticated' ? authState.store : null

  // Real store name from settings
  const getStoreName = (): string => {
    try {
      const raw = localStorage.getItem('billiard_store_settings_v1')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.storeName) return parsed.storeName
      }
    } catch (e) {
      console.warn('Could not read store settings', e)
    }
    return store?.name || 'Vanhau1410rr'
  }

  const storeName = getStoreName()

  // Real-time clock update every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Format real-time string
  const formatLiveTime = (d: Date) => {
    const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
    const dayName = days[d.getDay()]
    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    return `${timeStr} - ${dayName}, ${dateStr}`
  }

  return (
    <div className="staff-pos-wrapper">
      {/* Top Status Bar with Live Clock and Store Name */}
      <header className="staff-pos-statusbar">
        <div className="statusbar-left">
          <span className="statusbar-clock">🕒 {formatLiveTime(currentTime)}</span>
          <span className="statusbar-divider">•</span>
          <strong className="statusbar-brand">🎱 {storeName}</strong>
        </div>
        <div className="statusbar-right">
          <span className="staff-statusbar-badge">👨‍💼 {user?.displayName || 'Nhân viên thu ngân'}</span>
          <span className="statusbar-wifi">🛜 Đã kết nối POS</span>
        </div>
      </header>

      {/* Main View Area */}
      <main className="staff-pos-main-content">
        {activeTab === 'orders' && (
          <PosOrdersScreen
            userName={user?.displayName || 'Lê văn đại'}
            storeName={storeName}
            onLogout={onLogout}
          />
        )}

        {activeTab === 'zone' && <PosZoneTablesScreen />}

        {activeTab === 'qr' && (
          <div className="pos-qr-screen" style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ maxWidth: '420px', margin: '40px auto', background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📱</div>
              <h2 style={{ fontSize: '20px', margin: '0 0 8px', color: '#0f172a' }}>Mã QR Order Tại Bàn</h2>
              <p style={{ fontSize: '13.5px', color: '#64748b', marginBottom: '24px' }}>
                Khách hàng quét mã QR tại bàn để tự xem thực đơn và gọi món trực tiếp vào máy POS.
              </p>
              <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #2563eb', display: 'inline-block' }}>
                <div style={{ fontSize: '80px', lineHeight: 1 }}>🏁</div>
                <div style={{ marginTop: '8px', fontWeight: 700, color: '#2563eb' }}>BÀN 01 - KHU VỰC 1</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'more' && (
          <PosMoreSettingsScreen
            userName={user?.displayName || 'Lê văn đại'}
            storeName={storeName}
            storeCode={store?.slug || '107493'}
            onLogout={onLogout}
          />
        )}
      </main>

      {/* Bottom Navigation Bar with Expanded Hitboxes */}
      <nav className="staff-pos-bottom-nav">
        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
          title="Xem danh sách đơn hàng đang chơi và thanh toán"
        >
          <span className="bottom-nav-icon">📰</span>
          <span className="bottom-nav-label">Đơn hàng</span>
        </button>

        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'zone' ? 'active' : ''}`}
          onClick={() => setActiveTab('zone')}
          title="Sơ đồ khu vực và bàn bida"
        >
          <span className="bottom-nav-icon">🗂️</span>
          <span className="bottom-nav-label">Khu vực</span>
        </button>

        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveTab('qr')}
          title="Mã QR Order tại bàn"
        >
          <span className="bottom-nav-icon">📱</span>
          <span className="bottom-nav-label">QR Order</span>
        </button>

        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'more' ? 'active' : ''}`}
          onClick={() => setActiveTab('more')}
          title="Thêm tùy chọn và cài đặt POS"
        >
          <span className="bottom-nav-icon">➕</span>
          <span className="bottom-nav-label">Thêm</span>
        </button>
      </nav>
    </div>
  )
}

