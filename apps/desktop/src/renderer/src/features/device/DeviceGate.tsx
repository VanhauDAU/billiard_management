import {
  useCallback,
  useEffect,
  useState
} from 'react'

import type {
  DesktopDeviceState
} from '../../../../shared/device-api'

import {
  ActivationScreen
} from './ActivationScreen'

export function DeviceGate(): React.JSX.Element {
  const [
    state,
    setState
  ] =
    useState<DesktopDeviceState | null>(
      null
    )

  const [
    loading,
    setLoading
  ] = useState(true)

  const loadState =
    useCallback(async () => {
      setLoading(true)

      try {
        const nextState =
          await window.desktopApi
            .device
            .getState()

        setState(nextState)
      } catch (error) {
        console.error(
          'Failed to load device state:',
          error
        )

        setState(null)
      } finally {
        setLoading(false)
      }
    }, [])

  useEffect(() => {
    void loadState()
  }, [loadState])

  if (loading) {
    return (
      <StatusCard
        title="Đang khởi động POS"
        description="Đang kiểm tra thiết bị và kết nối cửa hàng..."
        loading
      />
    )
  }

  if (!state) {
    return (
      <StatusCard
        title="Không thể khởi động"
        description="Không thể đọc trạng thái thiết bị."
        buttonLabel="Thử lại"
        onButtonClick={() =>
          void loadState()
        }
      />
    )
  }

  if (
    state.status ===
    'not_activated'
  ) {
    return (
      <ActivationScreen
        installationId={
          state.installationId
        }
        onActivated={setState}
      />
    )
  }

  if (
    state.status ===
    'needs_reactivation'
  ) {
    return (
      <ActivationScreen
        installationId={
          state.installationId
        }
        reactivation
        onActivated={setState}
      />
    )
  }

  if (
    state.status ===
    'unavailable'
  ) {
    return (
      <StatusCard
        eyebrow="Mất kết nối"
        title="Không thể kết nối máy chủ"
        description="Thiết bị đã được cấu hình nhưng hiện không thể xác minh với máy chủ."
        buttonLabel="Thử kết nối lại"
        onButtonClick={() =>
          void loadState()
        }
      />
    )
  }

  if (
    state.status ===
    'blocked'
  ) {
    const message =
      state.reason ===
      'store_inactive'
        ? 'Cửa hàng hiện không được phép hoạt động. Vui lòng liên hệ quản trị hệ thống.'
        : 'Thiết bị này đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên cửa hàng.'

    return (
      <StatusCard
        eyebrow="Thiết bị bị khóa"
        title="Không thể sử dụng POS"
        description={message}
        installationId={
          state.installationId
        }
        buttonLabel="Kiểm tra lại"
        onButtonClick={() =>
          void loadState()
        }
      />
    )
  }

  return (
    <main className="device-page">
      <section className="device-card device-status-card">
        <p className="device-success-label">
          Thiết bị đã sẵn sàng
        </p>

        <h1>
          {state.context.store.name}
        </h1>

        <p>
          Máy POS đã được xác thực thành công.
        </p>

        <div className="device-context-grid">
          <ContextItem
            label="Thiết bị"
            value={
              state.context.device.name
            }
          />

          <ContextItem
            label="Nền tảng"
            value={
              state.context.device.platform
            }
          />

          <ContextItem
            label="Cửa hàng"
            value={
              state.context.store.name
            }
          />

          <ContextItem
            label="Tiền tệ"
            value={
              state.context.store.currency
            }
          />
        </div>

        <div className="device-next-step">
          Thiết bị đã sẵn sàng.
          Bước tiếp theo là đăng nhập nhân viên bằng PIN.
        </div>
      </section>
    </main>
  )
}

interface ContextItemProps {
  label: string
  value: string
}

function ContextItem({
  label,
  value
}: ContextItemProps): React.JSX.Element {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

interface StatusCardProps {
  eyebrow?: string
  title: string
  description: string
  loading?: boolean
  installationId?: string
  buttonLabel?: string
  onButtonClick?: () => void
}

function StatusCard({
  eyebrow,
  title,
  description,
  loading = false,
  installationId,
  buttonLabel,
  onButtonClick
}: StatusCardProps): React.JSX.Element {
  return (
    <main className="device-page">
      <section className="device-card device-status-card">
        {loading && (
          <div className="device-spinner" />
        )}

        {eyebrow && (
          <p className="device-eyebrow">
            {eyebrow}
          </p>
        )}

        <h1>{title}</h1>

        <p>{description}</p>

        {installationId && (
          <div className="device-installation">
            <span>Installation ID</span>
            <code>{installationId}</code>
          </div>
        )}

        {buttonLabel &&
          onButtonClick && (
            <button
              type="button"
              onClick={
                onButtonClick
              }
            >
              {buttonLabel}
            </button>
          )}
      </section>
    </main>
  )
}