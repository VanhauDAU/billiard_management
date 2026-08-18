import React from 'react'

export function RolesManagementScreen(): React.JSX.Element {
  const roles = [
    {
      id: 'r_owner',
      code: 'owner',
      name: 'Chủ cửa hàng (Owner)',
      desc: 'Toàn quyền tối cao trên hệ thống: xem báo cáo, cấu hình giá, xóa dữ liệu, phân quyền và quản trị tài khoản.',
      usersCount: 1,
      isSystem: true,
      badgeColor: '#d97706',
      badgeBg: '#fffbeb'
    },
    {
      id: 'r_manager',
      code: 'manager',
      name: 'Quản lý cửa hàng (Manager)',
      desc: 'Quản lý hoạt động hàng ngày, điều phối nhân viên, chỉnh sửa thực đơn, hủy đơn có kiểm duyệt, xem báo cáo doanh thu.',
      usersCount: 0,
      isSystem: true,
      badgeColor: '#2563eb',
      badgeBg: '#eff6ff'
    },
    {
      id: 'r_cashier',
      code: 'cashier',
      name: 'Thu ngân (Cashier)',
      desc: 'Mở bàn, tính giờ, thêm món, áp dụng khuyến mãi, nhận tiền mặt, xuất mã VietQR và in hóa đơn thanh toán.',
      usersCount: 1,
      isSystem: true,
      badgeColor: '#10b981',
      badgeBg: '#ecfdf5'
    },
    {
      id: 'r_staff',
      code: 'staff',
      name: 'Nhân viên phục vụ (Staff)',
      desc: 'Xem sơ đồ bàn, mở bàn và gọi món cho khách tại bàn. Không có quyền sửa giá hay hủy hóa đơn.',
      usersCount: 0,
      isSystem: true,
      badgeColor: '#64748b',
      badgeBg: '#f1f5f9'
    }
  ]

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">🛡️ Quản Lý Vai Trò & Phân Quyền Nhân Viên</h1>
          <p className="admin-page-subtitle">
            Cấu hình danh mục vai trò chức danh và phân định quyền hạn thao tác trên hệ thống POS
          </p>
        </div>
      </div>

      {/* Roles Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {roles.map((role) => (
          <div key={role.id} className="admin-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    color: role.badgeColor,
                    backgroundColor: role.badgeBg
                  }}
                >
                  {role.code.toUpperCase()}
                </span>
                <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                  👥 {role.usersCount} nhân sự
                </span>
              </div>

              <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#0f172a' }}>{role.name}</h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: 1.5 }}>
                {role.desc}
              </p>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge-tag">Hệ thống mặc định</span>
              <button type="button" className="admin-btn-action" onClick={() => alert(`Xem danh sách quyền của ${role.name}`)}>
                🔒 Xem quyền chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
