import { useEffect, useState } from 'react'

type CheckStatus = 'loading' | 'success' | 'error'

function App(): React.JSX.Element {
  const [version, setVersion] = useState('Đang kiểm tra...')
  const [ipcStatus, setIpcStatus] =
    useState<CheckStatus>('loading')

  const [backendStatus, setBackendStatus] =
    useState<CheckStatus>('loading')

  const [backendService, setBackendService] =
    useState<string>('-')

  useEffect(() => {
    window.desktopApi.app
      .getVersion()
      .then((appVersion) => {
        setVersion(appVersion)
        setIpcStatus('success')
      })
      .catch((error) => {
        console.error('IPC check failed:', error)
        setIpcStatus('error')
      })

    window.desktopApi.backend
      .health()
      .then((health) => {
        setBackendService(health.service)

        setBackendStatus(
          health.ok ? 'success' : 'error'
        )
      })
      .catch((error) => {
        console.error('Backend health check failed:', error)
        setBackendStatus('error')
      })
  }, [])

  const statusLabel = (status: CheckStatus): string => {
    if (status === 'success') return 'OK'
    if (status === 'error') return 'Lỗi'

    return 'Đang kiểm tra...'
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'system-ui, sans-serif'
      }}
    >
      <section
        style={{
          width: 'min(600px, 90vw)',
          padding: 32,
          border: '1px solid #ddd',
          borderRadius: 16
        }}
      >
        <h1>Billiards POS</h1>

        <p>Foundation diagnostics</p>

        <hr />

        <p>
          Desktop IPC:{' '}
          <strong>{statusLabel(ipcStatus)}</strong>
        </p>

        <p>
          App version: <strong>{version}</strong>
        </p>

        <p>
          Backend API:{' '}
          <strong>{statusLabel(backendStatus)}</strong>
        </p>

        <p>
          API service:{' '}
          <strong>{backendService}</strong>
        </p>
      </section>
    </main>
  )
}

export default App