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
          <div className="modal-card" style={{ maxWidth: '500px', borderRadius: '12px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Tạo danh mục mới</h3>
              <button type="button" className="modal-close-btn" style={{ fontSize: '18px', cursor: 'pointer', background: 'none', border: 'none', color: '#64748b' }} onClick={() => setIsCreateModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                    Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14.5px', outline: 'none', transition: 'border 0.2s' }}
                    onFocus={(e) => (e.target.style.borderColor = '#0088ff')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                    placeholder="Nhập tên danh mục (vd: Đồ uống, Mì gói...)"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Mô tả / Ghi chú</label>
                  <textarea
                    rows={3}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14.5px', outline: 'none', transition: 'border 0.2s', resize: 'vertical' }}
                    onFocus={(e) => (e.target.style.borderColor = '#0088ff')}
                    onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                    placeholder="Mô tả phân loại danh mục này..."
                    value={categoryDescription}
                    onChange={(e) => setCategoryDescription(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 12px 12px' }}>
                <button
                  type="button"
                  style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#0088ff', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '14px', opacity: isSubmitting ? 0.7 : 1 }}
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
          <div className="modal-card" style={{ maxWidth: '700px', borderRadius: '12px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: '12px 12px 0 0', flexShrink: 0 }}>
              <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#0f172a' }}>Chi tiết & Sửa danh mục</h3>
              <button type="button" className="modal-close-btn" style={{ fontSize: '18px', cursor: 'pointer', background: 'none', border: 'none', color: '#64748b' }} onClick={() => setIsEditModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
              {/* Form Bên Trái (Cập nhật thông tin) */}
              <form onSubmit={handleEditSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                      Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14.5px', outline: 'none', transition: 'border 0.2s' }}
                      onFocus={(e) => (e.target.style.borderColor = '#0088ff')}
                      onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                      value={categoryName}
                      onChange={(e) => setCategoryName(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>Mô tả / Ghi chú</label>
                    <textarea
                      rows={3}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14.5px', outline: 'none', transition: 'border 0.2s', resize: 'vertical' }}
                      onFocus={(e) => (e.target.style.borderColor = '#0088ff')}
                      onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
                      value={categoryDescription}
                      onChange={(e) => setCategoryDescription(e.target.value)}
                    />
                  </div>

                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '14px', borderRadius: '8px', fontSize: '13.5px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>📦</span>
                    <span>Danh mục này hiện đang chứa <strong>{activeCategory.itemCount ?? 0} mặt hàng</strong>.</span>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', borderBottomLeftRadius: '12px' }}>
                  <button
                    type="button"
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: '13.5px' }}
                    onClick={() => handleDeleteCategory(activeCategory.id, activeCategory.name)}
                  >
                    🗑️ Xóa
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: '13.5px' }}
                      onClick={() => setIsEditModalOpen(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#0088ff', color: '#ffffff', fontWeight: 600, cursor: 'pointer', fontSize: '13.5px', opacity: isSubmitting ? 0.7 : 1 }}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Đang lưu...' : 'Lưu'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Danh sách sản phẩm thuộc danh mục Bên Phải */}
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#ffffff', borderBottomRightRadius: '12px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  Mặt hàng trong danh mục
                  <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                    {activeCategory.itemCount ?? 0}
                  </span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {(() => {
                    const norm = activeCategory.name.toLowerCase()
                    let products: Array<{ id: string; name: string; price: number; img: string }> = []
                    if (norm.includes('giờ') || norm.includes('gio')) {
                      products = [
                        { id: '1', name: 'Bida Lỗ (Pool)', price: 60000, img: '🎱' },
                        { id: '2', name: 'Bida Phăng (Carom)', price: 70000, img: '🔴' }
                      ]
                    } else if (norm.includes('đồ uống') || norm.includes('uong')) {
                      products = [
                        { id: '3', name: 'Sting Dâu', price: 15000, img: '🥤' },
                        { id: '4', name: 'Bò Húc (Redbull)', price: 20000, img: '🥫' },
                        { id: '5', name: 'Nước suối Dasani', price: 10000, img: '💧' },
                        { id: '6', name: 'Cafe Muối', price: 25000, img: '☕' }
                      ]
                    } else if (norm.includes('mỳ') || norm.includes('noodle') || norm.includes('đồ ăn')) {
                      products = [
                        { id: '7', name: 'Mỳ xào bò', price: 35000, img: '🍝' },
                        { id: '8', name: 'Mỳ trứng xúc xích', price: 30000, img: '🍜' },
                        { id: '9', name: 'Cơm rang dưa bò', price: 40000, img: '🍛' }
                      ]
                    } else if (norm.includes('thịt')) {
                      products = [
                        { id: '10', name: 'Khô bò vắt chanh', price: 50000, img: '🥩' },
                        { id: '11', name: 'Khô gà lá chanh', price: 40000, img: '🍗' }
                      ]
                    } else {
                      products = [
                        { id: '12', name: 'Mặt hàng mẫu 1', price: 15000, img: '📦' },
                        { id: '13', name: 'Mặt hàng mẫu 2', price: 25000, img: '📦' }
                      ]
                    }

                    if (activeCategory.itemCount === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '13.5px' }}>
                          <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>📭</span>
                          Danh mục này chưa có mặt hàng nào.
                        </div>
                      )
                    }

                    return products.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '1px solid #f1f5f9', borderRadius: '8px', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <div style={{ width: '44px', height: '44px', background: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                          {p.img}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>{p.name}</div>
                          <div style={{ fontSize: '13px', color: '#0088ff', fontWeight: 700 }}>
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(p.price)}
                          </div>
                        </div>
                      </div>
                    ))
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

