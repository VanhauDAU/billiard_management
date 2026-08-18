import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import logoBlack from '../../assets/logo_black_1200x400.svg'
import { loadSavedZones } from '../admin/ZoneTableSettingsScreen'

export interface OrderItemDetail {
  name: string
  quantity: number
  price: number
}

export interface PosOrder {
  id: string
  orderCode: string
  tableName: string
  zoneName: string
  startTime: string
  duration: string
  tablePricePerHour: number
  tableAmount: number
  items: OrderItemDetail[]
  itemsAmount: number
  totalAmount: number
  status: 'playing' | 'waiting_payment' | 'completed'
  type: 'dine_in' | 'takeaway'
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
  const [activeFilter, setActiveFilter] = useState<'all' | 'playing' | 'waiting_payment' | 'takeaway'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PosOrder | null>(null)
  const [isOrderDetailModalOpen, setIsOrderDetailModalOpen] = useState(false)
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false)

  // Real-time clock inside screen header
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Real operational orders state
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
      items: [
        { name: 'Redbull Thái', quantity: 2, price: 25000 },
        { name: 'Mì tôm xúc xích', quantity: 1, price: 35000 }
      ],
      itemsAmount: 85000,
      totalAmount: 334000,
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
      items: [],
      itemsAmount: 0,
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
      items: [
        { name: 'Cà phê sữa đá', quantity: 1, price: 25000 },
        { name: 'Khoai tây chiên', quantity: 1, price: 40000 }
      ],
      itemsAmount: 65000,
      totalAmount: 319000,
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
      items: [
        { name: 'Sting Dâu', quantity: 2, price: 18000 }
      ],
      itemsAmount: 36000,
      totalAmount: 273000,
      status: 'playing',
      type: 'dine_in'
    }
  ])

  const menuItems = [
    { name: 'Redbull Thái (Bò húc)', price: 25000, cat: 'Nước' },
    { name: 'Sting Dâu tây đỏ', price: 18000, cat: 'Nước' },
    { name: 'Cà phê sữa đá pha máy', price: 25000, cat: 'Cà phê' },
    { name: 'Cà phê đen đá', price: 20000, cat: 'Cà phê' },
    { name: 'Mì tôm trứng xúc xích', price: 35000, cat: 'Đồ ăn' },
    { name: 'Khoai tây chiên giòn', price: 40000, cat: 'Đồ ăn' },
    { name: 'Bia Heineken Silver', price: 30000, cat: 'Bia' },
    { name: 'Bia Tiger Crystal', price: 28000, cat: 'Bia' },
    { name: 'Nước suối Aquafina 500ml', price: 10000, cat: 'Nước' },
    { name: 'Thuốc lá Craven A', price: 30000, cat: 'Khác' }
  ]

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
    if (activeFilter === 'takeaway') return o.type === 'takeaway'
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

  // Handle Add Food to Order
  const handleAddFoodToOrder = (itemName: string, price: number) => {
    if (!selectedOrder) return

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === selectedOrder.id) {
          const currentItems = [...o.items]
          const existingIdx = currentItems.findIndex((i) => i.name === itemName)
          if (existingIdx >= 0) {
            currentItems[existingIdx] = {
              ...currentItems[existingIdx],
              quantity: currentItems[existingIdx].quantity + 1
            }
          } else {
            currentItems.push({ name: itemName, quantity: 1, price })
          }

          const newItemsAmount = currentItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
          const newTotal = o.tableAmount + newItemsAmount

          const updatedOrder: PosOrder = {
            ...o,
            items: currentItems,
            itemsAmount: newItemsAmount,
            totalAmount: newTotal
          }

          setSelectedOrder(updatedOrder)
          return updatedOrder
        }
        return o
      })
    )

    setIsAddFoodModalOpen(false)
    toast.success(`Đã thêm "${itemName}" vào đơn hàng ${selectedOrder.tableName}!`)
  }

  // Handle Checkout Order
  const handleCheckoutOrder = (orderId: string) => {
    const target = orders.find((o) => o.id === orderId)
    if (!target) return

    if (confirm(`Xác nhận thanh toán cho đơn hàng ${target.tableName} - Tổng tiền: ${target.totalAmount.toLocaleString('vi-VN')} đ?`)) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      setIsOrderDetailModalOpen(false)
      setSelectedOrder(null)
      toast.success(`Đã thanh toán & in hóa đơn thành công cho ${target.tableName}!`, {
        description: `Mã hóa đơn: ${target.orderCode} - Số tiền: ${target.totalAmount.toLocaleString('vi-VN')} đ`
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
      items: [],
      itemsAmount: 0,
      totalAmount: 1000,
      status: 'playing',
      type: 'dine_in'
    }

    setOrders((prev) => [newOrder, ...prev])
    toast.success(`Đã mở đơn hàng mới cho Bàn ${nextTableNumber}!`)
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
            <button
              type="button"
              className={`filter-pill-btn ${activeFilter === 'takeaway' ? 'active' : ''}`}
              onClick={() => setActiveFilter('takeaway')}
            >
              🛍️ Mang về ({orders.filter((o) => o.type === 'takeaway').length})
            </button>
          </div>

          {/* Button Thêm đơn mới */}
          <button type="button" className="btn-pos-add-order" onClick={handleCreateNewOrder}>
            <span>⊕ Mở đơn hàng mới</span>
          </button>
        </div>

        {/* Orders Cards Grid */}
        <div className="pos-orders-cards-container">
          {filteredOrders.length === 0 ? (
            <div className="empty-orders-view">
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
              <h3>Không tìm thấy đơn hàng nào</h3>
              <p>Hãy bấm "Mở đơn hàng mới" hoặc vào tab "Khu vực" để chọn bàn mở chơi.</p>
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
                      {order.status === 'playing' ? 'Đang chơi' : order.status === 'waiting_payment' ? 'Chờ thanh toán' : 'Hoàn tất'}
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

                  {/* Ordered Items Preview */}
                  <div className="pos-order-items-preview">
                    {order.items.length === 0 ? (
                      <span className="no-items-txt">Chưa gọi món F&B</span>
                    ) : (
                      <div className="items-tags-list">
                        {order.items.map((item, idx) => (
                          <span key={idx} className="item-pill-tag">
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Total Amount & Action */}
                  <div className="pos-order-card-bottom">
                    <div className="order-total-box">
                      <span className="total-label">Tổng tạm tính:</span>
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
                      Chi tiết ➔
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================
          MODAL: CHI TIẾT ĐƠN HÀNG & THANH TOÁN
          ========================================================= */}
      {isOrderDetailModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsOrderDetailModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div>
                <h3 className="modal-title">🎱 {selectedOrder.tableName} - {selectedOrder.zoneName}</h3>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Mã đơn: {selectedOrder.orderCode}</span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsOrderDetailModalOpen(false)}>
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
              {/* Tiền giờ chơi */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>⏱️ Tiền giờ chơi ({selectedOrder.duration})</strong>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Vào lúc: {selectedOrder.startTime} • Đơn giá: {selectedOrder.tablePricePerHour.toLocaleString('vi-VN')} đ/giờ
                  </div>
                </div>
                <strong style={{ fontSize: '15px', color: '#0088ff' }}>
                  {selectedOrder.tableAmount.toLocaleString('vi-VN')} đ
                </strong>
              </div>

              {/* Danh sách món F&B */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '13.5px', color: '#1e293b' }}>
                    🍽️ Món đã gọi ({selectedOrder.items.reduce((s, i) => s + i.quantity, 0)} phần)
                  </strong>
                  <button
                    type="button"
                    className="btn-add-table-inline"
                    onClick={() => setIsAddFoodModalOpen(true)}
                  >
                    + Gọi thêm món
                  </button>
                </div>

                {selectedOrder.items.length === 0 ? (
                  <p style={{ margin: '8px 0', fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                    Bàn này chưa order đồ ăn hay nước uống.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{item.name}</span>
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '8px' }}>
                            x{item.quantity} ({item.price.toLocaleString('vi-VN')} đ)
                          </span>
                        </div>
                        <strong style={{ fontSize: '13.5px', color: '#0f172a' }}>
                          {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tổng cộng */}
              <div style={{ borderTop: '2px dashed #cbd5e1', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>TỔNG CỘNG THANH TOÁN:</span>
                <span style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>
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
                🖨️ In tạm tính
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

      {/* =========================================================
          MODAL: CHỌN MÓN F&B THÊM VÀO ĐƠN HÀNG
          ========================================================= */}
      {isAddFoodModalOpen && selectedOrder && (
        <div className="modal-overlay" onClick={() => setIsAddFoodModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🍽️ Thêm món vào {selectedOrder.tableName}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddFoodModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '340px', overflowY: 'auto', padding: '12px 0' }}>
              {menuItems.map((food, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="admin-btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px'
                  }}
                  onClick={() => handleAddFoodToOrder(food.name, food.price)}
                >
                  <span style={{ fontWeight: 600 }}>{food.name}</span>
                  <span style={{ fontWeight: 700, color: '#0066ff' }}>
                    {food.price.toLocaleString('vi-VN')} đ
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
