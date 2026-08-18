import React, { useState } from 'react'
import { StoreInfoSettingScreen } from './StoreInfoSettingScreen'

type SettingModalKey =
  | 'account'
  | 'tables_zone'
  | 'pricing'
  | 'printer'
  | 'payment'
  | 'sales_mode'
  | 'devices'
  | 'qr_order'
  | 'audit_log'
  | null

export function StoreSettingsScreen(): React.JSX.Element {
  const [currentSubView, setCurrentSubView] = useState<'hub' | 'store_info'>('hub')
  const [activeModal, setActiveModal] = useState<SettingModalKey>(null)

  // Printer form state
  const [printerPaperSize, setPrinterPaperSize] = useState('80mm')
  const [receiptHeader, setReceiptHeader] = useState('HÂN HẠNH PHỤC VỤ QUÝ KHÁCH')
  const [receiptFooter, setReceiptFooter] = useState('Cảm ơn Quý khách & Hẹn gặp lại!')
  const [enableQrPayment, setEnableQrPayment] = useState(true)

  // Payment form state
  const [bankName, setBankName] = useState('MB Bank (Ngân hàng Quân Đội)')
  const [accountNumber, setAccountNumber] = useState('999988886666')
  const [accountName, setAccountName] = useState('LE VAN HAU')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveModal(null)
    showToast('Đã lưu thành công cấu hình thiết lập!')
  }

  if (currentSubView === 'store_info') {
    return <StoreInfoSettingScreen onBack={() => setCurrentSubView('hub')} />
  }

  return (
    <div className="admin-view-container settings-page-container">
      {/* Page Header */}
      <div className="settings-page-main-header">
        <h1 className="settings-page-main-title">THIẾT LẬP CỬA HÀNG</h1>
        <p className="settings-page-main-desc">
          Tùy chỉnh toàn bộ thông tin cửa hàng, phương thức thanh toán, máy in và quy chuẩn vận hành
        </p>
      </div>

      {toastMessage && (
        <div className="alert-box alert-success" style={{ animation: 'dropdownFadeIn 0.2s ease' }}>
          <span>✅</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Section 1: Thiết lập thông tin */}
      <div className="settings-section-card">
        <h3 className="settings-section-title">Thiết lập thông tin</h3>
        <div className="settings-tiles-grid">
          {/* Tile 1: Thông tin cửa hàng */}
          <div className="settings-tile-item" onClick={() => setCurrentSubView('store_info')}>
            <div className="tile-icon-box bg-blue-50">🏪</div>
            <div className="tile-content">
              <strong className="tile-title">Thông tin cửa hàng</strong>
              <p className="tile-desc">Xem và điều chỉnh thông tin cửa hàng của bạn</p>
            </div>
          </div>

          {/* Tile 2: Thiết lập tài khoản */}
          <div className="settings-tile-item" onClick={() => setActiveModal('account')}>
            <div className="tile-icon-box bg-purple-50">👤</div>
            <div className="tile-content">
              <strong className="tile-title">Thiết lập tài khoản</strong>
              <p className="tile-desc">Xem và điều chỉnh thông tin tài khoản của bạn</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Thiết lập chức năng */}
      <div className="settings-section-card">
        <h3 className="settings-section-title">Thiết lập chức năng</h3>
        <div className="settings-tiles-grid">
          {/* Tile 3: Thiết lập khu vực & Bàn */}
          <div className="settings-tile-item" onClick={() => setActiveModal('tables_zone')}>
            <div className="tile-icon-box bg-blue-50">🎱</div>
            <div className="tile-content">
              <strong className="tile-title">Thiết lập khu vực & Bàn</strong>
              <p className="tile-desc">Xem và thiết lập quản lý bàn/phòng trong cửa hàng</p>
            </div>
          </div>

          {/* Tile 4: Thiết lập bảng giá giờ chơi */}
          <div className="settings-tile-item" onClick={() => setActiveModal('pricing')}>
            <div className="tile-icon-box bg-amber-50">💲</div>
            <div className="tile-content">
              <strong className="tile-title">Thời gian & Bảng giá giờ chơi</strong>
              <p className="tile-desc">Xem và thiết lập bảng giá giờ thường, giờ vàng cao điểm</p>
            </div>
          </div>

          {/* Tile 5: Thiết lập in */}
          <div className="settings-tile-item" onClick={() => setActiveModal('printer')}>
            <div className="tile-icon-box bg-green-50">🖨️</div>
            <div className="tile-content">
              <strong className="tile-title">Thiết lập in & Mẫu bill 80mm</strong>
              <p className="tile-desc">Xem và thiết lập máy in, mẫu in hóa đơn của cửa hàng</p>
            </div>
          </div>

          {/* Tile 6: Phương thức thanh toán */}
          <div className="settings-tile-item" onClick={() => setActiveModal('payment')}>
            <div className="tile-icon-box bg-emerald-50">💳</div>
            <div className="tile-content">
              <strong className="tile-title">Phương thức thanh toán & VietQR</strong>
              <p className="tile-desc">Xem và thiết lập các phương thức thanh toán của cửa hàng</p>
            </div>
          </div>

          {/* Tile 7: Thiết lập bán hàng */}
          <div className="settings-tile-item" onClick={() => setActiveModal('sales_mode')}>
            <div className="tile-icon-box bg-purple-50">🛍️</div>
            <div className="tile-content">
              <strong className="tile-title">Thiết lập bán hàng</strong>
              <p className="tile-desc">Xem và thiết lập các chế độ bán hàng trong cửa hàng</p>
            </div>
          </div>

          {/* Tile 8: Thiết lập thiết bị */}
          <div className="settings-tile-item" onClick={() => setActiveModal('devices')}>
            <div className="tile-icon-box bg-blue-50">💻</div>
            <div className="tile-content">
              <strong className="tile-title">Thiết lập thiết bị POS</strong>
              <p className="tile-desc">Xem và thiết lập các thiết bị bán hàng và phục vụ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Thiết lập tích hợp & Khác */}
      <div className="settings-section-card">
        <h3 className="settings-section-title">Thiết lập tích hợp & Khác</h3>
        <div className="settings-tiles-grid">
          {/* Tile 9: QR Order */}
          <div className="settings-tile-item" onClick={() => setActiveModal('qr_order')}>
            <div className="tile-icon-box bg-blue-50">📱</div>
            <div className="tile-content">
              <strong className="tile-title">Mã QR Order tại bàn</strong>
              <p className="tile-desc">Thiết lập mã QR đặt tại bàn cho khách tự gọi món</p>
            </div>
          </div>

          {/* Tile 10: Nhật ký hoạt động */}
          <div className="settings-tile-item" onClick={() => setActiveModal('audit_log')}>
            <div className="tile-icon-box bg-amber-50">📑</div>
            <div className="tile-content">
              <strong className="tile-title">Nhật ký hoạt động</strong>
              <p className="tile-desc">Quản lý toàn bộ thao tác, nhật ký hoạt động trong cửa hàng</p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          MODALS CHO TỪNG MỤC THIẾT LẬP CHI TIẾT
          ========================================================= */}

      {/* 1. Modal Thiết lập in */}
      {activeModal === 'printer' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🖨️ Thiết Lập Máy In & Mẫu Bill 80mm</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveModal} className="admin-modal-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Khổ giấy in nhiệt</label>
                <select
                  className="admin-form-select"
                  value={printerPaperSize}
                  onChange={(e) => setPrinterPaperSize(e.target.value)}
                >
                  <option value="80mm">Khổ tiêu chuẩn 80mm (K80 - Khuyên dùng)</option>
                  <option value="58mm">Khổ nhỏ 58mm (K58)</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Lời chào đầu bill (Header)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={receiptHeader}
                  onChange={(e) => setReceiptHeader(e.target.value)}
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Lời cảm ơn chân bill (Footer)</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                />
              </div>
              <div style={{ marginTop: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={enableQrPayment}
                    onChange={(e) => setEnableQrPayment(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
                    In kèm mã QR thanh toán ngân hàng (VietQR) trên hóa đơn
                  </span>
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setActiveModal(null)}>Đóng</button>
                <button type="submit" className="admin-btn-primary">Lưu cài đặt in</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Phương thức thanh toán & VietQR */}
      {activeModal === 'payment' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">💳 Phương Thức Thanh Toán & VietQR</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveModal} className="admin-modal-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Ngân hàng thụ hưởng *</label>
                <select
                  className="admin-form-select"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                >
                  <option value="MB Bank (Ngân hàng Quân Đội)">MB Bank (Ngân hàng Quân Đội)</option>
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="ACB">ACB (Á Châu)</option>
                  <option value="VPBank">VPBank</option>
                  <option value="TPBank">TPBank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="VietinBank">VietinBank</option>
                </select>
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Số tài khoản ngân hàng *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Tên chủ tài khoản (In hoa không dấu) *</label>
                <input
                  type="text"
                  className="admin-form-input"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn-secondary" onClick={() => setActiveModal(null)}>Đóng</button>
                <button type="submit" className="admin-btn-primary">Lưu tài khoản VietQR</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal Nhật ký hoạt động */}
      {activeModal === 'audit_log' && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📑 Nhật Ký Hoạt Động Cửa Hàng</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <table className="admin-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Nhân viên</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ color: '#64748b' }}>19/08 21:48</td>
                    <td><strong>Lê Văn Hậu</strong></td>
                    <td>Thanh toán Bàn 05 (320,000đ)</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b' }}>19/08 21:32</td>
                    <td><strong>Nguyễn Văn Thu Ngân</strong></td>
                    <td>Thanh toán Bàn 03 (150,000đ)</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b' }}>19/08 21:02</td>
                    <td><strong>Nguyễn Văn Thu Ngân</strong></td>
                    <td>Thanh toán Bàn 01 (173,000đ)</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#64748b' }}>19/08 20:00</td>
                    <td><strong>Nguyễn Văn Thu Ngân</strong></td>
                    <td>Mở Bàn 03 (Carom 3C)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="admin-modal-actions" style={{ marginTop: '16px' }}>
              <button type="button" className="admin-btn-primary" onClick={() => setActiveModal(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Generic / Placeholder Modals */}
      {(activeModal === 'account' ||
        activeModal === 'tables_zone' ||
        activeModal === 'pricing' ||
        activeModal === 'sales_mode' ||
        activeModal === 'devices' ||
        activeModal === 'qr_order') && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">⚙️ Cấu Hình Chức Năng</h3>
              <button type="button" className="modal-close-btn" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: '13.5px', color: '#64748b' }}>
              Chức năng đã được cấu hình mặc định tối ưu theo quy chuẩn vận hành của quán bida. Bạn có thể lưu lại hoặc đóng cửa sổ.
            </p>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn-secondary" onClick={() => setActiveModal(null)}>Đóng</button>
              <button type="button" className="admin-btn-primary" onClick={handleSaveModal}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
