import React, { useState } from 'react'

export function OverviewDashboard(): React.JSX.Element {
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | 'week' | 'month'>('today')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const timeRangeLabels: Record<string, string> = {
    today: 'Hôm nay',
    yesterday: 'Hôm qua',
    week: '7 ngày qua',
    month: 'Tháng này'
  }

  // Data samples based on selected time range
  const metrics = {
    today: {
      totalRevenue: '3,850,000đ',
      tableRevenue: '2,420,000đ',
      serviceRevenue: '1,430,000đ',
      totalHours: '38.5h',
      totalBills: 24,
      avgBill: '160,400đ',
      growth: '+14.8%'
    },
    yesterday: {
      totalRevenue: '3,350,000đ',
      tableRevenue: '2,100,000đ',
      serviceRevenue: '1,250,000đ',
      totalHours: '34.0h',
      totalBills: 21,
      avgBill: '159,500đ',
      growth: '+8.2%'
    },
    week: {
      totalRevenue: '26,480,000đ',
      tableRevenue: '16,800,000đ',
      serviceRevenue: '9,680,000đ',
      totalHours: '265.0h',
      totalBills: 168,
      avgBill: '157,600đ',
      growth: '+18.5%'
    },
    month: {
      totalRevenue: '98,650,000đ',
      tableRevenue: '62,400,000đ',
      serviceRevenue: '36,250,000đ',
      totalHours: '980.5h',
      totalBills: 615,
      avgBill: '160,400đ',
      growth: '+22.4%'
    }
  }[timeRange]

  // Top selling products
  const topProducts = [
    { name: 'Redbull (Bò Húc Thái)', category: 'Nước lon', sold: 48, revenue: '1,200,000đ', pct: 85 },
    { name: 'Cà phê đá', category: 'Pha chế', sold: 36, revenue: '720,000đ', pct: 65 },
    { name: 'Mì tôm trứng xúc xích', category: 'Đồ ăn', sold: 28, revenue: '840,000đ', pct: 50 },
    { name: 'Thuốc lá Craven A', category: 'Thuốc lá', sold: 22, revenue: '660,000đ', pct: 40 },
    { name: 'Nước suối Aquafina 500ml', category: 'Nước lọc', sold: 35, revenue: '350,000đ', pct: 35 }
  ]

  // Table types performance
  const tableTypesData = [
    { name: 'Bàn Pool 9-Ball (Bàn Lỗ)', tables: 6, hours: '22.5h', revenue: '1,450,000đ', color: '#2563eb' },
    { name: 'Bàn Carom 3 Băng', tables: 4, hours: '11.0h', revenue: '660,000đ', color: '#10b981' },
    { name: 'Bàn Libre (Bàn Líp)', tables: 2, hours: '5.0h', revenue: '310,000đ', color: '#f59e0b' }
  ]

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">📊 Tổng Quan & Báo Cáo Thống Kê</h1>
          <p className="admin-page-subtitle">
            Theo dõi doanh thu, hiệu suất bàn và các chỉ số kinh doanh then chốt
          </p>
        </div>

        {/* Time range dropdown */}
        <div className="admin-filter-dropdown-wrapper">
          <button
            type="button"
            className="admin-dropdown-btn"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <span className="dropdown-icon">📅</span>
            <span>Thời gian: <strong>{timeRangeLabels[timeRange]}</strong></span>
            <span className="dropdown-arrow">{isDropdownOpen ? '▲' : '▼'}</span>
          </button>

          {isDropdownOpen && (
            <div className="admin-dropdown-menu">
              {(['today', 'yesterday', 'week', 'month'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`admin-dropdown-item ${timeRange === key ? 'active' : ''}`}
                  onClick={() => {
                    setTimeRange(key)
                    setIsDropdownOpen(false)
                  }}
                >
                  <span>{timeRangeLabels[key]}</span>
                  {timeRange === key && <span className="check-mark">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="admin-kpi-grid">
        {/* Total Revenue */}
        <div className="kpi-card kpi-card-primary">
          <div className="kpi-card-top">
            <span className="kpi-label">TỔNG DOANH THU</span>
            <span className="kpi-icon-box bg-blue-100">💰</span>
          </div>
          <div className="kpi-value">{metrics.totalRevenue}</div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">↑ {metrics.growth}</span>
            <span className="kpi-subtext">so với kỳ trước</span>
          </div>
        </div>

        {/* Table Revenue */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">TIỀN GIỜ CHƠI BÀN</span>
            <span className="kpi-icon-box bg-green-100">🎱</span>
          </div>
          <div className="kpi-value">{metrics.tableRevenue}</div>
          <div className="kpi-footer">
            <span className="kpi-subtext">Tổng <strong>{metrics.totalHours}</strong> giờ chơi</span>
          </div>
        </div>

        {/* Service Revenue */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">DỊCH VỤ & MẶT HÀNG</span>
            <span className="kpi-icon-box bg-purple-100">🍽️</span>
          </div>
          <div className="kpi-value">{metrics.serviceRevenue}</div>
          <div className="kpi-footer">
            <span className="kpi-subtext">Đồ ăn, thức uống, thuốc lá</span>
          </div>
        </div>

        {/* Bills count */}
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">LƯỢT KHÁCH / HÓA ĐƠN</span>
            <span className="kpi-icon-box bg-amber-100">🧾</span>
          </div>
          <div className="kpi-value">{metrics.totalBills} lượt</div>
          <div className="kpi-footer">
            <span className="kpi-subtext">TB: <strong>{metrics.avgBill}</strong> / lượt</span>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="admin-analytics-grid">
        {/* Revenue Trend Chart */}
        <div className="admin-card revenue-chart-card">
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">📈 Biểu đồ Doanh thu theo khung giờ</h3>
              <p className="admin-card-desc">Doanh thu đạt đỉnh vào khung giờ 19:00 - 23:00</p>
            </div>
            <span className="badge-pill bg-blue-50 text-blue-600">Đơn vị: Nghìn VND</span>
          </div>

          {/* SVG Smooth Chart */}
          <div className="chart-wrapper">
            <svg viewBox="0 0 600 200" className="revenue-svg-chart">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="75" x2="580" y2="75" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="120" x2="580" y2="120" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="165" x2="580" y2="165" stroke="#f1f5f9" strokeWidth="1" />

              {/* Y Axis Labels */}
              <text x="32" y="34" fontSize="10" fill="#94a3b8" textAnchor="end">800k</text>
              <text x="32" y="79" fontSize="10" fill="#94a3b8" textAnchor="end">500k</text>
              <text x="32" y="124" fontSize="10" fill="#94a3b8" textAnchor="end">200k</text>
              <text x="32" y="169" fontSize="10" fill="#94a3b8" textAnchor="end">0k</text>

              {/* Chart Gradient Area */}
              <path
                d="M 60 155 Q 120 145, 170 120 T 280 80 T 380 40 T 480 35 T 560 65 L 560 165 L 60 165 Z"
                fill="url(#chartGradient)"
              />

              {/* Chart Line */}
              <path
                d="M 60 155 Q 120 145, 170 120 T 280 80 T 380 40 T 480 35 T 560 65"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data points */}
              <circle cx="60" cy="155" r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
              <circle cx="170" cy="120" r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
              <circle cx="280" cy="80" r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />
              <circle cx="380" cy="40" r="5" fill="#2563eb" stroke="#fff" strokeWidth="2.5" />
              <circle cx="480" cy="35" r="5" fill="#2563eb" stroke="#fff" strokeWidth="2.5" />
              <circle cx="560" cy="65" r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="2" />

              {/* X Axis Labels */}
              <text x="60" y="185" fontSize="11" fill="#64748b" textAnchor="middle">09:00</text>
              <text x="170" y="185" fontSize="11" fill="#64748b" textAnchor="middle">13:00</text>
              <text x="280" y="185" fontSize="11" fill="#64748b" textAnchor="middle">17:00</text>
              <text x="380" y="185" fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="bold">20:00</text>
              <text x="480" y="185" fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="bold">22:00</text>
              <text x="560" y="185" fontSize="11" fill="#64748b" textAnchor="middle">24:00</text>
            </svg>
          </div>
        </div>

        {/* Table Type Breakdown */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">🎱 Hiệu suất theo Loại bàn</h3>
              <p className="admin-card-desc">Tỷ trọng doanh thu theo từng dòng bàn</p>
            </div>
          </div>

          <div className="table-types-list">
            {tableTypesData.map((item, idx) => (
              <div key={idx} className="table-type-stat-row">
                <div className="table-type-stat-top">
                  <div className="type-name-badge">
                    <span className="type-color-dot" style={{ background: item.color }}></span>
                    <strong>{item.name}</strong>
                    <span className="type-count-tag">({item.tables} bàn)</span>
                  </div>
                  <div className="type-revenue">
                    <strong>{item.revenue}</strong>
                    <span className="type-hours">{item.hours}</span>
                  </div>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: idx === 0 ? '65%' : idx === 1 ? '30%' : '15%',
                      background: item.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Top Selling Items & Quick Summary */}
      <div className="admin-bottom-grid">
        {/* Top Selling Products */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">🏆 Top Mặt hàng F&B Bán Chạy</h3>
              <p className="admin-card-desc">Sản phẩm dịch vụ được khách gọi nhiều nhất</p>
            </div>
          </div>

          <div className="top-products-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mặt hàng</th>
                  <th>Phân loại</th>
                  <th style={{ textAlign: 'center' }}>Đã bán</th>
                  <th style={{ textAlign: 'right' }}>Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="product-cell">
                        <span className="product-rank">#{idx + 1}</span>
                        <span className="product-name">{p.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-tag">{p.category}</span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{p.sold}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{p.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Store Health & Operation Notes */}
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h3 className="admin-card-title">💡 Thông tin Vận hành Quán</h3>
              <p className="admin-card-desc">Tình trạng hệ thống và lưu ý ca làm việc</p>
            </div>
          </div>

          <div className="operation-info-list">
            <div className="op-info-item">
              <div className="op-info-icon bg-blue-100">💻</div>
              <div className="op-info-content">
                <strong>Máy chủ Cloudflare Worker & D1</strong>
                <p>Kết nối ổn định, tốc độ phản hồi 28ms</p>
              </div>
              <span className="status-badge-active">Hoạt động tốt</span>
            </div>

            <div className="op-info-item">
              <div className="op-info-icon bg-green-100">🖨️</div>
              <div className="op-info-content">
                <strong>Máy in hóa đơn nhiệt 80mm</strong>
                <p>Mẫu in chuẩn VietQR, kết nối sẵn sàng</p>
              </div>
              <span className="status-badge-active">Sẵn sàng</span>
            </div>

            <div className="op-info-item">
              <div className="op-info-icon bg-amber-100">👥</div>
              <div className="op-info-content">
                <strong>Nhân sự ca trực hiện tại</strong>
                <p>Đang có 2 nhân viên trong ca làm việc</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
