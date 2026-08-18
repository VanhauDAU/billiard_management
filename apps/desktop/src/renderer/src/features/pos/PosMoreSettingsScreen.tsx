import React from 'react'

interface PosMoreSettingsScreenProps {
  userName?: string
  storeName?: string
  storeCode?: string
  onLogout: () => void
}

export function PosMoreSettingsScreen({
  userName = 'Lê văn đại',
  storeName = 'Vanhau1410rr',
  storeCode = '107493',
  onLogout
}: PosMoreSettingsScreenProps): React.JSX.Element {
  return (
    <div className="pos-more-screen">
      {/* User Header Card */}
      <div className="pos-more-user-banner">
        <div className="pos-user-banner-avatar">👤</div>
        <span className="pos-user-banner-name">{userName}</span>
      </div>

      {/* Store Context Box */}
      <div className="pos-more-store-box">
        <div className="store-box-icon">🏪</div>
        <div className="store-box-meta">
          <strong>{storeName}</strong>
          <small>Mã cửa hàng: {storeCode}</small>
        </div>
      </div>

      {/* Group 1: Quản lý bán hàng */}
      <div className="pos-menu-group">
        <div className="pos-group-title">Quản lý bán hàng</div>
        <div className="pos-group-list">
          <div className="pos-menu-row" onClick={() => alert('🔔 Danh sách thông báo')}>
            <span className="menu-row-icon text-blue">🔔</span>
            <span className="menu-row-label">Thông báo</span>
            <span className="menu-row-chevron">›</span>
          </div>

          <div className="pos-menu-row" onClick={() => alert('🧾 Danh sách hoá đơn trong ca')}>
            <span className="menu-row-icon text-blue">🧾</span>
            <span className="menu-row-label">Hoá đơn</span>
            <span className="menu-row-chevron">›</span>
          </div>

          <div className="pos-menu-row" onClick={() => alert('📦 Bảng giá và mặt hàng')}>
            <span className="menu-row-icon text-blue">📦</span>
            <span className="menu-row-label">Quản lý sản phẩm</span>
            <span className="menu-row-chevron">›</span>
          </div>

          <div className="pos-menu-row" onClick={() => alert('📅 Lịch đặt bàn')}>
            <span className="menu-row-icon text-blue">📅</span>
            <span className="menu-row-label">Đặt lịch</span>
            <span className="menu-row-chevron">›</span>
          </div>

          <div className="pos-menu-row" onClick={() => alert('👥 Tra cứu khách hàng & Điểm tích lũy')}>
            <span className="menu-row-icon text-blue">👥</span>
            <span className="menu-row-label">Khách hàng</span>
            <span className="menu-row-chevron">›</span>
          </div>
        </div>
      </div>

      {/* Group 2: Hoá đơn điện tử */}
      <div className="pos-menu-group">
        <div className="pos-group-title">Hoá đơn điện tử</div>
        <div className="pos-group-list">
          <div className="pos-menu-row" onClick={() => alert('📑 Danh sách hoá đơn điện tử')}>
            <span className="menu-row-icon text-blue">📑</span>
            <span className="menu-row-label">Danh sách hoá đơn điện tử</span>
            <span className="menu-row-chevron">›</span>
          </div>
        </div>
      </div>

      {/* Group 3: Thiết lập */}
      <div className="pos-menu-group">
        <div className="pos-group-title">Thiết lập</div>
        <div className="pos-group-list">
          <div className="pos-menu-row" onClick={() => alert('🖨️ Cấu hình máy in nhiệt 80mm')}>
            <span className="menu-row-icon text-blue">🖨️</span>
            <span className="menu-row-label">Máy in</span>
            <span className="menu-row-chevron">›</span>
          </div>

          <div className="pos-menu-row" onClick={() => alert('🔄 Đã đồng bộ dữ liệu với máy chủ thành công!')}>
            <span className="menu-row-icon text-blue">🔄</span>
            <span className="menu-row-label">Đồng bộ dữ liệu</span>
            <span className="menu-row-chevron">›</span>
          </div>

          <div className="pos-menu-row" onClick={() => alert('⚙️ Thiết lập ứng dụng')}>
            <span className="menu-row-icon text-blue">⚙️</span>
            <span className="menu-row-label">Thiết lập khác</span>
            <span className="menu-row-chevron">›</span>
          </div>

          <div className="pos-menu-row text-red" onClick={onLogout}>
            <span className="menu-row-icon">🚪</span>
            <span className="menu-row-label">Đăng xuất ca làm việc</span>
            <span className="menu-row-chevron">›</span>
          </div>
        </div>
      </div>

      {/* Support & Version */}
      <div className="pos-more-footer">
        <div className="pos-version-tag">
          <span>🛜</span>
          <span>Sapo Phục vụ: 1.0.6 (100)</span>
        </div>
      </div>
    </div>
  )
}
