import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import localProvincesData from '../../assets/vietnam_provinces_v2.json'

interface WardItem {
  code: number
  name: string
  division_type?: string
}

interface ProvinceItem {
  code: number
  name: string
  division_type?: string
  wards?: WardItem[]
}

interface StoreInfoSettingScreenProps {
  onBack: () => void
}

const STORAGE_KEY = 'billiard_store_settings_v1'

export function StoreInfoSettingScreen({ onBack }: StoreInfoSettingScreenProps): React.JSX.Element {
  // Load initial state from localStorage or use defaults
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {
      console.warn('Could not read store settings from localStorage', e)
    }
    return {
      storeCode: '107493',
      storeName: 'Vanhau1410rr',
      phone: '0777464347',
      currency: 'VND',
      address: '',
      selectedProvinceCode: '',
      selectedWardCode: ''
    }
  }

  const initialData = getInitialState()

  const [storeCode] = useState<string>(initialData.storeCode || '107493')
  const [storeName, setStoreName] = useState<string>(initialData.storeName || 'Vanhau1410rr')
  const [phone, setPhone] = useState<string>(initialData.phone || '0777464347')
  const [currency, setCurrency] = useState<string>(initialData.currency || 'VND')
  const [address, setAddress] = useState<string>(initialData.address || '')

  // Provinces & Wards state
  const [provincesList, setProvincesList] = useState<ProvinceItem[]>(localProvincesData as ProvinceItem[])
  const [selectedProvinceCode, setSelectedProvinceCode] = useState<number | ''>(
    initialData.selectedProvinceCode ? Number(initialData.selectedProvinceCode) : ''
  )
  const [wardsList, setWardsList] = useState<WardItem[]>([])
  const [selectedWardCode, setSelectedWardCode] = useState<number | ''>(
    initialData.selectedWardCode ? Number(initialData.selectedWardCode) : ''
  )

  // Try to sync latest live data from online API if available
  useEffect(() => {
    let isMounted = true

    fetch('https://provinces.open-api.vn/api/v2/?depth=2')
      .then((res) => {
        if (!res.ok) throw new Error('Network response not ok')
        return res.json()
      })
      .then((data: ProvinceItem[]) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setProvincesList(data)
        }
      })
      .catch((err) => {
        console.info('Using bundled Vietnam Provinces v2 dataset:', err)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // When selected province changes, instantly update the wards list
  useEffect(() => {
    if (!selectedProvinceCode) {
      setWardsList([])
      setSelectedWardCode('')
      return
    }

    const currentProvince = provincesList.find((p) => p.code === Number(selectedProvinceCode))
    if (currentProvince && Array.isArray(currentProvince.wards)) {
      setWardsList(currentProvince.wards)
    } else {
      setWardsList([])
    }
  }, [selectedProvinceCode, provincesList])

  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : ''
    setSelectedProvinceCode(val)
    setSelectedWardCode('')
  }

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : ''
    setSelectedWardCode(val)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()

    // Persist to localStorage
    try {
      const dataToSave = {
        storeCode,
        storeName,
        phone,
        currency,
        address,
        selectedProvinceCode,
        selectedWardCode
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
    } catch (err) {
      console.error('Failed to save to localStorage:', err)
    }

    toast.success('Đã lưu thành công thông tin cửa hàng!', {
      description: `Mã quán: ${storeCode} - ${storeName}`
    })
  }

  return (
    <div className="store-info-page">
      {/* Top Header with Back Navigation */}
      <div className="store-info-topbar">
        <button type="button" className="store-info-back-btn" onClick={onBack}>
          <span>←</span>
          <span>Thiết lập</span>
        </button>
        <h1 className="store-info-main-title">Thông tin cửa hàng</h1>
      </div>

      {/* 2-Column Layout */}
      <form onSubmit={handleSave} className="store-info-content-grid">
        {/* Left Column: Context Info */}
        <div className="store-info-meta-col">
          <h2 className="store-info-section-heading">Thông tin chung</h2>
          <p className="store-info-section-desc">
            Thông tin về cửa hàng, mô hình và lĩnh vực kinh doanh cửa hàng của bạn.
          </p>
          <div className="store-info-code-badge">
            Mã cửa hàng: <strong>{storeCode}</strong>
          </div>
        </div>

        {/* Right Column: Form Card */}
        <div className="store-info-form-card">
          {/* Tên cửa hàng */}
          <div className="store-form-field">
            <div className="store-form-label-row">
              <label className="store-form-label">
                Tên cửa hàng <span className="text-danger">(*)</span>
                <span className="store-info-tooltip-icon" title="Tên thương hiệu quán bida">ℹ️</span>
              </label>
              <span className="store-form-hint">Có thể nhập nhiều dòng, tối đa 255 ký tự</span>
            </div>
            <textarea
              className="store-form-textarea"
              rows={2}
              value={storeName}
              maxLength={255}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
          </div>

          {/* Row: Số điện thoại + Đơn vị tiền tệ */}
          <div className="store-form-row-2">
            <div className="store-form-field">
              <label className="store-form-label">Số điện thoại cửa hàng</label>
              <input
                type="text"
                className="store-form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nhập số điện thoại"
              />
            </div>

            <div className="store-form-field">
              <label className="store-form-label">
                Đơn vị tiền tệ <span className="text-danger">(*)</span>
              </label>
              <select
                className="store-form-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="VND">Việt Nam đồng (VND)</option>
                <option value="USD">Đô la Mỹ (USD)</option>
              </select>
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="store-form-field">
            <div className="store-form-label-row">
              <label className="store-form-label">
                Địa chỉ <span className="text-danger">(*)</span>
              </label>
              <span className="store-form-hint">Tối đa 255 ký tự</span>
            </div>
            <textarea
              className="store-form-textarea"
              rows={2}
              placeholder="Nhập địa chỉ"
              value={address}
              maxLength={255}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* Tỉnh / Thành phố (Vietnam Provinces API 2025 v2) */}
          <div className="store-form-field">
            <label className="store-form-label">
              Tỉnh / Thành phố <span className="text-danger">(*)</span>
            </label>
            <select
              className="store-form-select"
              value={selectedProvinceCode}
              onChange={handleProvinceChange}
            >
              <option value="">-- Chọn tỉnh/ thành phố --</option>
              {provincesList.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phường / Xã */}
          <div className="store-form-field">
            <label className="store-form-label">
              Phường / Xã <span className="text-danger">(*)</span>
            </label>
            <select
              className="store-form-select"
              value={selectedWardCode}
              onChange={handleWardChange}
              disabled={!selectedProvinceCode || wardsList.length === 0}
            >
              <option value="">
                {!selectedProvinceCode
                  ? '-- Chọn phường, xã --'
                  : wardsList.length === 0
                  ? 'Đang tải danh sách...'
                  : `-- Chọn phường, xã (${wardsList.length} phường/xã) --`}
              </option>
              {wardsList.map((w) => (
                <option key={w.code} value={w.code}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bottom Save Action */}
        <div className="store-info-footer-actions">
          <button type="submit" className="store-btn-save">
            Lưu
          </button>
        </div>
      </form>
    </div>
  )
}
