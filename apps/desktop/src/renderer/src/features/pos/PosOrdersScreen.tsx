import React, { useState } from 'react'

interface PosOrder {
  id: string
  tableName: string
  duration: string
  itemCount: number
  totalAmount: number
  type: 'dine_in' | 'takeaway' | 'delivery'
}

interface PosOrdersScreenProps {
  userName?: string
  onLogout?: () => void
}

export function PosOrdersScreen({ userName = 'Lê văn đại', onLogout }: PosOrdersScreenProps): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const [orders] = useState<PosOrder[]>([
    { id: 'o1', tableName: 'Khu vực 1 - 9', duration: '03:57', itemCount: 2, totalAmount: 105000, type: 'dine_in' },
    { id: 'o2', tableName: 'Khu vực 1 - 4', duration: '04:06', itemCount: 1, totalAmount: 0, type: 'dine_in' },
    { id: 'o3', tableName: 'Khu vực 1 - 7', duration: '04:14', itemCount: 1, totalAmount: 140000, type: 'dine_in' },
    { id: 'o4', tableName: 'Khu vực 1 - 1', duration: '04:09', itemCount: 3, totalAmount: 185000, type: 'dine_in' }
  ])

  const filteredOrders = orders.filter((o) => {
    const matchSearch = o.tableName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchType = activeFilter === 'all' || o.type === activeFilter
    return matchSearch && matchType
  })

  return (
    <div className="pos-orders-screen">
      {/* Top Header */}
      <header className="pos-orders-topbar">
        <div className="pos-brand-logo">
          <span className="brand-logo-text">Sapo</span>
        </div>

        <div className="pos-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="pos-header-search-input"
            placeholder="Tìm kiếm đơn hàng"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="pos-topbar-actions">
          {/* Notification Bell */}
          <button type="button" className="pos-noti-btn" title="Thông báo">
            <span className="noti-icon">🔔</span>
            <span className="noti-badge">11</span>
          </button>

          {/* User Profile Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="pos-user-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="pos-user-avatar">LĐ</div>
              <span className="pos-user-name">{userName}</span>
              <span className="dropdown-arrow-small">{isUserMenuOpen ? '▲' : '▼'}</span>
            </button>

            {isUserMenuOpen && (
              <div className="admin-user-dropdown-menu" style={{ width: '180px' }}>
                <div className="dropdown-menu-header">
                  <strong>{userName}</strong>
                  <small>Thu ngân ca sáng</small>
                </div>
                <div className="dropdown-menu-divider"></div>
                <button
                  type="button"
                  className="dropdown-menu-item item-logout"
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    if (onLogout) onLogout()
                  }}
                >
                  🚪 Đăng xuất ca
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body with Left Channel Filter & Cards Grid */}
      <div className="pos-orders-body">
        {/* Left Sub-sidebar Channel Filter */}
        <aside className="pos-channels-sidebar">
          <button
            type="button"
            className={`channel-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            <span className="channel-icon">🗂️</span>
            <span className="channel-label">Tất cả</span>
            <span className="channel-badge">4</span>
          </button>

          <button
            type="button"
            className={`channel-btn ${activeFilter === 'dine_in' ? 'active' : ''}`}
            onClick={() => setActiveFilter('dine_in')}
          >
            <span className="channel-icon">🏪</span>
            <span className="channel-label">Tại chỗ</span>
            <span className="channel-badge">4</span>
          </button>

          <button
            type="button"
            className={`channel-btn ${activeFilter === 'takeaway' ? 'active' : ''}`}
            onClick={() => setActiveFilter('takeaway')}
          >
            <span className="channel-icon">🛍️</span>
            <span className="channel-label">Mang đi</span>
          </button>

          <button
            type="button"
            className={`channel-btn ${activeFilter === 'delivery' ? 'active' : ''}`}
            onClick={() => setActiveFilter('delivery')}
          >
            <span className="channel-icon">🛵</span>
            <span className="channel-label">Giao hàng</span>
          </button>

          <button type="button" className="channel-btn">
            <span className="channel-icon">🟢</span>
            <span className="channel-label">Grab Food</span>
          </button>

          <button type="button" className="channel-btn">
            <span className="channel-icon">🔴</span>
            <span className="channel-label">Shopee Food</span>
          </button>

          <button type="button" className="channel-btn">
            <span className="channel-icon">🟩</span>
            <span className="channel-label">Green Food</span>
          </button>
        </aside>

        {/* Order Cards Grid */}
        <main className="pos-orders-grid-area">
          <div className="pos-orders-grid">
            {filteredOrders.map((order) => (
              <div key={order.id} className="pos-order-card">
                <div className="pos-order-card-header">
                  <span className="pos-order-icon">🏪</span>
                  <strong className="pos-order-title">{order.tableName}</strong>
                </div>

                <div className="pos-order-meta">
                  <span className="meta-time">🕒 {order.duration}</span>
                  <span className="meta-divider">|</span>
                  <span className="meta-items">SL: {order.itemCount}</span>
                </div>

                <div className="pos-order-amount">
                  {order.totalAmount.toLocaleString('vi-VN')}đ
                </div>
              </div>
            ))}
          </div>

          {/* Floating Action Button */}
          <button
            type="button"
            className="pos-fab-new-order"
            onClick={() => alert('➕ Tạo đơn hàng / mở bàn mới')}
          >
            + Tạo đơn mới
          </button>
        </main>
      </div>
    </div>
  )
}
