import React, { useState } from 'react'

interface ReportsScreenProps {
  subType: 'revenue' | 'products' | 'staff'
}

export function ReportsScreen({ subType }: ReportsScreenProps): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today')

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            {subType === 'revenue' && '📈 Báo Cáo Doanh Thu Tổng Hợp'}
            {subType === 'products' && '📊 Báo Cáo Bán Hàng & Mặt Hàng'}
            {subType === 'staff' && '👥 Báo Cáo Hiệu Suất Nhân Viên & Thu Ngân'}
          </h1>
          <p className="admin-page-subtitle">
            {subType === 'revenue' && 'Tổng hợp doanh thu tiền giờ chơi, dịch vụ F&B và hình thức thanh toán'}
            {subType === 'products' && 'Thống kê sản lượng tiêu thụ, doanh số và top mặt hàng sinh lời'}
            {subType === 'staff' && 'Doanh số bán hàng, số hóa đơn tạo và số ca trực theo từng nhân viên'}
          </p>
        </div>

        <div className="admin-subtabs-nav">
          <button
            type="button"
            className={`admin-subtab-btn ${timeRange === 'today' ? 'active' : ''}`}
            onClick={() => setTimeRange('today')}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className={`admin-subtab-btn ${timeRange === 'week' ? 'active' : ''}`}
            onClick={() => setTimeRange('week')}
          >
            7 ngày qua
          </button>
          <button
            type="button"
            className={`admin-subtab-btn ${timeRange === 'month' ? 'active' : ''}`}
            onClick={() => setTimeRange('month')}
          >
            Tháng này
          </button>
        </div>
      </div>

      {/* Subtype 1: Revenue Report */}
      {subType === 'revenue' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-kpi-grid">
            <div className="kpi-card kpi-card-primary">
              <span className="kpi-label">TỔNG DOANH THU</span>
              <div className="kpi-value">
                {timeRange === 'today' ? '3,850,000đ' : timeRange === 'week' ? '26,480,000đ' : '98,650,000đ'}
              </div>
              <span className="kpi-subtext">Đã đối soát toàn bộ</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">TIỀN GIỜ CHƠI BÀN</span>
              <div className="kpi-value" style={{ color: '#2563eb' }}>
                {timeRange === 'today' ? '2,420,000đ' : timeRange === 'week' ? '16,800,000đ' : '62,400,000đ'}
              </div>
              <span className="kpi-subtext">Tỷ trọng 63.3%</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">TIỀN MẶT THU</span>
              <div className="kpi-value" style={{ color: '#16a34a' }}>
                {timeRange === 'today' ? '1,650,000đ' : timeRange === 'week' ? '11,200,000đ' : '41,800,000đ'}
              </div>
              <span className="kpi-subtext">Tiền mặt tại quầy</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">CHUYỂN KHOẢN VIETQR</span>
              <div className="kpi-value" style={{ color: '#7c3aed' }}>
                {timeRange === 'today' ? '2,200,000đ' : timeRange === 'week' ? '15,280,000đ' : '56,850,000đ'}
              </div>
              <span className="kpi-subtext">Quét mã QR tự động</span>
            </div>
          </div>

          <div className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">Chi tiết phân bổ doanh thu theo nguồn</h3>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Nguồn thu</th>
                  <th style={{ textAlign: 'center' }}>Số lượt / Lượng</th>
                  <th style={{ textAlign: 'right' }}>Doanh thu</th>
                  <th style={{ textAlign: 'right' }}>Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>🎱 Tiền giờ chơi Bàn Lỗ (Pool 9-Ball)</td>
                  <td style={{ textAlign: 'center' }}>22.5 giờ</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>1,450,000 đ</td>
                  <td style={{ textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>37.6%</td>
                </tr>
                <tr>
                  <td>🎱 Tiền giờ chơi Bàn Carom 3 Băng</td>
                  <td style={{ textAlign: 'center' }}>11.0 giờ</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>660,000 đ</td>
                  <td style={{ textAlign: 'right', color: '#10b981', fontWeight: 600 }}>17.1%</td>
                </tr>
                <tr>
                  <td>🎱 Tiền giờ chơi Bàn Libre (Líp)</td>
                  <td style={{ textAlign: 'center' }}>5.0 giờ</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>310,000 đ</td>
                  <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>8.1%</td>
                </tr>
                <tr>
                  <td>🥤 Nước ngọt & Nước suối</td>
                  <td style={{ textAlign: 'center' }}>48 lon/chai</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>780,000 đ</td>
                  <td style={{ textAlign: 'right', color: '#64748b', fontWeight: 600 }}>20.3%</td>
                </tr>
                <tr>
                  <td>☕ Cà phê pha chế</td>
                  <td style={{ textAlign: 'center' }}>18 ly</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>410,000 đ</td>
                  <td style={{ textAlign: 'right', color: '#64748b', fontWeight: 600 }}>10.6%</td>
                </tr>
                <tr>
                  <td>🍜 Đồ ăn nhanh & Thuốc lá</td>
                  <td style={{ textAlign: 'center' }}>12 phần</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>240,000 đ</td>
                  <td style={{ textAlign: 'right', color: '#64748b', fontWeight: 600 }}>6.3%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtype 2: Products Report */}
      {subType === 'products' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Báo cáo tiêu thụ mặt hàng & dịch vụ</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mặt hàng</th>
                <th>Danh mục</th>
                <th style={{ textAlign: 'center' }}>Đơn vị tính</th>
                <th style={{ textAlign: 'center' }}>Số lượng bán</th>
                <th style={{ textAlign: 'right' }}>Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Redbull Thái lon', cat: 'Nước lon', unit: 'Lon', qty: 32, rev: 800000 },
                { name: 'Sting dâu tây đỏ', cat: 'Nước lon', unit: 'Chai', qty: 24, rev: 432000 },
                { name: 'Cà phê sữa đá Sài Gòn', cat: 'Pha chế', unit: 'Ly', qty: 18, rev: 450000 },
                { name: 'Cà phê đen đá', cat: 'Pha chế', unit: 'Ly', qty: 14, rev: 280000 },
                { name: 'Mì tôm 2 trứng xúc xích', cat: 'Đồ ăn', unit: 'Tô', qty: 16, rev: 560000 },
                { name: 'Thuốc lá Craven A (Mèo đỏ)', cat: 'Thuốc lá', unit: 'Gói', qty: 12, rev: 360000 },
                { name: 'Nước suối Aquafina 500ml', cat: 'Nước suối', unit: 'Chai', qty: 25, rev: 250000 }
              ].map((p, idx) => (
                <tr key={idx}>
                  <td><strong>{p.name}</strong></td>
                  <td><span className="badge-tag">{p.cat}</span></td>
                  <td style={{ textAlign: 'center' }}>{p.unit}</td>
                  <td style={{ textAlign: 'center', fontWeight: 700 }}>{p.qty}</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                    {p.rev.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Subtype 3: Staff Report */}
      {subType === 'staff' && (
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">Báo cáo doanh số theo nhân viên thu ngân</h3>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Vai trò</th>
                <th style={{ textAlign: 'center' }}>Số hóa đơn tạo</th>
                <th style={{ textAlign: 'right' }}>Tiền mặt</th>
                <th style={{ textAlign: 'right' }}>Chuyển khoản VietQR</th>
                <th style={{ textAlign: 'right' }}>Tổng doanh số</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>👤</span>
                    <div>
                      <strong>Nguyễn Văn Thu Ngân</strong>
                      <small style={{ display: 'block', color: '#64748b' }}>Ca sáng (08:00 - 16:00)</small>
                    </div>
                  </div>
                </td>
                <td><span className="badge-pill bg-blue-50 text-blue-700">Thu ngân</span></td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>16</td>
                <td style={{ textAlign: 'right' }}>950,000 đ</td>
                <td style={{ textAlign: 'right' }}>1,420,000 đ</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>2,370,000 đ</td>
              </tr>
              <tr>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>👤</span>
                    <div>
                      <strong>Lê Văn Hậu</strong>
                      <small style={{ display: 'block', color: '#64748b' }}>Ca tối (16:00 - 24:00)</small>
                    </div>
                  </div>
                </td>
                <td><span className="badge-pill bg-amber-50 text-amber-700">Chủ quán</span></td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>8</td>
                <td style={{ textAlign: 'right' }}>700,000 đ</td>
                <td style={{ textAlign: 'right' }}>780,000 đ</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>1,480,000 đ</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
