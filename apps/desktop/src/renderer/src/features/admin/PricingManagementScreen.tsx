import React, { useState } from 'react'

interface PricingRule {
  id: string
  tableTypeName: string
  basePricePerHour: number
  peakHourPricePerHour: number
  peakHours: string
  weekendPricePerHour: number
  minMinutes: number
  roundMinutes: number
}

export function PricingManagementScreen(): React.JSX.Element {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([
    {
      id: 'pr_1',
      tableTypeName: 'Bàn Pool 9-Ball (Bàn Lỗ)',
      basePricePerHour: 60000,
      peakHourPricePerHour: 75000,
      peakHours: '18:00 - 23:00',
      weekendPricePerHour: 75000,
      minMinutes: 15,
      roundMinutes: 5
    },
    {
      id: 'pr_2',
      tableTypeName: 'Bàn Carom 3 Băng',
      basePricePerHour: 70000,
      peakHourPricePerHour: 85000,
      peakHours: '18:00 - 23:00',
      weekendPricePerHour: 85000,
      minMinutes: 15,
      roundMinutes: 5
    },
    {
      id: 'pr_3',
      tableTypeName: 'Bàn Libre (Bàn Líp)',
      basePricePerHour: 50000,
      peakHourPricePerHour: 60000,
      peakHours: '18:00 - 23:00',
      weekendPricePerHour: 60000,
      minMinutes: 15,
      roundMinutes: 5
    }
  ])

  const [editingRule, setEditingRule] = useState<PricingRule | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleEdit = (rule: PricingRule) => {
    setEditingRule({ ...rule })
    setIsModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRule) return

    setPricingRules((prev) =>
      prev.map((r) => (r.id === editingRule.id ? editingRule : r))
    )
    setIsModalOpen(false)
    setEditingRule(null)
  }

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">💲 Cấu Hình Bảng Giá Giờ Chơi</h1>
          <p className="admin-page-subtitle">
            Thiết lập đơn giá giờ chơi cơ bản, khung giờ vàng cao điểm và ngày cuối tuần theo từng loại bàn
          </p>
        </div>
      </div>

      {/* Pricing Table */}
      <div className="admin-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Loại bàn</th>
                <th style={{ textAlign: 'right' }}>Giá ngày thường</th>
                <th style={{ textAlign: 'right' }}>Giá giờ cao điểm</th>
                <th>Khung giờ cao điểm</th>
                <th style={{ textAlign: 'right' }}>Giá cuối tuần</th>
                <th style={{ textAlign: 'center' }}>Làm tròn</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {pricingRules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>🎱</span>
                      <strong>{rule.tableTypeName}</strong>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                    {rule.basePricePerHour.toLocaleString('vi-VN')} đ/h
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                    {rule.peakHourPricePerHour.toLocaleString('vi-VN')} đ/h
                  </td>
                  <td>
                    <span className="badge-pill bg-amber-50 text-amber-700">
                      ⏰ {rule.peakHours}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                    {rule.weekendPricePerHour.toLocaleString('vi-VN')} đ/h
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="badge-tag">Mỗi {rule.roundMinutes} phút</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="admin-btn-action"
                      onClick={() => handleEdit(rule)}
                    >
                      ✏️ Sửa giá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px', padding: '14px', background: '#eff6ff', borderRadius: '10px', fontSize: '13px', color: '#1e40af', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span>💡</span>
          <span>
            <strong>Nguyên tắc Snapshot giá:</strong> Khi khách mở bàn, giá sẽ được snapshot cố định tại thời điểm chơi. Việc thay đổi bảng giá sau này sẽ chỉ áp dụng cho các phiên chơi mới, không ảnh hưởng đến các hóa đơn lịch sử.
          </span>
        </div>
      </div>

      {/* Edit Pricing Modal */}
      {isModalOpen && editingRule && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">✏️ Chỉnh sửa Bảng giá: {editingRule.tableTypeName}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="admin-modal-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Giá ngày thường (VND / Giờ) *</label>
                <input
                  type="number"
                  step={1000}
                  className="admin-form-input"
                  value={editingRule.basePricePerHour}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, basePricePerHour: Number(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-group">
                  <label className="admin-form-label">Giá giờ cao điểm (VND / Giờ)</label>
                  <input
                    type="number"
                    step={1000}
                    className="admin-form-input"
                    value={editingRule.peakHourPricePerHour}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        peakHourPricePerHour: Number(e.target.value)
                      })
                    }
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Khung giờ cao điểm</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    value={editingRule.peakHours}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, peakHours: e.target.value })
                    }
                    placeholder="18:00 - 23:00"
                    required
                  />
                </div>
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-group">
                  <label className="admin-form-label">Giá cuối tuần (Thứ 7 & CN)</label>
                  <input
                    type="number"
                    step={1000}
                    className="admin-form-input"
                    value={editingRule.weekendPricePerHour}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        weekendPricePerHour: Number(e.target.value)
                      })
                    }
                    required
                  />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Quy tắc làm tròn phút</label>
                  <select
                    className="admin-form-select"
                    value={editingRule.roundMinutes}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        roundMinutes: Number(e.target.value)
                      })
                    }
                  >
                    <option value={1}>Chính xác từng phút (1 phút)</option>
                    <option value={5}>Làm tròn mỗi 5 phút</option>
                    <option value={10}>Làm tròn mỗi 10 phút</option>
                    <option value={15}>Làm tròn mỗi 15 phút</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy bỏ
                </button>
                <button type="submit" className="admin-btn-primary">
                  Lưu cấu hình giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
