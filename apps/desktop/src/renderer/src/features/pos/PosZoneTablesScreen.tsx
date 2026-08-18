import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { loadSavedZones, type ZoneConfig } from '../admin/ZoneTableSettingsScreen'

interface TableItem {
  id: string
  number: string
  area: string
  status: 'occupied' | 'available' | 'reserved' | 'waiting_payment'
  duration?: string
  currentAmount?: number
  pricePerHour?: number
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
        const isOccupiedDemo = z.id === saved[0]?.id && (idx === 0 || idx === 3 || idx === 6 || idx === 8)
        allTables.push({
          id: t.id,
          number: t.name,
          area: z.name,
          status: isOccupiedDemo ? 'occupied' : 'available',
          duration: isOccupiedDemo ? `0${idx + 1}:15` : undefined,
          pricePerHour: 60000,
          currentAmount: isOccupiedDemo ? (idx + 1.25) * 60000 : undefined
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
              pricePerHour: 60000,
              currentAmount: 1000
            }
          : t
      )
    )
    setIsActionModalOpen(false)
    toast.success(`Đã mở ${target?.number || 'bàn'} thành công!`, {
      description: 'Bắt đầu tính giờ chơi bida tự động (60.000 đ/giờ)'
    })
  }

  const handleCheckoutTable = (tableId: string) => {
    const target = tables.find((t) => t.id === tableId)
    if (confirm(`Xác nhận thanh toán tiền giờ và đóng bàn cho ${selectedTable?.number} (${selectedTable?.area})?`)) {
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId
            ? {
                ...t,
                status: 'available',
                duration: undefined,
                currentAmount: undefined
              }
            : t
        )
      )
      setIsActionModalOpen(false)
      toast.success(`Thanh toán & Đóng ${target?.number || 'bàn'} thành công!`, {
        description: `Tổng tiền giờ: ${(target?.currentAmount || 0).toLocaleString('vi-VN')} đ`
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
                🎱 {selectedTable.number} ({selectedTable.area})
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
                    ⚡ Bắt đầu tính giờ
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: '#eff6ff', padding: '14px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#1e40af', display: 'block' }}>Thời gian đã chơi</span>
                    <strong style={{ fontSize: '20px', color: '#1e3a8a' }}>🕒 {selectedTable.duration}</strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '12px', color: '#1e40af', display: 'block' }}>Tiền giờ tạm tính</span>
                    <strong style={{ fontSize: '20px', color: '#10b981' }}>
                      {(selectedTable.currentAmount || 0).toLocaleString('vi-VN')} đ
                    </strong>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px', background: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                  <span>Đơn giá giờ: <strong>60.000 đ/giờ</strong></span>
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
                    💳 Thanh toán & Đóng bàn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
