import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { loadSavedZones, type ZoneConfig } from '../admin/ZoneTableSettingsScreen'

interface TableItem {
  id: string
  number: string
  area: string
  status: 'occupied' | 'available' | 'reserved' | 'waiting_payment'
  duration?: string
  itemsCount?: number
  currentAmount?: number
  items?: Array<{ name: string; quantity: number; price: number }>
}

export function PosZoneTablesScreen(): React.JSX.Element {
  const [configuredZones, setConfiguredZones] = useState<ZoneConfig[]>(loadSavedZones)
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    const saved = loadSavedZones()
    return saved.length > 0 ? saved[0].id : 'zone_1'
  })
  const [statusFilter, setStatusFilter] = useState<'all' | 'occupied' | 'available'>('all')

  // Build live table states
  const [tables, setTables] = useState<TableItem[]>(() => {
    const saved = loadSavedZones()
    const allTables: TableItem[] = []
    saved.forEach((z) => {
      z.tables.forEach((t, idx) => {
        // Some initial active demo tables for zone 1
        const isOccupiedDemo = z.id === saved[0]?.id && (idx === 0 || idx === 3 || idx === 6 || idx === 8)
        allTables.push({
          id: t.id,
          number: t.name,
          area: z.name,
          status: isOccupiedDemo ? 'occupied' : 'available',
          duration: isOccupiedDemo ? `0${idx + 1}:15` : undefined,
          itemsCount: isOccupiedDemo ? (idx === 0 ? 3 : 1) : undefined,
          currentAmount: isOccupiedDemo ? (idx === 0 ? 185000 : 105000) : undefined,
          items: isOccupiedDemo ? [{ name: 'Redbull Thái', quantity: 2, price: 25000 }] : undefined
        })
      })
    })
    return allTables
  })

  // Reload zones when opening
  useEffect(() => {
    const loaded = loadSavedZones()
    setConfiguredZones(loaded)
    if (loaded.length > 0 && !loaded.some((z) => z.id === selectedAreaId)) {
      setSelectedAreaId(loaded[0].id)
    }
  }, [])

  const currentZone = configuredZones.find((z) => z.id === selectedAreaId) || configuredZones[0]
  const currentZoneName = currentZone ? currentZone.name : 'Khu vực 1'

  // Modals state
  const [selectedTable, setSelectedTable] = useState<TableItem | null>(null)
  const [isActionModalOpen, setIsActionModalOpen] = useState(false)
  const [isAddFoodModalOpen, setIsAddFoodModalOpen] = useState(false)

  const menuItems = [
    { name: 'Redbull Thái (Bò húc)', price: 25000, cat: 'Nước' },
    { name: 'Sting Dâu tây đỏ', price: 18000, cat: 'Nước' },
    { name: 'Cà phê sữa đá pha máy', price: 25000, cat: 'Cà phê' },
    { name: 'Cà phê đen đá', price: 20000, cat: 'Cà phê' },
    { name: 'Mì tôm trứng xúc xích', price: 35000, cat: 'Đồ ăn' },
    { name: 'Khoai tây chiên giòn', price: 40000, cat: 'Đồ ăn' },
    { name: 'Bia Heineken Silver', price: 30000, cat: 'Bia' },
    { name: 'Bia Tiger Crystal', price: 28000, cat: 'Bia' }
  ]

  const zoneTables = tables.filter((t) => t.area === currentZoneName)
  const emptyCount = zoneTables.filter((t) => t.status === 'available').length
  const totalCount = zoneTables.length

  const filteredTables = zoneTables.filter((t) => {
    if (statusFilter === 'occupied') return t.status === 'occupied'
    if (statusFilter === 'available') return t.status === 'available'
    return true
  })

  const handleTableClick = (table: TableItem) => {
    setSelectedTable(table)
    setIsActionModalOpen(true)
  }

  const handleStartTable = (tableId: string) => {
    const target = tables.find((t) => t.id === tableId)
    setTables((prev) =>
      prev.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: 'occupied',
              duration: '00:01',
              itemsCount: 0,
              currentAmount: 0,
              items: []
            }
          : t
      )
    )
    setIsActionModalOpen(false)
    toast.success(`Đã mở Bàn ${target?.number || ''} thành công!`, {
      description: 'Bắt đầu tính giờ chơi tự động'
    })
  }

  const handleAddFoodItem = (itemName: string, price: number) => {
    if (!selectedTable) return
    setTables((prev) =>
      prev.map((t) => {
        if (t.id === selectedTable.id) {
          const currentItems = t.items || []
          const existingIdx = currentItems.findIndex((i) => i.name === itemName)
          let updatedItems
          if (existingIdx >= 0) {
            updatedItems = currentItems.map((i, idx) =>
              idx === existingIdx ? { ...i, quantity: i.quantity + 1 } : i
            )
          } else {
            updatedItems = [...currentItems, { name: itemName, quantity: 1, price }]
          }
          const newAmount = (t.currentAmount || 0) + price
          const newCount = updatedItems.reduce((acc, curr) => acc + curr.quantity, 0)
          return {
            ...t,
            items: updatedItems,
            currentAmount: newAmount,
            itemsCount: newCount
          }
        }
        return t
      })
    )
    setIsAddFoodModalOpen(false)
    setIsActionModalOpen(false)
    toast.info(`Đã thêm "${itemName}" vào Bàn ${selectedTable.number}`, {
      description: `Đơn giá: ${price.toLocaleString('vi-VN')} đ`
    })
  }

  const handleCheckoutTable = (tableId: string) => {
    const target = tables.find((t) => t.id === tableId)
    if (confirm(`Xác nhận thanh toán và đóng bàn cho Bàn ${selectedTable?.number}?`)) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status: 'available',
                duration: undefined,
                itemsCount: undefined,
                currentAmount: undefined,
                items: undefined
              }
            : t
        )
      )
      setIsActionModalOpen(false)
      toast.success(`Thanh toán & Đóng Bàn ${target?.number || ''} thành công!`, {
        description: `Tổng tiền: ${(target?.currentAmount || 0).toLocaleString('vi-VN')} đ`
      })
    }
  }

  return (
    <div className="pos-zone-screen">
      {/* Top Header Bar with Dynamic Zone Selector & Status Tabs */}
      <div className="pos-zone-topbar">
        <div className="pos-zone-selector" style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
          {configuredZones.map((z) => (
            <button
              key={z.id}
              type="button"
              className={`btn-zone-active ${selectedAreaId === z.id ? 'active' : ''}`}
              onClick={() => setSelectedAreaId(z.id)}
            >
              {z.name}
            </button>
          ))}
        </div>

        <div className="pos-status-tabs">
          <button
            type="button"
            className={`pos-status-tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`pos-status-tab-btn ${statusFilter === 'occupied' ? 'active' : ''}`}
            onClick={() => setStatusFilter('occupied')}
          >
            Có khách
          </button>
          <button
            type="button"
            className={`pos-status-tab-btn ${statusFilter === 'available' ? 'active' : ''}`}
            onClick={() => setStatusFilter('available')}
          >
            Trống
          </button>
        </div>
      </div>

      {/* Subtext info */}
      <div className="pos-zone-info-bar">
        <span className="pos-empty-count-label">
          Bàn trống: <strong>{emptyCount}/{totalCount}</strong>
        </span>
      </div>

      {/* Tables Grid */}
      <div className="pos-tables-grid-container">
        <div className="pos-tables-grid">
          {filteredTables.map((t) => (
            <div
              key={t.id}
              className={`pos-table-card ${
                t.status === 'occupied' ? 'pos-table-occupied' : 'pos-table-available'
              }`}
              onClick={() => handleTableClick(t)}
            >
              <div className="pos-table-number">{t.number}</div>

              {t.status === 'occupied' && (
                <div className="pos-table-timer">
                  <span className="timer-icon">🕒</span>
                  <span>{t.duration}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend Footer */}
      <div className="pos-legend-footer">
        <div className="pos-legend-item">
          <span className="legend-dot legend-dot-empty"></span>
          <span>Trống</span>
        </div>
        <div className="pos-legend-item">
          <span className="legend-dot legend-dot-occupied"></span>
          <span>Bàn có khách</span>
        </div>
        <div className="pos-legend-item">
          <span className="legend-dot legend-dot-reserved"></span>
          <span>Đã đặt</span>
        </div>
        <div className="pos-legend-item">
          <span className="legend-dot legend-dot-waiting"></span>
          <span>Chờ thanh toán</span>
        </div>
      </div>

      {/* Table Detail / Action Modal */}
      {isActionModalOpen && selectedTable && (
        <div className="modal-overlay" onClick={() => setIsActionModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                🎱 Bàn {selectedTable.number} ({selectedTable.area})
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsActionModalOpen(false)}>
                ✕
              </button>
            </div>

            {selectedTable.status === 'available' ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                  Bàn hiện đang trống. Bạn muốn bắt đầu tính giờ mở bàn cho khách?
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setIsActionModalOpen(false)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="admin-btn-primary"
                    style={{ flex: 1 }}
                    onClick={() => handleStartTable(selectedTable.id)}
                  >
                    ⚡ Bắt đầu chơi
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#1e40af', display: 'block' }}>Thời gian chơi</span>
                    <strong style={{ fontSize: '18px', color: '#1e3a8a' }}>🕒 {selectedTable.duration}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: '#1e40af', display: 'block' }}>Tạm tính</span>
                    <strong style={{ fontSize: '18px', color: '#1e3a8a' }}>
                      {(selectedTable.currentAmount || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '13.5px' }}>Món đã gọi ({selectedTable.itemsCount || 0}):</h4>
                    <button
                      type="button"
                      className="admin-btn-action"
                      onClick={() => setIsAddFoodModalOpen(true)}
                    >
                      ➕ Thêm món
                    </button>
                  </div>

                  <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px' }}>
                    {selectedTable.items && selectedTable.items.length > 0 ? (
                      selectedTable.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: idx < selectedTable.items!.length - 1 ? '1px dashed #f1f5f9' : 'none' }}>
                          <span>{item.name} x {item.quantity}</span>
                          <strong>{(item.price * item.quantity).toLocaleString('vi-VN')} đ</strong>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '12.5px', padding: '8px' }}>
                        Chưa có món nào được gọi
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setIsActionModalOpen(false)}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="admin-btn-primary"
                    style={{ flex: 1.5, background: '#10b981' }}
                    onClick={() => handleCheckoutTable(selectedTable.id)}
                  >
                    💳 Thanh toán & In Bill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add F&B Modal */}
      {isAddFoodModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddFoodModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '400px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🍽️ Thêm món vào Bàn {selectedTable?.number}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddFoodModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
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
                  onClick={() => handleAddFoodItem(food.name, food.price)}
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
