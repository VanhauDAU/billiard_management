import React, { useState } from 'react'

interface ProductsManagementScreenProps {
  subType: 'list' | 'menu' | 'categories'
}

export function ProductsManagementScreen({ subType }: ProductsManagementScreenProps): React.JSX.Element {
  const [categories] = useState([
    { id: 'cat_1', name: 'Nước ngọt & Nước suối', itemCount: 6, status: 'active' },
    { id: 'cat_2', name: 'Cà phê & Pha chế', itemCount: 4, status: 'active' },
    { id: 'cat_3', name: 'Bia & Rượu', itemCount: 3, status: 'active' },
    { id: 'cat_4', name: 'Đồ ăn nhanh & Mì', itemCount: 5, status: 'active' },
    { id: 'cat_5', name: 'Thuốc lá & Snack', itemCount: 4, status: 'active' }
  ])

  const [products] = useState([
    { id: 'p1', code: 'SP001', name: 'Redbull Thái (Bò húc)', category: 'Nước ngọt & Nước suối', unit: 'Lon', costPrice: 16000, salePrice: 25000, stock: 48, status: 'active' },
    { id: 'p2', code: 'SP002', name: 'Sting Dâu tây đỏ', category: 'Nước ngọt & Nước suối', unit: 'Chai', costPrice: 11000, salePrice: 18000, stock: 65, status: 'active' },
    { id: 'p3', code: 'SP003', name: 'Coca Cola tươi', category: 'Nước ngọt & Nước suối', unit: 'Lon', costPrice: 11000, salePrice: 18000, stock: 50, status: 'active' },
    { id: 'p4', code: 'SP004', name: 'Cà phê sữa đá Sài Gòn', category: 'Cà phê & Pha chế', unit: 'Ly', costPrice: 9000, salePrice: 25000, stock: 999, status: 'active' },
    { id: 'p5', code: 'SP005', name: 'Mì tôm 2 trứng xúc xích', category: 'Đồ ăn nhanh & Mì', unit: 'Tô', costPrice: 15000, salePrice: 35000, stock: 30, status: 'active' },
    { id: 'p6', code: 'SP006', name: 'Thuốc lá Craven A (Mèo đỏ)', category: 'Thuốc lá & Snack', unit: 'Gói', costPrice: 24000, salePrice: 30000, stock: 20, status: 'active' }
  ])

  const [searchTerm, setSearchTerm] = useState('')

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            {subType === 'list' && '📦 Danh Sách Mặt Hàng & Tồn Kho'}
            {subType === 'menu' && '🍽️ Thực Đơn Bán Hàng & Phục Vụ'}
            {subType === 'categories' && '📑 Quản Lý Danh Mục Mặt Hàng'}
          </h1>
          <p className="admin-page-subtitle">
            {subType === 'list' && 'Tra cứu toàn bộ hàng hóa, giá vốn, giá bán niêm yết và số lượng tồn'}
            {subType === 'menu' && 'Thực đơn phục vụ tại bàn, phân loại đồ uống và món ăn'}
            {subType === 'categories' && 'Quản lý các nhóm danh mục phân loại sản phẩm trong quán'}
          </p>
        </div>

        <button type="button" className="admin-btn-primary">
          {subType === 'categories' ? '➕ Thêm Danh Mục' : '➕ Thêm Mặt Hàng'}
        </button>
      </div>

      {/* Subtype 1: List / Subtype 2: Menu */}
      {(subType === 'list' || subType === 'menu') && (
        <div className="admin-card">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              className="admin-search-input"
              style={{ width: '300px' }}
              placeholder="🔍 Tìm tên món, mã SP, danh mục..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Tổng cộng: <strong>{filteredProducts.length}</strong> mặt hàng
            </span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã SP</th>
                <th>Tên mặt hàng</th>
                <th>Danh mục</th>
                <th style={{ textAlign: 'center' }}>Đơn vị tính</th>
                {subType === 'list' && <th style={{ textAlign: 'right' }}>Giá vốn</th>}
                <th style={{ textAlign: 'right' }}>Giá bán</th>
                {subType === 'list' && <th style={{ textAlign: 'center' }}>Tồn kho</th>}
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: '#2563eb', fontWeight: 600 }}>{p.code}</td>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="badge-tag">{p.category}</span></td>
                  <td style={{ textAlign: 'center' }}>{p.unit}</td>
                  {subType === 'list' && (
                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                      {p.costPrice.toLocaleString('vi-VN')} đ
                    </td>
                  )}
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                    {p.salePrice.toLocaleString('vi-VN')} đ
                  </td>
                  {subType === 'list' && (
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {p.stock > 100 ? 'Vô hạn' : `${p.stock} ${p.unit}`}
                    </td>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    <span className={p.status === 'active' ? 'status-badge-active' : 'status-badge-inactive'}>
                      {p.status === 'active' ? '🟢 Đang bán' : '⚪ Tạm ngưng'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="admin-btn-action">
                      ✏️ Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtype 3: Categories */}
      {subType === 'categories' && (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên danh mục</th>
                <th style={{ textAlign: 'center' }}>Số lượng mặt hàng</th>
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>📁</span>
                      <strong>{c.name}</strong>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.itemCount} sản phẩm</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="status-badge-active">🟢 Hoạt động</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="admin-btn-action">
                      ✏️ Sửa danh mục
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
