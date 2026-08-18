import { useState } from 'react'
import type { FormEvent } from 'react'

import type {
  DesktopDeviceState
} from '../../../../shared/device-api'

interface ActivationScreenProps {
  installationId: string
  reactivation?: boolean

  onActivated(
    state: DesktopDeviceState
  ): void
}

export function ActivationScreen({
  installationId,
  reactivation = false,
  onActivated
}: ActivationScreenProps): React.JSX.Element {
  const [
    activationToken,
    setActivationToken
  ] = useState('')

  const [
    deviceName,
    setDeviceName
  ] = useState('Máy thu ngân 01')

  const [
    submitting,
    setSubmitting
  ] = useState(false)

  const [
    error,
    setError
  ] = useState<string | null>(null)

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()

    if (submitting) {
      return
    }

    const token =
      activationToken.trim()

    const name =
      deviceName.trim()

    if (
      token.length < 32 ||
      token.length > 128
    ) {
      setError(
        'Mã kích hoạt không hợp lệ.'
      )

      return
    }

    if (
      name.length < 1 ||
      name.length > 100
    ) {
      setError(
        'Tên thiết bị phải từ 1 đến 100 ký tự.'
      )

      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const state =
        await window.desktopApi
          .device
          .activate({
            activationToken: token,
            name
          })

      onActivated(state)
    } catch (activationError) {
      console.error(
        'Device activation failed:',
        activationError
      )

      setError(
        'Không thể kích hoạt thiết bị. Kiểm tra mã kích hoạt và kết nối máy chủ.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="device-page">
      <section className="device-card">
        <div className="device-brand">
          <div className="device-brand-mark">
            B
          </div>

          <div>
            <strong>Billiards POS</strong>
            <p>Quản lý cửa hàng billiards</p>
          </div>
        </div>

        <div className="device-card-header">
          <p className="device-eyebrow">
            Thiết lập thiết bị
          </p>

          <h1>
            {reactivation
              ? 'Kích hoạt lại thiết bị'
              : 'Kích hoạt máy POS'}
          </h1>

          <p>
            {reactivation
              ? 'Thông tin xác thực của máy này không còn hợp lệ. Hãy nhập mã kích hoạt mới.'
              : 'Nhập mã kích hoạt được quản trị viên cấp để liên kết máy tính này với cửa hàng.'}
          </p>
        </div>

        <form
          className="device-form"
          onSubmit={handleSubmit}
        >
          <label>
            <span>Tên thiết bị</span>

            <input
              value={deviceName}
              onChange={(event) =>
                setDeviceName(
                  event.target.value
                )
              }
              placeholder="Ví dụ: Máy thu ngân 01"
              maxLength={100}
              disabled={submitting}
            />
          </label>

          <label>
            <span>Mã kích hoạt</span>

            <input
              value={activationToken}
              onChange={(event) =>
                setActivationToken(
                  event.target.value
                )
              }
              placeholder="Nhập mã kích hoạt"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={submitting}
            />
          </label>

          {error && (
            <div
              className="device-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
          >
            {submitting
              ? 'Đang kích hoạt...'
              : reactivation
                ? 'Kích hoạt lại'
                : 'Kích hoạt thiết bị'}
          </button>
        </form>

        <div className="device-installation">
          <span>Installation ID</span>

          <code>
            {installationId}
          </code>
        </div>
      </section>
    </main>
  )
}