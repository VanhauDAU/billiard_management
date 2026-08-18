import React, { useState } from 'react'

export function StoreSettingsScreen(): React.JSX.Element {
  const [storeName, setStoreName] = useState('Billiard Club Sài Gòn')
  const [phone, setPhone] = useState('0901 234 567')
  const [address, setAddress] = useState('123 Nguyễn Văn Cừ, Phường 4, Quận 5, TP. Hồ Chí Minh')
  const [wifiPassword, setWifiPassword] = useState('billiard8888')

  // Printing settings
  const [printerPaperSize, setPrinterPaperSize] = useState('80mm')
  const [receiptHeader, setReceiptHeader] = useState('HÂN HẠNH PHỤC VỤ QUÝ KHÁCH')
  const [receiptFooter, setReceiptFooter] = useState('Cảm ơn Quý khách & Hẹn gặp lại!')
  const [enableQrPayment, setEnableQrPayment] = useState(true)

  // Bank VietQR settings
  const [bankName, setBankName] = useState('MB Bank (Ngân hàng Quân Đội)')
  const [accountNumber, setAccountNumber] = useState('999988886666')
  const [accountName, setAccountName] = useState('LE VAN HAU')

  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  return (
    <div className="admin-view-container">
      {/* Page Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">⚙️ Cài Đặt Cửa Hàng & Máy In</h1>
          <p className="admin-page-subtitle">
            Cấu hình thông tin quán, máy in nhiệt 80mm và tài khoản thanh toán mã QR VietQR
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="alert-box alert-success" style={{ marginBottom: '20px' }}>
          <span>✅</span>
          <span>Đã lưu thành công toàn bộ cấu hình cửa hàng!</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="settings-grid-layout">
        {/* Store Info Card */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🏪 Thông Tin Quán Bida</h3>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Tên quán / Cửa hàng *</label>
            <input
              type="text"
              className="admin-form-input"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Số điện thoại Hotline *</label>
            <input
              type="text"
              className="admin-form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Địa chỉ quán *</label>
            <input
              type="text"
              className="admin-form-input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Mật khẩu Wifi (Hiển thị trên bill)</label>
            <input
              type="text"
              className="admin-form-input"
              value={wifiPassword}
              onChange={(e) => setWifiPassword(e.target.value)}
            />
          </div>
        </div>

        {/* Printer & Receipt Card */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3 className="admin-card-title">🖨️ Cấu Hình Máy In Bill 80mm</h3>
          </div>

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
            <label className="admin-form-label">Lời chào đầu hóa đơn (Header)</label>
            <input
              type="text"
              className="admin-form-input"
              value={receiptHeader}
              onChange={(e) => setReceiptHeader(e.target.value)}
            />
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">Lời cảm ơn cuối hóa đơn (Footer)</label>
            <input
              type="text"
              className="admin-form-input"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
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
        </div>

        {/* Banking VietQR Card */}
        <div className="admin-card" style={{ gridColumn: 'span 2' }}>
          <div className="admin-card-header">
            <h3 className="admin-card-title">💳 Tài Khoản Ngân Hàng Nhận Tiền (VietQR)</h3>
            <p className="admin-card-desc">Tự động tạo mã QR động đúng số tiền cần thanh toán cho khách quét</p>
          </div>

          <div className="admin-form-grid-3">
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
          </div>

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="admin-btn-primary" style={{ width: 'auto', padding: '0 32px' }}>
              💾 Lưu toàn bộ Cài đặt
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
