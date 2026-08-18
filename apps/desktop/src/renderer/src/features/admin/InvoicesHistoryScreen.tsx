import React, { useState } from 'react'

interface InvoiceRecord {
  id: string
  code: string
  tableName: string
  cashierName: string
  startTime: string
  endTime: string
  playDuration: string
  tableAmount: number
  serviceAmount: number
  totalAmount: number
  paymentMethod: 'cash' | 'bank_transfer'
  createdAt: string
  status: 'paid' | 'cancelled'
  items: Array<{ name: string; quantity: number; price: number }>
}

export function InvoicesHistoryScreen(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMethod, setFilterMethod] = useState<'all' | 'cash' | 'bank_transfer'>('all')

  const [invoices] = useState<InvoiceRecord[]>([
    {
      id: 'inv_101',
      code: 'HD-20260819-001',
      tableName: 'Bàn 01 (Pool 9-Ball)',
      cashierName: 'Nguyễn Văn Thu Ngân',
      startTime: '19:15',
      endTime: '21:00',
      playDuration: '1h 45m',
      tableAmount: 105000,
      serviceAmount: 68000,
      totalAmount: 173000,
      paymentMethod: 'bank_transfer',
      createdAt: '19/08/2026 21:02',
      status: 'paid',
      items: [
        { name: 'Redbull Thái', quantity: 2, price: 25000 },
        { name: 'Sting Dâu', quantity: 1, price: 18000 }
      ]
    },
    {
      id: 'inv_102',
      code: 'HD-20260819-002',
      tableName: 'Bàn 03 (Carom 3C)',
      cashierName: 'Nguyễn Văn Thu Ngân',
      startTime: '20:00',
      endTime: '21:30',
      playDuration: '1h 30m',
      tableAmount: 105000,
      serviceAmount: 45000,
      totalAmount: 150000,
      paymentMethod: 'cash',
      createdAt: '19/08/2026 21:32',
      status: 'paid',
      items: [
        { name: 'Cà phê sữa đá', quantity: 1, price: 25000 },
        { name: 'Cà phê đen đá', quantity: 1, price: 20000 }
      ]
    },
    {
      id: 'inv_103',
      code: 'HD-20260819-003',
      tableName: 'Bàn 05 (Pool 9-Ball)',
      cashierName: 'Lê Văn Hậu',
      startTime: '18:30',
      endTime: '21:45',
      playDuration: '3h 15m',
      tableAmount: 195000,
      serviceAmount: 125000,
      totalAmount: 320000,
      paymentMethod: 'bank_transfer',
      createdAt: '19/08/2026 21:48',
      status: 'paid',
      items: [
        { name: 'Redbull Thái', quantity: 3, price: 25000 },
        { name: 'Mì tôm 2 trứng', quantity: 1, price: 35000 },
        { name: 'Thuốc lá Craven A', quantity: 1, price: 30000 }
      ]
    },
    {
      id: 'inv_104',
      code: 'HD-20260819-004',
      tableName: 'Bàn 02 (Pool 9-Ball)',
      cashierName: 'Nguyễn Văn Thu Ngân',
      startTime: '21:00',
      endTime: '22:15',
      playDuration: '1h 15m',
      tableAmount: 75000,
      serviceAmount: 0,
      totalAmount: 75000,
      paymentMethod: 'cash',
      createdAt: '19/08/2026 22:18',
      status: 'paid',
      items: []
    }
  ])

  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null)

  const filteredInvoices = invoices.filter((inv) => {
    const matchSearch =
      inv.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.cashierName.toLowerCase().includes(searchTerm.toLowerCase())

    const matchMethod =
      filterMethod === 'all' || inv.paymentMethod === filterMethod

    return matchSearch && matchMethod
  })

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">🧾 Lịch Sử Hóa Đơn & Thanh Toán</h1>
          <p className="admin-page-subtitle">
            Tra cứu lịch sử các hóa đơn bán hàng đã thanh toán, chi tiết tiền giờ và tiền món
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <input
            type="text"
            className="admin-search-input"
            placeholder="🔍 Tìm mã hóa đơn, bàn, thu ngân..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className="admin-form-select"
            style={{ width: '180px' }}
            value={filterMethod}
            onChange={(e) =>
              setFilterMethod(e.target.value as 'all' | 'cash' | 'bank_transfer')
            }
          >
            <option value="all">Tất cả hình thức</option>
            <option value="cash">💵 Tiền mặt</option>
            <option value="bank_transfer">💳 Chuyển khoản QR</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="admin-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Mã hóa đơn</th>
                <th>Bàn</th>
                <th>Thời gian chơi</th>
                <th style={{ textAlign: 'right' }}>Tiền giờ</th>
                <th style={{ textAlign: 'right' }}>Tiền dịch vụ</th>
                <th style={{ textAlign: 'right' }}>Tổng thanh toán</th>
                <th>Hình thức</th>
                <th>Thu ngân</th>
                <th>Thời điểm</th>
                <th style={{ textAlign: 'center' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <strong style={{ color: '#2563eb' }}>{inv.code}</strong>
                  </td>
                  <td>
                    <strong>{inv.tableName}</strong>
                  </td>
                  <td>
                    <span className="badge-tag">⏱️ {inv.playDuration}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>{inv.tableAmount.toLocaleString('vi-VN')} đ</td>
                  <td style={{ textAlign: 'right' }}>{inv.serviceAmount.toLocaleString('vi-VN')} đ</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: '14.5px' }}>
                    {inv.totalAmount.toLocaleString('vi-VN')} đ
                  </td>
                  <td>
                    <span
                      className={
                        inv.paymentMethod === 'bank_transfer'
                          ? 'badge-pill bg-blue-50 text-blue-700'
                          : 'badge-pill bg-emerald-50 text-emerald-700'
                      }
                    >
                      {inv.paymentMethod === 'bank_transfer' ? '💳 Chuyển khoản' : '💵 Tiền mặt'}
                    </span>
                  </td>
                  <td style={{ color: '#64748b' }}>{inv.cashierName}</td>
                  <td style={{ color: '#64748b', fontSize: '12.5px' }}>{inv.createdAt}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      className="admin-btn-action"
                      onClick={() => setSelectedInvoice(inv)}
                    >
                      👁️ Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🧾 Chi tiết Hóa đơn: {selectedInvoice.code}</h3>
              <button type="button" className="modal-close-btn" onClick={() => setSelectedInvoice(null)}>
                ✕
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '16px', fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Bàn phục vụ:</span>
                <strong>{selectedInvoice.tableName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Thời gian:</span>
                <span>{selectedInvoice.startTime} - {selectedInvoice.endTime} ({selectedInvoice.playDuration})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#64748b' }}>Thu ngân:</span>
                <span>{selectedInvoice.cashierName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Hình thức thanh toán:</span>
                <strong>{selectedInvoice.paymentMethod === 'bank_transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt'}</strong>
              </div>
            </div>

            <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>Chi tiết dịch vụ đã dùng:</h4>
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px' }}>
              <table className="admin-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Mục</th>
                    <th style={{ textAlign: 'center' }}>SL</th>
                    <th style={{ textAlign: 'right' }}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tiền giờ chơi ({selectedInvoice.playDuration})</td>
                    <td style={{ textAlign: 'center' }}>1</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{selectedInvoice.tableAmount.toLocaleString('vi-VN')} đ</td>
                  </tr>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{(item.price * item.quantity).toLocaleString('vi-VN')} đ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '2px dashed #cbd5e1', fontSize: '16px' }}>
              <strong>TỔNG THANH TOÁN:</strong>
              <strong style={{ fontSize: '20px', color: '#2563eb' }}>
                {selectedInvoice.totalAmount.toLocaleString('vi-VN')} đ
              </strong>
            </div>

            <div className="admin-modal-actions" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={() => setSelectedInvoice(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="admin-btn-primary"
                onClick={() => alert(`🖨️ Đã gửi lệnh in lại hóa đơn ${selectedInvoice.code} ra máy in 80mm.`)}
              >
                🖨️ In lại Hóa đơn 80mm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
