import React, { useState } from 'react'

interface MenuItem {
  id: string
  name: string
  category: string
  unit: string
  price: number
  status: 'active' | 'disabled'
}

export function MenuManagementScreen(): React.JSX.Element {
  const [categories] = useState<string[]>([
    'Tất cả',
    'Nước ngọt & Nước suối',
    'Cà phê & Pha chế',
    'Bia & Rượu',
    'Đồ ăn nhanh & Mì',
    'Thuốc lá & Snack'
  ])

  const [selectedCategory, setSelectedCategory] = useState('Tất cả')

  const [menuItems, setMenuItems] = useState<MenuItem[]>([
    { id: 'm1', name: 'Redbull Thái (Bò húc)', category: 'Nước ngọt & Nước suối', unit: 'Lon', price: 25000, status: 'active' },
    { id: 'm2', name: 'Sting Dâu tây đỏ', category: 'Nước ngọt & Nước suối', unit: 'Chai', price: 18000, status: 'active' },
    { id: 'm3', name: 'Coca Cola tươi', category: 'Nước ngọt & Nước suối', unit: 'Lon', price: 18000, status: 'active' },
    { id: 'm4', name: 'Nước suối Aquafina 500ml', category: 'Nước ngọt & Nước suối', unit: 'Chai', price: 10000, status: 'active' },
    { id: 'm5', name: 'Cà phê đen đá pha phin', category: 'Cà phê & Pha chế', unit: 'Ly', price: 20000, status: 'active' },
    { id: 'm6', name: 'Cà phê sữa đá Sài Gòn', category: 'Cà phê & Pha chế', unit: 'Ly', price: 25000, status: 'active' },
    { id: 'm7', name: 'Trà đào cam sả', category: 'Cà phê & Pha chế', unit: 'Ly', price: 30000, status: 'active' },
    { id: 'm8', name: 'Bia Heineken Silver', category: 'Bia & Rượu', unit: 'Lon', price: 32000, status: 'active' },
    { id: 'm9', name: 'Bia Tiger Crystal', category: 'Bia & Rượu', unit: 'Lon', price: 28000, status: 'active' },
    { id: 'm10', name: 'Mì tôm 2 trứng xúc xích', category: 'Đồ ăn nhanh & Mì', unit: 'Tô', price: 35000, status: 'active' },
    { id: 'm11', name: 'Xúc xích Đức nướng (2 cây)', category: 'Đồ ăn nhanh & Mì', unit: 'Đĩa', price: 30000, status: 'active' },
    { id: 'm12', name: 'Khoai tây chiên giòn bơ tỏi', category: 'Đồ ăn nhanh & Mì', unit: 'Đĩa', price: 40000, status: 'active' },
    { id: 'm13', name: 'Thuốc lá Craven A (Mèo đỏ)', category: 'Thuốc lá & Snack', unit: 'Gói', price: 30000, status: 'active' },
    { id: 'm14', name: 'Thuốc lá 555 Gold', category: 'Thuốc lá & Snack', unit: 'Gói', price: 45000, status: 'active' },
    { id: 'm15', name: 'Hạt hướng dương rang củi', category: 'Thuốc lá & Snack', unit: 'Đĩa', price: 15000, status: 'active' }
  ])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    category: 'Nước ngọt & Nước suối',
    unit: 'Lon',
    price: 20000,
    status: 'active'
  })

  const filteredItems = selectedCategory === 'Tất cả'
    ? menuItems
    : menuItems.filter((i) => i.category === selectedCategory)

  const handleOpenCreate = () => {
    setModalMode('create')
    setFormData({
      name: '',
      category: selectedCategory !== 'Tất cả' ? selectedCategory : 'Nước ngọt & Nước suối',
      unit: 'Lon',
      price: 20000,
      status: 'active'
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: MenuItem) => {
    setModalMode('edit')
    setFormData({ ...item })
    setIsModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name?.trim()) return

    if (modalMode === 'create') {
      const newItem: MenuItem = {
        id: `m_${Date.now()}`,
        name: formData.name.trim(),
        category: formData.category || 'Nước ngọt & Nước suối',
        unit: formData.unit || 'Lon',
        price: Number(formData.price) || 0,
        status: formData.status || 'active'
      }
      setMenuItems((prev) => [newItem, ...prev])
    } else {
      setMenuItems((prev) =>
        prev.map((i) => (i.id === formData.id ? ({ ...i, ...formData } as MenuItem) : i))
      )
    }

    setIsModalOpen(false)
  }

  const handleToggleStatus = (id: string) => {
    setMenuItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: i.status === 'active' ? 'disabled' : 'active' } : i
      )
    )
  }

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">🍽️ Quản Lý Thực Đơn & Mặt Hàng</h1>
          <p className="admin-page-subtitle">
            Cấu hình danh mục thực đơn, giá bán các sản phẩm và dịch vụ F&B phục vụ tại quán
          </p>
        </div>

        <button
          type="button"
          className="admin-btn-primary"
          onClick={handleOpenCreate}
        >
          ➕ Thêm Mặt Hàng Mới
        </button>
      </div>

      {/* Category Tabs */}
      <div className="admin-subtabs-nav">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`admin-subtab-btn ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <div className="admin-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên mặt hàng / Dịch vụ</th>
                <th>Danh mục phân loại</th>
                <th style={{ textAlign: 'center' }}>Đơn vị tính</th>
                <th style={{ textAlign: 'right' }}>Đơn giá bán</th>
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '18px' }}>
                        {item.category.includes('Nước')
                          ? '🥤'
                          : item.category.includes('Cà phê')
                          ? '☕'
                          : item.category.includes('Bia')
                          ? '🍺'
                          : item.category.includes('Mì')
                          ? '🍜'
                          : '🚬'}
                      </span>
                      <strong>{item.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="badge-tag">{item.category}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>{item.unit}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {item.price.toLocaleString('vi-VN')} đ
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={
                        item.status === 'active'
                          ? 'status-badge-active'
                          : 'status-badge-inactive'
                      }
                    >
                      {item.status === 'active' ? '🟢 Đang bán' : '⚪ Tạm ngưng'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="admin-btn-action"
                        onClick={() => handleOpenEdit(item)}
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        type="button"
                        className="admin-btn-action"
                        onClick={() => handleToggleStatus(item.id)}
                      >
                        {item.status === 'active' ? 'Tắt' : 'Bật'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Create/Edit */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === 'create' ? '➕ Thêm Mặt hàng mới' : '✏️ Chỉnh sửa Mặt hàng'}
              </h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="admin-modal-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Tên mặt hàng *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  placeholder="Ví dụ: Bò húc Thái lon, Mì tôm xúc xích..."
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-group">
                  <label className="admin-form-label">Danh mục *</label>
                  <select
                    className="admin-form-select"
                    value={formData.category || 'Nước ngọt & Nước suối'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories
                      .filter((c) => c !== 'Tất cả')
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Đơn vị tính *</label>
                  <input
                    type="text"
                    className="admin-form-input"
                    placeholder="Lon, Chai, Ly, Tô, Gói..."
                    value={formData.unit || ''}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="admin-form-grid-2">
                <div className="admin-form-group">
                  <label className="admin-form-label">Đơn giá bán (VND) *</label>
                  <input
                    type="number"
                    step={1000}
                    className="admin-form-input"
                    value={formData.price || 0}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label">Trạng thái bán</label>
                  <select
                    className="admin-form-select"
                    value={formData.status || 'active'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'active' | 'disabled'
                      })
                    }
                  >
                    <option value="active">🟢 Đang phục vụ</option>
                    <option value="disabled">⚪ Tạm ngưng bán</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="admin-btn-primary">
                  {modalMode === 'create' ? 'Lưu mặt hàng' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
