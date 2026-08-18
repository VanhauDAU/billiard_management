import React, { useState } from 'react'
import { toast } from 'sonner'

export interface TableConfig {
  id: string
  name: string
  type: 'pool' | 'carom' | 'libre'
  status?: 'available' | 'occupied' | 'reserved'
}

export interface ZoneConfig {
  id: string
  name: string
  order: number
  tables: TableConfig[]
}

interface ZoneTableSettingsScreenProps {
  onBack: () => void
}

const STORAGE_ZONES_KEY = 'billiard_zones_tables_v1'

const DEFAULT_ZONES: ZoneConfig[] = [
  {
    id: 'zone_1',
    name: 'Khu vực 1',
    order: 1,
    tables: [
      { id: 't_1', name: '1', type: 'pool' },
      { id: 't_2', name: '2', type: 'pool' },
      { id: 't_3', name: '3', type: 'pool' },
      { id: 't_4', name: '4', type: 'pool' },
      { id: 't_5', name: '5', type: 'pool' },
      { id: 't_6', name: '6', type: 'pool' },
      { id: 't_7', name: '7', type: 'pool' },
      { id: 't_8', name: '8', type: 'pool' },
      { id: 't_9', name: '9', type: 'pool' },
      { id: 't_10', name: '10', type: 'pool' },
      { id: 't_11', name: '0023', type: 'pool' }
    ]
  }
]

export function loadSavedZones(): ZoneConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_ZONES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn('Could not read zones from storage', e)
  }
  return DEFAULT_ZONES
}

export function saveZonesToStorage(zones: ZoneConfig[]): void {
  try {
    localStorage.setItem(STORAGE_ZONES_KEY, JSON.stringify(zones))
  } catch (e) {
    console.error('Failed to save zones to localStorage', e)
  }
}

export function ZoneTableSettingsScreen({ onBack }: ZoneTableSettingsScreenProps): React.JSX.Element {
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'detail'>('list')
  const [zones, setZones] = useState<ZoneConfig[]>(loadSavedZones)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)

  // Create Zone State
  const [newZoneName, setNewZoneName] = useState('')
  const [newZoneTables, setNewZoneTables] = useState<TableConfig[]>([])

  // Detail Zone State
  const [editZoneName, setEditZoneName] = useState('')
  const [editZoneTables, setEditZoneTables] = useState<TableConfig[]>([])

  // Modal: Add Single Table
  const [isAddTableModalOpen, setIsAddTableModalOpen] = useState(false)
  const [modalTargetContext, setModalTargetContext] = useState<'create' | 'detail'>('create')
  const [tableNameInput, setTableNameInput] = useState('')
  const [tableTypeInput, setTableTypeInput] = useState<'pool' | 'carom' | 'libre'>('pool')

  // Total summary calculation
  const totalZonesCount = zones.length
  const totalTablesCount = zones.reduce((sum, z) => sum + (z.tables ? z.tables.length : 0), 0)

  // When switching to 'create' mode, preset default zone name
  const handleOpenCreateZone = () => {
    const nextIndex = zones.length + 1
    setNewZoneName(`Khu vực ${nextIndex}`)
    setNewZoneTables([])
    setViewMode('create')
  }

  // When opening zone detail
  const handleOpenZoneDetail = (zone: ZoneConfig) => {
    setSelectedZoneId(zone.id)
    setEditZoneName(zone.name)
    setEditZoneTables([...zone.tables])
    setViewMode('detail')
  }

  // Open modal to add a single table
  const handleOpenAddTableModal = (targetContext: 'create' | 'detail') => {
    setModalTargetContext(targetContext)
    const currentList = targetContext === 'create' ? newZoneTables : editZoneTables
    const nextNumber = currentList.length + 1
    setTableNameInput(nextNumber < 10 ? `00${nextNumber}` : `0${nextNumber}`)
    setTableTypeInput('pool')
    setIsAddTableModalOpen(true)
  }

  // Save single table from modal
  const handleSaveModalTable = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = tableNameInput.trim()
    if (!trimmedName) {
      toast.error('Vui lòng nhập tên bàn/ phòng!')
      return
    }

    const newTable: TableConfig = {
      id: `table_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: trimmedName,
      type: tableTypeInput
    }

    if (modalTargetContext === 'create') {
      setNewZoneTables((prev) => [...prev, newTable])
    } else {
      setEditZoneTables((prev) => [...prev, newTable])
    }

    setIsAddTableModalOpen(false)
    toast.success(`Đã thêm bàn "${trimmedName}"!`)
  }

  // Delete table from temp create list
  const handleDeleteNewZoneTable = (tableId: string) => {
    setNewZoneTables((prev) => prev.filter((t) => t.id !== tableId))
  }

  // Delete table from edit list
  const handleDeleteEditZoneTable = (tableId: string) => {
    setEditZoneTables((prev) => prev.filter((t) => t.id !== tableId))
  }

  // Reorder tables inside Create form
  const moveNewZoneTable = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= newZoneTables.length) return
    const updated = [...newZoneTables]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    setNewZoneTables(updated)
  }

  // Reorder tables inside Detail form
  const moveEditZoneTable = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= editZoneTables.length) return
    const updated = [...editZoneTables]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    setEditZoneTables(updated)
  }

  // Reorder zones in main list
  const moveZone = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= zones.length) return
    const updated = [...zones]
    const temp = updated[index]
    updated[index] = updated[targetIdx]
    updated[targetIdx] = temp
    // update order numbers
    const reordered = updated.map((z, idx) => ({ ...z, order: idx + 1 }))
    setZones(reordered)
    saveZonesToStorage(reordered)
    toast.success('Đã cập nhật thứ tự khu vực!')
  }

  // Save new zone
  const handleSaveNewZone = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newZoneName.trim()) {
      toast.error('Vui lòng nhập tên khu vực!')
      return
    }
    if (newZoneTables.length === 0) {
      toast.error('Khu vực chưa có bàn/ phòng! Vui lòng thêm ít nhất 1 bàn trước khi lưu.')
      return
    }

    const newZone: ZoneConfig = {
      id: `zone_${Date.now()}`,
      name: newZoneName.trim(),
      order: zones.length + 1,
      tables: newZoneTables
    }

    const updatedZones = [...zones, newZone]
    setZones(updatedZones)
    saveZonesToStorage(updatedZones)
    setViewMode('list')
    toast.success(`Đã tạo thành công "${newZone.name}" với ${newZone.tables.length} bàn!`)
  }

  // Save existing zone update & table reordering
  const handleSaveZoneDetail = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editZoneName.trim()) {
      toast.error('Vui lòng nhập tên khu vực!')
      return
    }
    if (editZoneTables.length === 0) {
      toast.error('Khu vực cần có ít nhất 1 bàn/ phòng!')
      return
    }

    const updatedZones = zones.map((z) =>
      z.id === selectedZoneId
        ? {
            ...z,
            name: editZoneName.trim(),
            tables: editZoneTables
          }
        : z
    )

    setZones(updatedZones)
    saveZonesToStorage(updatedZones)
    setViewMode('list')
    toast.success(`Đã cập nhật danh sách bàn và thứ tự cho "${editZoneName}"!`)
  }

  // Delete an entire zone
  const handleDeleteZone = (zoneId: string, zoneName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa khu vực "${zoneName}" và tất cả bàn bên trong?`)) {
      const updated = zones.filter((z) => z.id !== zoneId).map((z, idx) => ({ ...z, order: idx + 1 }))
      setZones(updated)
      saveZonesToStorage(updated)
      setViewMode('list')
      toast.success(`Đã xóa khu vực "${zoneName}"!`)
    }
  }

  return (
    <div className="zone-settings-page-wrapper">
      {/* =========================================================
          VIEW 1: DANH SÁCH KHU VỰC (SCREENSHOT 1)
          ========================================================= */}
      {viewMode === 'list' && (
        <div className="zone-screen-container">
          {/* Top Main Header */}
          <div className="zone-screen-topbar">
            <div className="zone-title-area">
              <button type="button" className="zone-breadcrumb-back-btn" onClick={onBack}>
                <span>‹ Quay lại thiết lập cửa hàng</span>
              </button>
              <h1 className="zone-screen-title">Thiết lập khu vực</h1>
            </div>

            <button type="button" className="zone-btn-primary-action" onClick={handleOpenCreateZone}>
              <span>⊕</span>
              <span>Thêm khu vực</span>
            </button>
          </div>

          {/* 2-Column Content Grid */}
          <div className="zone-content-2col-layout">
            {/* Left Context Column */}
            <div className="zone-meta-sidebar-col">
              <h3 className="zone-meta-title">Danh sách khu vực</h3>
              <p className="zone-meta-desc">
                Cho phép thiết lập, sắp xếp, chỉnh sửa các khu vực, bàn/ phòng trong cửa hàng.
              </p>
              <div className="zone-meta-summary-stat">
                Tổng số: <strong>{totalTablesCount} bàn/ phòng</strong> / <strong>{totalZonesCount} khu vực</strong>
              </div>
            </div>

            {/* Right Card: Zone List Table */}
            <div className="zone-list-card">
              {/* Tab Header */}
              <div className="zone-card-tabs-header">
                <button type="button" className="zone-card-tab-item active">
                  Tất cả khu vực
                </button>
              </div>

              {/* Table Header Row */}
              <div className="zone-table-header-row">
                <span className="col-zone-name">Tên khu vực</span>
                <span className="col-zone-count">Số lượng bàn/ phòng</span>
              </div>

              {/* Zone List Items */}
              <div className="zone-items-list-body">
                {zones.map((zone, idx) => (
                  <div key={zone.id} className="zone-list-row-item" onClick={() => handleOpenZoneDetail(zone)}>
                    <div className="zone-row-left">
                      <span className="zone-row-index">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <strong className="zone-row-name-link">{zone.name}</strong>
                    </div>

                    <div className="zone-row-right">
                      <span className="zone-row-count-badge">{zone.tables.length}</span>
                      
                      {/* Reorder Up/Down buttons */}
                      <div className="zone-reorder-btn-group" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="btn-order-arrow"
                          disabled={idx === 0}
                          onClick={() => moveZone(idx, 'up')}
                          title="Di chuyển lên"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="btn-order-arrow"
                          disabled={idx === zones.length - 1}
                          onClick={() => moveZone(idx, 'down')}
                          title="Di chuyển xuống"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Drag Handle Icon */}
                      <span className="zone-drag-handle-icon" title="Kéo thả hoặc dùng mũi tên để sắp xếp thứ tự">
                        ⠿
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          VIEW 2: TẠO KHU VỰC (SCREENSHOT 2)
          ========================================================= */}
      {viewMode === 'create' && (
        <div className="zone-screen-container">
          {/* Top Header */}
          <div className="zone-screen-topbar">
            <div className="zone-title-area">
              <button type="button" className="zone-breadcrumb-back-btn" onClick={() => setViewMode('list')}>
                <span>‹ Quản lý bàn/ phòng</span>
              </button>
              <h1 className="zone-screen-title">Tạo khu vực</h1>
            </div>

            <button
              type="button"
              className="zone-btn-primary-action"
              onClick={() => handleOpenAddTableModal('create')}
            >
              <span>Thêm bàn/ phòng mới</span>
            </button>
          </div>

          <form onSubmit={handleSaveNewZone} className="create-zone-form-wrapper">
            <div className="create-zone-card">
              {/* Tên khu vực input */}
              <div className="create-zone-name-row">
                <label className="create-zone-label">Tên khu vực</label>
                <input
                  type="text"
                  className="create-zone-input"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="Nhập tên khu vực (vd: Khu vực 2, Lầu 1, VIP Room)"
                  required
                />
              </div>

              {/* State A: Chưa có bàn/phòng */}
              {newZoneTables.length === 0 ? (
                <div className="empty-zone-tables-placeholder">
                  {/* Table Illustration */}
                  <div className="empty-zone-illustration">
                    <div className="empty-illustration-icon">🪑 🎱 🪑</div>
                  </div>
                  <h3 className="empty-zone-text">Khu vực này chưa có bàn/phòng</h3>
                  <button
                    type="button"
                    className="zone-btn-add-table-center"
                    onClick={() => handleOpenAddTableModal('create')}
                  >
                    Thêm bàn/ phòng mới
                  </button>
                </div>
              ) : (
                /* State B: Đã thêm bàn -> hiển thị danh sách & cho phép sắp xếp */
                <div className="zone-created-tables-section">
                  <div className="created-tables-header">
                    <strong>Danh sách bàn trong khu vực ({newZoneTables.length} bàn)</strong>
                    <button
                      type="button"
                      className="btn-add-table-inline"
                      onClick={() => handleOpenAddTableModal('create')}
                    >
                      + Thêm bàn khác
                    </button>
                  </div>

                  <div className="created-tables-list">
                    {newZoneTables.map((tbl, idx) => (
                      <div key={tbl.id} className="created-table-item-row">
                        <div className="table-row-info">
                          <span className="table-row-num">{idx + 1}.</span>
                          <span className="table-billiard-icon">🎱</span>
                          <strong className="table-name-txt">{tbl.name}</strong>
                          <span className="table-type-pill">
                            {tbl.type === 'pool' ? 'Bàn Lỗ' : tbl.type === 'carom' ? 'Carom 3C' : 'Bàn Líp'}
                          </span>
                        </div>

                        <div className="table-row-actions">
                          <button
                            type="button"
                            className="btn-order-arrow"
                            disabled={idx === 0}
                            onClick={() => moveNewZoneTable(idx, 'up')}
                            title="Di chuyển lên"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="btn-order-arrow"
                            disabled={idx === newZoneTables.length - 1}
                            onClick={() => moveNewZoneTable(idx, 'down')}
                            title="Di chuyển xuống"
                          >
                            ▼
                          </button>
                          <button
                            type="button"
                            className="btn-del-table"
                            onClick={() => handleDeleteNewZoneTable(tbl.id)}
                            title="Xóa bàn này"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save Action */}
            <div className="create-zone-footer">
              <button
                type="submit"
                className={`btn-save-zone ${newZoneTables.length === 0 ? 'disabled' : ''}`}
                disabled={newZoneTables.length === 0}
                title={newZoneTables.length === 0 ? 'Vui lòng thêm ít nhất 1 bàn để lưu' : 'Lưu khu vực'}
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          VIEW 3: CHI TIẾT & SẮP XẾP BÀN TRONG KHU VỰC
          ========================================================= */}
      {viewMode === 'detail' && (
        <div className="zone-screen-container">
          {/* Top Header */}
          <div className="zone-screen-topbar">
            <div className="zone-title-area">
              <button type="button" className="zone-breadcrumb-back-btn" onClick={() => setViewMode('list')}>
                <span>‹ Quản lý bàn/ phòng</span>
              </button>
              <h1 className="zone-screen-title">Chi tiết khu vực: {editZoneName}</h1>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn-delete-zone-outline"
                onClick={() => selectedZoneId && handleDeleteZone(selectedZoneId, editZoneName)}
              >
                🗑️ Xóa khu vực
              </button>
              <button
                type="button"
                className="zone-btn-primary-action"
                onClick={() => handleOpenAddTableModal('detail')}
              >
                <span>Thêm bàn/ phòng mới</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveZoneDetail} className="create-zone-form-wrapper">
            <div className="create-zone-card">
              {/* Tên khu vực edit */}
              <div className="create-zone-name-row">
                <label className="create-zone-label">Tên khu vực</label>
                <input
                  type="text"
                  className="create-zone-input"
                  value={editZoneName}
                  onChange={(e) => setEditZoneName(e.target.value)}
                  required
                />
              </div>

              {/* Sắp xếp thứ tự danh sách bàn */}
              <div className="zone-created-tables-section">
                <div className="created-tables-header">
                  <div>
                    <strong>Sắp xếp thứ tự hiển thị bàn ({editZoneTables.length} bàn)</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Thứ tự này quyết định vị trí render các thẻ bàn trên màn hình Bán hàng (POS)
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn-add-table-inline"
                    onClick={() => handleOpenAddTableModal('detail')}
                  >
                    + Thêm bàn mới
                  </button>
                </div>

                <div className="created-tables-list">
                  {editZoneTables.map((tbl, idx) => (
                    <div key={tbl.id} className="created-table-item-row">
                      <div className="table-row-info">
                        <span className="table-row-num">{idx + 1}.</span>
                        <span className="table-billiard-icon">🎱</span>
                        <strong className="table-name-txt">{tbl.name}</strong>
                        <span className="table-type-pill">
                          {tbl.type === 'pool' ? 'Bàn Lỗ' : tbl.type === 'carom' ? 'Carom 3C' : 'Bàn Líp'}
                        </span>
                      </div>

                      <div className="table-row-actions">
                        <button
                          type="button"
                          className="btn-order-arrow"
                          disabled={idx === 0}
                          onClick={() => moveEditZoneTable(idx, 'up')}
                          title="Đẩy lên trước"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="btn-order-arrow"
                          disabled={idx === editZoneTables.length - 1}
                          onClick={() => moveEditZoneTable(idx, 'down')}
                          title="Đẩy xuống sau"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          className="btn-del-table"
                          onClick={() => handleDeleteEditZoneTable(tbl.id)}
                          title="Xóa bàn này"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="create-zone-footer">
              <button type="submit" className="btn-save-zone">
                Lưu thứ tự & Cập nhật
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================
          POPUP MODAL: THÊM BÀN / PHÒNG (SCREENSHOT 3)
          ========================================================= */}
      {isAddTableModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddTableModalOpen(false)}>
          <div className="add-table-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <h3 className="modal-title">Thêm bàn/ phòng</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddTableModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModalTable} className="add-table-modal-body">
              <div className="add-table-modal-grid">
                {/* Left Form: Tên bàn & Loại bàn */}
                <div className="add-table-form-col">
                  {/* Tên bàn/phòng */}
                  <div className="modal-field-group">
                    <label className="modal-field-label">Tên bàn/ phòng</label>
                    <input
                      type="text"
                      className="modal-field-input"
                      value={tableNameInput}
                      onChange={(e) => setTableNameInput(e.target.value)}
                      placeholder="vd: 001, Bàn 01, VIP 01"
                      autoFocus
                      required
                    />
                  </div>

                  {/* Loại bàn bida */}
                  <div className="modal-field-group" style={{ marginTop: '16px' }}>
                    <label className="modal-field-label">Loại bàn bida</label>
                    <div className="table-type-selector-grid">
                      <button
                        type="button"
                        className={`btn-type-select ${tableTypeInput === 'pool' ? 'active' : ''}`}
                        onClick={() => setTableTypeInput('pool')}
                      >
                        Bàn Lỗ (Pool)
                      </button>
                      <button
                        type="button"
                        className={`btn-type-select ${tableTypeInput === 'carom' ? 'active' : ''}`}
                        onClick={() => setTableTypeInput('carom')}
                      >
                        Carom (3 Băng)
                      </button>
                      <button
                        type="button"
                        className={`btn-type-select ${tableTypeInput === 'libre' ? 'active' : ''}`}
                        onClick={() => setTableTypeInput('libre')}
                      >
                        Bàn Líp (Libre)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Visual Preview (Matching Screenshot 3) */}
                <div className="add-table-preview-col">
                  <div className="billiard-table-preview-box">
                    <div className="billiard-table-shape">
                      <span className="preview-cue-dot dot-left"></span>
                      <div className="preview-table-felt">
                        <span className="preview-billiard-icon">🎱</span>
                        <strong className="preview-table-name">{tableNameInput || '---'}</strong>
                      </div>
                      <span className="preview-cue-dot dot-right"></span>
                    </div>
                    <span className="preview-caption-text">
                      {tableTypeInput === 'pool' ? 'Bàn Lỗ (Pool)' : tableTypeInput === 'carom' ? 'Carom (3 Băng)' : 'Bàn Líp (Libre)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer-actions">
                <button type="button" className="btn-modal-cancel" onClick={() => setIsAddTableModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-modal-submit">
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
