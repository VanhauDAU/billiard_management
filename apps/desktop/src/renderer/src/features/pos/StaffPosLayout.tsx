import React, { useState } from 'react'
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
  const [activeTab, setActiveTab] = useState<StaffTabKey>('zone')

  const user = authState.status === 'authenticated' ? authState.user : null
  const store = authState.status === 'authenticated' ? authState.store : null

  return (
    <div className="staff-pos-wrapper">
      {/* Top Status Bar matching Sapo FnB */}
      <header className="staff-pos-statusbar">
        <div className="statusbar-left">
          <span>02:16 Thứ 4 19 thg 8</span>
          <strong className="statusbar-brand">Sapo FnB</strong>
        </div>
        <div className="statusbar-right">
          <span>🛜 50% 🔋</span>
        </div>
      </header>

      {/* Main View Area */}
      <main className="staff-pos-main-content">
        {activeTab === 'orders' && (
          <PosOrdersScreen
            userName={user?.displayName || 'Lê văn đại'}
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
            storeName={store?.name || 'Vanhau1410rr'}
            storeCode={store?.slug || '107493'}
            onLogout={onLogout}
          />
        )}
      </main>

      {/* Bottom Navigation Bar matching all 3 screenshots */}
      <nav className="staff-pos-bottom-nav">
        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <span className="bottom-nav-icon">📰</span>
          <span className="bottom-nav-label">Đơn hàng</span>
        </button>

        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'zone' ? 'active' : ''}`}
          onClick={() => setActiveTab('zone')}
        >
          <span className="bottom-nav-icon">🗂️</span>
          <span className="bottom-nav-label">Khu vực</span>
        </button>

        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'qr' ? 'active' : ''}`}
          onClick={() => setActiveTab('qr')}
        >
          <span className="bottom-nav-icon">📱</span>
          <span className="bottom-nav-label">QR Order</span>
        </button>

        <button
          type="button"
          className={`pos-bottom-nav-item ${activeTab === 'more' ? 'active' : ''}`}
          onClick={() => setActiveTab('more')}
        >
          <span className="bottom-nav-icon">➕</span>
          <span className="bottom-nav-label">Thêm</span>
        </button>
      </nav>
    </div>
  )
}
