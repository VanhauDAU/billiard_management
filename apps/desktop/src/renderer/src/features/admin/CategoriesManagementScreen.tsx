import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { Category } from '@billiards/contracts'

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
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Tạo danh mục mới</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsCreateModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
                <div className="field-group">
                  <label className="field-label">
                    Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Nhập tên danh mục (vd: Đồ uống, Mì gói, Gậy cơ...)"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Mô tả / Ghi chú</label>
                  <textarea
                    className="admin-input"
                    rows={3}
                    placeholder="Mô tả phân loại danh mục này..."
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  style={{ background: '#0088ff' }}
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
          <div className="modal-card" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Chi tiết & Sửa danh mục</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsEditModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
                <div className="field-group">
                  <label className="field-label">
                    Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Mô tả / Ghi chú</label>
                  <textarea
                    className="admin-input"
                    rows={3}
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '12.5px', color: '#64748b' }}>
                  <span>Số lượng mặt hàng hiện tại: <strong>{activeCategory.itemCount ?? 0}</strong></span>
                </div>
              </div>

              <div className="admin-modal-actions" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="admin-btn-secondary"
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                  onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.name)}
                >
                  🗑️ Xóa danh mục
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="admin-btn-secondary"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="admin-btn-primary"
                    style={{ background: '#0088ff' }}
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
