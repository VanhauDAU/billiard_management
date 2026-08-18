import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Category } from '@billiards/contracts'

interface CategoryProductItem {
  id: string
  name: string
  unit: string
  price: number
  icon: string
  status: 'active' | 'out_of_stock'
}

function getCategoryProducts(categoryName: string): CategoryProductItem[] {
  const norm = categoryName.toLowerCase().trim()
  if (norm.includes('giờ') || norm.includes('gio')) {
    return [
      { id: 'p_gio_1', name: 'Bida Lỗ - Pool (Bàn tiêu chuẩn)', unit: 'Giờ', price: 60000, icon: '🎱', status: 'active' },
      { id: 'p_gio_2', name: 'Bida Phăng - Carom (Bàn Libre)', unit: 'Giờ', price: 70000, icon: '🔴', status: 'active' },
      { id: 'p_gio_3', name: 'Bida 3 Băng (Cushion 3C)', unit: 'Giờ', price: 90000, icon: '⚪', status: 'active' },
      { id: 'p_gio_4', name: 'Phòng Bàn VIP Diamond', unit: 'Giờ', price: 120000, icon: '👑', status: 'active' }
    ]
  }
  if (norm.includes('uống') || norm.includes('nuoc') || norm.includes('uong')) {
    return [
      { id: 'p_nuoc_1', name: 'Sting Dâu tây đỏ ướp lạnh', unit: 'Chai', price: 15000, icon: '🥤', status: 'active' },
      { id: 'p_nuoc_2', name: 'Bò Húc Red Bull (Thái)', unit: 'Lon', price: 20000, icon: '🥫', status: 'active' },
      { id: 'p_nuoc_3', name: 'Cà phê sữa đá pha phin', unit: 'Ly', price: 25000, icon: '☕', status: 'active' },
      { id: 'p_nuoc_4', name: 'Nước suối Dasani 500ml', unit: 'Chai', price: 10000, icon: '💧', status: 'active' },
      { id: 'p_nuoc_5', name: 'Bia Heineken Silver', unit: 'Lon', price: 28000, icon: '🍺', status: 'active' },
      { id: 'p_nuoc_6', name: 'Bia Tiger Crystal', unit: 'Lon', price: 25000, icon: '🍻', status: 'active' },
      { id: 'p_nuoc_7', name: 'Trà xanh C2 chanh tuyết', unit: 'Chai', price: 12000, icon: '🧃', status: 'active' }
    ]
  }
  if (norm.includes('mỳ') || norm.includes('my') || norm.includes('noodle')) {
    return [
      { id: 'p_my_1', name: 'Mì tôm trứng ốp la xúc xích', unit: 'Tô', price: 30000, icon: '🍜', status: 'active' },
      { id: 'p_my_2', name: 'Mì xào bò rau cải', unit: 'Đĩa', price: 40000, icon: '🍝', status: 'active' },
      { id: 'p_my_3', name: 'Mì cay hải sản thập cẩm', unit: 'Tô', price: 45000, icon: '🍲', status: 'active' },
      { id: 'p_my_4', name: 'Mì xào xúc xích trứng', unit: 'Đĩa', price: 35000, icon: '🍳', status: 'active' }
    ]
  }
  if (norm.includes('đồ ăn') || norm.includes('do an') || norm.includes('ăn')) {
    return [
      { id: 'p_an_1', name: 'Cơm chiên dưa bò', unit: 'Đĩa', price: 45000, icon: '🍛', status: 'active' },
      { id: 'p_an_2', name: 'Cơm chiên hải sản', unit: 'Đĩa', price: 50000, icon: '🍤', status: 'active' },
      { id: 'p_an_3', name: 'Khoai tây chiên bơ tỏi', unit: 'Đĩa', price: 30000, icon: '🍟', status: 'active' },
      { id: 'p_an_4', name: 'Nem chua rán Phố Cổ (6 cái)', unit: 'Đĩa', price: 40000, icon: '🍢', status: 'active' },
      { id: 'p_an_5', name: 'Xúc xích nướng tiêu', unit: 'Cây', price: 15000, icon: '🌭', status: 'active' }
    ]
  }
  if (norm.includes('thịt') || norm.includes('thit')) {
    return [
      { id: 'p_thit_1', name: 'Bò khô sợi vắt chanh', unit: 'Đĩa', price: 55000, icon: '🥩', status: 'active' },
      { id: 'p_thit_2', name: 'Khô gà lá chanh', unit: 'Đĩa', price: 40000, icon: '🍗', status: 'active' },
      { id: 'p_thit_3', name: 'Khô mực nướng cồn', unit: 'Con', price: 80000, icon: '🦑', status: 'active' }
    ]
  }
  if (norm.includes('rau') || norm.includes('quả') || norm.includes('qua') || norm.includes('trái cây')) {
    return [
      { id: 'p_rau_1', name: 'Dưa hấu ướp lạnh', unit: 'Đĩa', price: 35000, icon: '🍉', status: 'active' },
      { id: 'p_rau_2', name: 'Đĩa hoa quả thập cẩm (Xoài, Ổi, Mận)', unit: 'Đĩa', price: 50000, icon: '🍎', status: 'active' }
    ]
  }
  // Generic starter items for newly created custom categories
  return [
    { id: 'p_custom_1', name: `${categoryName} Loại 1`, unit: 'Cái', price: 30000, icon: '🏷️', status: 'active' },
    { id: 'p_custom_2', name: `${categoryName} Loại Cao cấp`, unit: 'Phần', price: 50000, icon: '⭐', status: 'active' }
  ]
}

export function CategoriesManagementScreen(): React.JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeCategory, setActiveCategory] = useState<Category | null>(null)

  // Form states
  const [categoryName, setCategoryName] = useState('')
  const [categoryDescription, setCategoryDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Fetch real categories from D1 Database via IPC
  const fetchCategories = async () => {
    try {
      setLoading(true)
      const res = await window.desktopApi.categories.list()
      if (res.ok) {
        setCategories(res.data.categories)
      } else {
        toast.error('Không thể tải danh sách danh mục từ máy chủ.')
      }
    } catch (err) {
      console.error('Fetch categories failed:', err)
      toast.error('Lỗi kết nối cơ sở dữ liệu.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCategories()
  }, [])

  // 2. Filter categories by search
  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // 3. Checkbox selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredCategories.map((c) => c.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // 4. Open Create Modal
  const handleOpenCreateModal = () => {
    setCategoryName('')
    setCategoryDescription('')
    setIsCreateModalOpen(true)
  }

  // 5. Open Edit Modal (Chi tiết & Sửa)
  const handleOpenEditModal = (cat: Category) => {
    setActiveCategory(cat)
    setCategoryName(cat.name)
    setCategoryDescription(cat.description || '')
    setIsEditModalOpen(true)
  }

  // 6. Submit Create Category (Lưu vào D1)
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = categoryName.trim()
    if (!trimmedName) {
      toast.error('Vui lòng nhập tên danh mục!')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await window.desktopApi.categories.create({
        name: trimmedName,
        description: categoryDescription.trim() || undefined
      })

      if (res.ok) {
        toast.success(`Đã tạo danh mục "${trimmedName}" thành công!`, {
          description: 'Dữ liệu đã được lưu vào cơ sở dữ liệu D1.'
        })
        setIsCreateModalOpen(false)
        await fetchCategories()
      } else {
        toast.error(res.message || 'Không thể tạo danh mục mới!')
      }
    } catch (err) {
      console.error('Create category failed:', err)
      toast.error('Lỗi kết nối khi tạo danh mục.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 7. Submit Edit Category (Cập nhật D1)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCategory) return

    const trimmedName = categoryName.trim()
    if (!trimmedName) {
      toast.error('Vui lòng nhập tên danh mục!')
      return
    }

    try {
      setIsSubmitting(true)
      const res = await window.desktopApi.categories.update(activeCategory.id, {
        name: trimmedName,
        description: categoryDescription.trim() || null
      })

      if (res.ok) {
        toast.success(`Đã cập nhật danh mục "${trimmedName}" thành công!`)
        setIsEditModalOpen(false)
        setActiveCategory(null)
        await fetchCategories()
      } else {
        toast.error(res.message || 'Không thể cập nhật danh mục!')
      }
    } catch (err) {
      console.error('Update category failed:', err)
      toast.error('Lỗi kết nối khi cập nhật danh mục.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 8. Delete Category (Xóa trong D1)
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${name}" không?`)) {
      return
    }

    try {
      const res = await window.desktopApi.categories.delete(id)
      if (res.ok) {
        toast.success(`Đã xóa danh mục "${name}" thành công!`)
        if (isEditModalOpen) {
          setIsEditModalOpen(false)
          setActiveCategory(null)
        }
        await fetchCategories()
      } else {
        toast.error(res.message || 'Không thể xóa danh mục!')
      }
    } catch (err) {
      console.error('Delete category failed:', err)
      toast.error('Lỗi khi xóa danh mục.')
    }
  }

  // Helper format VND currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ'
  }

  return (
    <div className="admin-view-container">
      {/* Top Header Bar matching Screenshot */}
      <div className="admin-page-header" style={{ alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 className="admin-page-title" style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>
            Danh mục
          </h1>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#e2e8f0',
              color: '#64748b',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Quản lý danh mục phân loại mặt hàng trong quán bida"
          >
            i
          </span>
        </div>

        <button
          type="button"
          className="admin-btn-primary"
          style={{ background: '#0088ff', padding: '9px 18px', fontSize: '14px', fontWeight: 600, borderRadius: '6px' }}
          onClick={handleOpenCreateModal}
        >
          Tạo danh mục
        </button>
      </div>

      {/* Main Card with Sub-tabs and Search */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Sub-tab: Tất cả danh mục */}
        <div style={{ borderBottom: '1px solid #e2e8f0', padding: '0 24px', display: 'flex' }}>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '2.5px solid #0088ff',
              padding: '14px 4px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0088ff',
              cursor: 'pointer'
            }}
          >
            Tất cả danh mục
          </button>
        </div>

        {/* Search Bar matching screenshot */}
        <div style={{ padding: '16px 24px 12px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '14px'
              }}
            >
              🔍
            </span>
            <input
              type="text"
              style={{
                width: '100%',
                height: '38px',
                padding: '0 14px 0 36px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13.5px',
                outline: 'none',
                transition: 'border-color 0.15s ease'
              }}
              placeholder="Tìm kiếm danh mục"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Categories Table matching screenshot */}
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ width: '50px', padding: '12px 16px', textAlign: 'left' }}>
                  <input
                    type="checkbox"
                    checked={
                      filteredCategories.length > 0 &&
                      selectedIds.length === filteredCategories.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Danh mục
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '13px', fontWeight: 700, color: '#334155', width: '200px' }}>
                  Số lượng mặt hàng
                </th>
                <th style={{ width: '80px', padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Đang tải danh mục từ cơ sở dữ liệu D1...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    Không tìm thấy danh mục nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat) => (
                  <tr
                    key={cat.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.1s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                  >
                    {/* Checkbox */}
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cat.id)}
                        onChange={() => handleToggleSelect(cat.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>

                    {/* Category Name in Blue */}
                    <td
                      style={{ padding: '14px 8px' }}
                      onClick={() => handleOpenEditModal(cat)}
                    >
                      <span
                        style={{
                          color: '#0088ff',
                          fontWeight: 600,
                          fontSize: '14px',
                          textDecoration: 'none'
                        }}
                      >
                        {cat.name}
                      </span>
                      {cat.description && (
                        <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                          {cat.description}
                        </span>
                      )}
                    </td>

                    {/* Item Count */}
                    <td
                      style={{ padding: '14px 24px', textAlign: 'right', fontSize: '14px', color: '#334155', fontWeight: 500 }}
                      onClick={() => handleOpenEditModal(cat)}
                    >
                      {cat.itemCount ?? 0}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="admin-btn-icon-small"
                          title="Sửa danh mục"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                          onClick={() => handleOpenEditModal(cat)}
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="admin-btn-icon-small"
                          title="Xóa danh mục"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: Count & Pagination matching screenshot */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '13px',
            color: '#64748b'
          }}
        >
          <span>
            Hiển thị từ 1 đến {filteredCategories.length} trên tổng {filteredCategories.length}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled
              style={{
                width: '28px',
                height: '28px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                background: '#ffffff',
                color: '#cbd5e1',
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ‹
            </button>
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '4px',
                background: '#0088ff',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              1
            </span>
            <button
              type="button"
              disabled
              style={{
                width: '28px',
                height: '28px',
                border: '1px solid #e2e8f0',
                borderRadius: '4px',
                background: '#ffffff',
                color: '#cbd5e1',
                cursor: 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          MODAL: TẠO DANH MỤC (CREATE MODAL)
          ========================================================= */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '500px', borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Tạo danh mục mới</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                    Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    style={{
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px'
                    }}
                    placeholder="Nhập tên danh mục (vd: Đồ uống, Mì gói, Gậy cơ...)"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                    Mô tả / Ghi chú
                  </label>
                  <textarea
                    rows={3}
                    className="form-input"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      resize: 'vertical',
                      lineHeight: '1.5'
                    }}
                    placeholder="Mô tả phân loại hoặc ghi chú cho danh mục này..."
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 22px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#0088ff',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL: CHI TIẾT & CHỈNH SỬA DANH MỤC (EDIT MODAL)
          ========================================================= */}
      {isEditModalOpen && activeCategory && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '820px', width: '92vw', maxHeight: '90vh', borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title">Chi tiết danh mục</h3>
                <span
                  style={{
                    background: '#e0f2fe',
                    color: '#0284c7',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  {activeCategory.name}
                </span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsEditModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* 1. THÔNG TIN DANH MỤC */}
                <div
                  style={{
                    background: '#f8fafc',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '14px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        background: '#ffffff'
                      }}
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                      Mô tả / Ghi chú
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      style={{
                        height: '38px',
                        padding: '0 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13.5px',
                        background: '#ffffff'
                      }}
                      placeholder="Mô tả danh mục..."
                      value={categoryDescription}
                      onChange={(e) => setCategoryDescription(e.target.value)}
                    />
                  </div>
                </div>

                {/* 2. DANH SÁCH MẶT HÀNG TRONG DANH MỤC */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#1e293b' }}>
                        Danh sách mặt hàng trong danh mục
                      </h4>
                      <span
                        style={{
                          background: '#eff6ff',
                          color: '#2563eb',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        {getCategoryProducts(activeCategory.name).length} mặt hàng
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#ffffff'
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', width: '56px' }}>Ảnh</th>
                          <th style={{ padding: '10px 12px' }}>Tên mặt hàng</th>
                          <th style={{ padding: '10px 12px', width: '110px' }}>Đơn vị tính</th>
                          <th style={{ padding: '10px 16px', textAlign: 'right', width: '140px' }}>Giá bán</th>
                          <th style={{ padding: '10px 14px', textAlign: 'center', width: '130px' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getCategoryProducts(activeCategory.name).map((product, idx) => (
                          <tr
                            key={product.id}
                            style={{
                              borderBottom: idx === getCategoryProducts(activeCategory.name).length - 1 ? 'none' : '1px solid #f1f5f9',
                              transition: 'background 0.15s ease'
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#ffffff')}
                          >
                            {/* Ảnh / Icon đại diện */}
                            <td style={{ padding: '8px 14px' }}>
                              <div
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '8px',
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '20px'
                                }}
                              >
                                {product.icon}
                              </div>
                            </td>

                            {/* Tên mặt hàng */}
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: '#1e293b' }}>
                              {product.name}
                            </td>

                            {/* Đơn vị tính */}
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  background: '#f1f5f9',
                                  color: '#475569',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 500
                                }}
                              >
                                {product.unit}
                              </span>
                            </td>

                            {/* Giá bán */}
                            <td style={{ padding: '8px 16px', textAlign: 'right', fontWeight: 700, color: '#0088ff', fontSize: '14px' }}>
                              {formatCurrency(product.price)}
                            </td>

                            {/* Trạng thái */}
                            <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11.5px',
                                  fontWeight: 600
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e' }} />
                                Đang bán
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Action Buttons Footer */}
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.name)}
                >
                  <span>🗑️</span> Xóa danh mục
                </button>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 22px',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#0088ff',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
