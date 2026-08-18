import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import logoBlack from '../../assets/logo_black_1200x400.svg'
import { loadSavedZones } from '../admin/ZoneTableSettingsScreen'

export interface PosOrder {
  id: string
  orderCode: string
  tableName: string
  zoneName: string
  startTime: string
  duration: string
  tablePricePerHour: number
  tableAmount: number
  totalAmount: number
  status: 'playing' | 'waiting_payment'
  type: 'dine_in'
}

interface PosOrdersScreenProps {
  userName?: string
  storeName?: string
  onLogout?: () => void
}

export function PosOrdersScreen({
  userName = 'Lê văn đại',
  storeName = 'Vanhau1410rr',
  onLogout
}: PosOrdersScreenProps): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<'all' | 'playing' | 'waiting_payment'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null)
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false)

  // Real-time clock inside screen header
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Real operational billiard table orders (Billiard Play Time Only)
  const [orders, setOrders] = useState<PosOrder[]>([
    {
      id: 'ord_1',
      orderCode: 'HD-107493-01',
      tableName: 'Bàn 1',
      zoneName: 'Khu vực 1',
      startTime: '11:25',
      duration: '04:09',
      tablePricePerHour: 60000,
      tableAmount: 249000,
      totalAmount: 249000,
      status: 'playing',
      type: 'dine_in'
    },
    {
      id: 'ord_2',
      orderCode: 'HD-107493-04',
      tableName: 'Bàn 4',
      zoneName: 'Khu vực 1',
      startTime: '11:28',
      duration: '04:06',
      tablePricePerHour: 60000,
      tableAmount: 246000,
      totalAmount: 246000,
      status: 'playing',
      type: 'dine_in'
    },
    {
      id: 'ord_3',
      orderCode: 'HD-107493-07',
      tableName: 'Bàn 7',
      zoneName: 'Khu vực 1',
      startTime: '11:20',
      duration: '04:14',
      tablePricePerHour: 60000,
      tableAmount: 254000,
      totalAmount: 254000,
      status: 'waiting_payment',
      type: 'dine_in'
    },
    {
      id: 'ord_4',
      orderCode: 'HD-107493-09',
      tableName: 'Bàn 9',
      zoneName: 'Khu vực 1',
      startTime: '11:37',
      duration: '03:57',
      tablePricePerHour: 60000,
      tableAmount: 237000,
      totalAmount: 237000,
      status: 'playing',
      type: 'dine_in'
    }
  ])

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.zoneName.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchSearch) return false
    if (activeFilter === 'all') return true
    if (activeFilter === 'playing') return o.status === 'playing'
    if (activeFilter === 'waiting_payment') return o.status === 'waiting_payment'
    return true
  })

  // Format real-time string
  const formatHeaderClock = (d: Date) => {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }

  // Handle open order detail
  const handleOpenOrderDetail = (order: PosOrder) => {
    setSelectedOrder(order)
    setIsOrderDetailModalOpen(true)
  }

  // Handle Checkout Order
  const handleCheckoutOrder = (orderId: string) => {
    const target = orders.find((o) => o.id === orderId)
    if (!target) return

    if (confirm(`Xác nhận thanh toán cho ${target.tableName} (${target.zoneName})\nThời lượng: ${target.duration}\nTổng tiền giờ: ${target.totalAmount.toLocaleString('vi-VN')} đ?`)) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      setIsOrderDetailModalOpen(false)
      setSelectedOrder(null)
      toast.success(`Đã thanh toán & in hóa đơn thành công cho ${target.tableName}!`, {
        description: `Mã hóa đơn: ${target.orderCode} - Tiền giờ chơi: ${target.totalAmount.toLocaleString('vi-VN')} đ`
      })
    }
  }

  // Create new order / open table
  const handleCreateNewOrder = () => {
    const zones = loadSavedZones()
    const targetZone = zones[0]?.name || 'Khu vực 1'
    const nextTableNumber = orders.length + 2

    const newOrder: PosOrder = {
      id: `ord_${Date.now()}`,
      orderCode: `HD-107493-${String(nextTableNumber).padStart(2, '0')}`,
      tableName: `Bàn ${nextTableNumber}`,
      zoneName: targetZone,
      startTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      duration: '00:01',
      tablePricePerHour: 60000,
      tableAmount: 1000,
      totalAmount: 1000,
      status: 'playing',
      type: 'dine_in'
    }

    setOrders((prev) => [newOrder, ...prev])
    toast.success(`Đã mở đơn tính giờ mới cho Bàn ${nextTableNumber}!`)
  }

  return (
    <div className="pos-orders-screen">
      {/* Top Header Bar with Live Clock & Store Name */}
      <header className="pos-orders-topbar">
        {/* Left: Brand Logo & Store Name */}
        <div className="pos-topbar-brand-box">
          <img src={logoBlack} alt="Brand Logo" className="pos-brand-logo-img" />
          <div className="pos-store-badge-header">
            <span className="pos-store-name-tag">🎱 {storeName}</span>
          </div>
        </div>

        {/* Center: Search input */}
        <div className="pos-search-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="pos-header-search-input"
            placeholder="Tìm theo tên bàn, mã hóa đơn (vd: Bàn 1, HD-107493)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Right: Live Clock & Staff Profile */}
        <div className="pos-topbar-actions">
          {/* Live Real-time Clock */}
          <div className="pos-header-live-clock">
            <span className="clock-icon">🕒</span>
            <span className="clock-time-val">{formatHeaderClock(currentTime)}</span>
          </div>

          {/* User Profile Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="pos-user-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <div className="pos-user-avatar">
                {userName.substring(0, 2).toUpperCase()}
              </div>
              <span className="pos-user-name">{userName}</span>
              <span className="dropdown-arrow-small">{isUserMenuOpen ? '▲' : '▼'}</span>
            </button>

            {isUserMenuOpen && (
              <div className="admin-user-dropdown-menu" style={{ width: '200px' }}>
                <div className="dropdown-menu-header">
                  <strong>{userName}</strong>
                  <small>Thu ngân quầy POS</small>
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
                  🚪 Đăng xuất ca làm việc
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area (Clean Full-Width, No Sidebar) */}
      <div className="pos-orders-full-body">
        {/* Filter Pills Bar */}
        <div className="pos-orders-filter-bar">
          <div className="pos-filter-pills-group">
            <button
              type="button"
              className={`filter-pill-btn ${activeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              Tất cả ({orders.length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${activeFilter === 'playing' ? 'active' : ''}`}
              onClick={() => setActiveFilter('playing')}
            >
              🟢 Đang chơi ({orders.filter((o) => o.status === 'playing').length})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${activeFilter === 'waiting_payment' ? 'active' : ''}`}
              onClick={() => setActiveFilter('waiting_payment')}
            >
              🟡 Chờ tính tiền ({orders.filter((o) => o.status === 'waiting_payment').length})
            </button>
          </div>

          {/* Button Thêm đơn mới */}
          <button type="button" className="btn-pos-add-order" onClick={handleCreateNewOrder}>
            <span>⊕ Mở đơn tính giờ mới</span>
          </button>
        </div>

        {/* Orders Cards Grid */}
        <div className="pos-orders-cards-container">
          {filteredOrders.length === 0 ? (
            <div className="empty-orders-view">
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎱</div>
              <h3>Không có bàn nào đang hoạt động</h3>
              <p>Hãy bấm "Mở đơn tính giờ mới" hoặc chuyển sang tab "Khu vực" để chọn bàn mở chơi.</p>
            </div>
          ) : (
            <div className="pos-orders-grid">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className={`pos-order-card ${order.status === 'waiting_payment' ? 'card-waiting' : ''}`}
                  onClick={() => handleOpenOrderDetail(order)}
                >
                  {/* Card Top: Table Name & Status Pill */}
                  <div className="pos-order-card-header">
                    <div className="order-card-title-box">
                      <span className="pos-order-icon">🎱</span>
                      <strong className="pos-order-title">{order.tableName}</strong>
                      <span className="order-zone-tag">{order.zoneName}</span>
                    </div>

                    <span className={`order-status-badge ${order.status}`}>
                      {order.status === 'playing' ? 'Đang chơi' : 'Chờ thanh toán'}
                    </span>
                  </div>

                  {/* Card Meta: Time & Duration */}
                  <div className="pos-order-meta">
                    <div className="meta-time-item">
                      <span className="meta-label">Giờ vào:</span>
                      <strong>{order.startTime}</strong>
                    </div>
                    <div className="meta-time-item">
                      <span className="meta-label">Thời lượng:</span>
                      <strong style={{ color: '#0088ff' }}>🕒 {order.duration}</strong>
                    </div>
                  </div>

                  {/* Hourly Rate detail */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px', color: '#64748b', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px' }}>
                    <span>Đơn giá giờ chơi:</span>
                    <strong style={{ color: '#0f172a' }}>{order.tablePricePerHour.toLocaleString('vi-VN')} đ/h</strong>
                  </div>

                  {/* Card Bottom: Total Amount & Action */}
                  <div className="pos-order-card-bottom">
                    <div className="order-total-box">
                      <span className="total-label">Tiền giờ tạm tính:</span>
                      <span className="total-amount-val">
                        {order.totalAmount.toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn-card-quick-action"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenOrderDetail(order)
                      }}
                    >
                      Thanh toán ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          MODAL: CHI TIẾT ĐƠN HÀNG & THANH TOÁN BÀN
          ========================================================= */}
      {isOrderDetailModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsOrderDetailModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">🎱 {selectedOrder.tableName} ({selectedOrder.zoneName})</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Mã hóa đơn: {selectedOrder.orderCode}</span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsOrderDetailModalOpen(false)}>
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
              {/* Tiền giờ chơi chi tiết */}
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', color: '#64748b' }}>🕒 Giờ bắt đầu vào bàn:</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{selectedOrder.startTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', color: '#64748b' }}>⏱️ Tổng thời gian đã chơi:</span>
                  <strong style={{ fontSize: '15px', color: '#0088ff' }}>{selectedOrder.duration}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', color: '#64748b' }}>🏷️ Bảng giá bàn:</span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>{selectedOrder.tablePricePerHour.toLocaleString('vi-VN')} đ / giờ</strong>
                </div>
              </div>

              {/* Tổng cộng thanh toán */}
              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>TỔNG TIỀN THANH TOÁN:</span>
                  <small style={{ color: '#64748b' }}>Chỉ tính theo thời lượng giờ chơi thực tế</small>
                </div>
                <span style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>
                  {selectedOrder.totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => {
                  toast.info(`Đang in phiếu tạm tính cho ${selectedOrder.tableName}...`)
                }}
              >
                🖨️ In phiếu tạm tính
              </button>

              <button
                type="button"
                className="admin-btn-primary"
                style={{ background: '#10b981' }}
                onClick={() => handleCheckoutOrder(selectedOrder.id)}
              >
                💳 Thanh toán & Đóng bàn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
