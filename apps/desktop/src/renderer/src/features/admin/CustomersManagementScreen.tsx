import React, { useState } from 'react'

interface CustomersManagementScreenProps {
  subType: 'list' | 'groups'
}

export function CustomersManagementScreen({ subType }: CustomersManagementScreenProps): React.JSX.Element {
  const [groups] = useState([
    { id: 'g_vip', name: 'Hội viên VIP Kim Cương', discount: '15%', membersCount: 12, minSpend: '10,000,000đ' },
    { id: 'g_gold', name: 'Hội viên VIP Vàng', discount: '10%', membersCount: 28, minSpend: '5,000,000đ' },
    { id: 'g_member', name: 'Khách hàng thân thiết', discount: '5%', membersCount: 85, minSpend: '1,000,000đ' },
    { id: 'g_standard', name: 'Khách hàng vãng lai', discount: '0%', membersCount: 320, minSpend: '0đ' }
  ])

  const [customers] = useState([
    { id: 'c1', code: 'KH001', name: 'Nguyễn Hoàng Long', phone: '0912 345 678', group: 'Hội viên VIP Kim Cương', points: 1250, totalSpent: 14500000 },
    { id: 'c2', code: 'KH002', name: 'Trần Minh Quang', phone: '0988 776 554', group: 'Hội viên VIP Vàng', points: 680, totalSpent: 7200000 },
    { id: 'c3', code: 'KH003', name: 'Phạm Đức Anh', phone: '0903 112 233', group: 'Khách hàng thân thiết', points: 210, totalSpent: 2350000 },
    { id: 'c4', code: 'KH004', name: 'Vũ Quốc Thái', phone: '0977 445 566', group: 'Hội viên VIP Vàng', points: 540, totalSpent: 5800000 },
    { id: 'c5', code: 'KH005', name: 'Lê Tuấn Hưng', phone: '0934 998 877', group: 'Khách hàng vãng lai', points: 45, totalSpent: 450000 }
  ])

  const [searchTerm, setSearchTerm] = useState('')

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            {subType === 'list' && '🤝 Quản Lý Danh Sách Khách Hàng'}
            {subType === 'groups' && '👑 Quản Lý Phân Hạng Nhóm Khách Hàng'}
          </h1>
          <p className="admin-page-subtitle">
            {subType === 'list' && 'Tra cứu thông tin khách hàng, số điện thoại, điểm tích lũy và tổng chi tiêu'}
            {subType === 'groups' && 'Chính sách chiết khấu, quyền lợi hội viên VIP và phân cấp khách hàng'}
          </p>
        </div>

        <button type="button" className="admin-btn-primary">
          {subType === 'list' ? '➕ Thêm Khách Hàng' : '➕ Thêm Nhóm Khách'}
        </button>
      </div>

      {/* Subtype 1: List */}
      {subType === 'list' && (
        <div className="admin-card">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <input
              type="text"
              className="admin-search-input"
              style={{ width: '320px' }}
              placeholder="🔍 Tìm tên, số điện thoại, mã KH..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Tổng cộng: <strong>{filteredCustomers.length}</strong> khách hàng
            </span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã KH</th>
                <th>Họ và tên</th>
                <th>Số điện thoại</th>
                <th>Phân hạng nhóm</th>
                <th style={{ textAlign: 'center' }}>Điểm tích lũy</th>
                <th style={{ textAlign: 'right' }}>Tổng chi tiêu</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td style={{ color: '#2563eb', fontWeight: 600 }}>{c.code}</td>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ color: '#475569' }}>📞 {c.phone}</td>
                  <td>
                    <span
                      className={
                        c.group.includes('Kim Cương')
                          ? 'badge-pill bg-amber-50 text-amber-700'
                          : c.group.includes('Vàng')
                          ? 'badge-pill bg-blue-50 text-blue-700'
                          : 'badge-tag'
                      }
                    >
                      {c.group}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#059669' }}>
                    {c.points} pts
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                    {c.totalSpent.toLocaleString('vi-VN')} đ
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

      {/* Subtype 2: Groups */}
      {subType === 'groups' && (
        <div className="admin-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tên nhóm khách hàng</th>
                <th style={{ textAlign: 'center' }}>Chiết khấu</th>
                <th style={{ textAlign: 'center' }}>Số lượng thành viên</th>
                <th style={{ textAlign: 'right' }}>Điều kiện chi tiêu</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>👑</span>
                      <strong>{g.name}</strong>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                    Giảm {g.discount}
                  </td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>
                    {g.membersCount} khách
                  </td>
                  <td style={{ textAlign: 'right', color: '#64748b' }}>
                    Từ {g.minSpend}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button type="button" className="admin-btn-action">
                      ✏️ Sửa chính sách
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
