import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'

import type {
  AuthSessionResponse,
  DeviceContext,
  EmployeeSummary
} from '@billiards/contracts'

import type {
  DesktopAuthState
} from '../../../../shared/auth-api'


const PIN_PATTERN =
  /^\d{4,6}$/

const KEYPAD_DIGITS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9'
] as const


interface AuthGateProps {
  deviceContext:
    DeviceContext

  onDeviceNotReady:
    () => void | Promise<void>
}


export function AuthGate({
  deviceContext,
  onDeviceNotReady
}: AuthGateProps): React.JSX.Element {
  const [
    authState,
    setAuthState
  ] =
    useState<DesktopAuthState | null>(
      null
    )

  const [
    authLoading,
    setAuthLoading
  ] =
    useState(true)

  const [
    employees,
    setEmployees
  ] =
    useState<EmployeeSummary[]>(
      []
    )

  const [
    employeesLoading,
    setEmployeesLoading
  ] =
    useState(false)

  const [
    employeesError,
    setEmployeesError
  ] =
    useState<string | null>(
      null
    )

  const [
    selectedEmployeeId,
    setSelectedEmployeeId
  ] =
    useState<string | null>(
      null
    )

  const [
    pin,
    setPin
  ] =
    useState('')

  const [
    loginLoading,
    setLoginLoading
  ] =
    useState(false)

  const [
    loginError,
    setLoginError
  ] =
    useState<string | null>(
      null
    )

  const [
    lockedUntil,
    setLockedUntil
  ] =
    useState<number | null>(
      null
    )

  const [
    lockRemaining,
    setLockRemaining
  ] =
    useState(0)

  const [
    logoutLoading,
    setLogoutLoading
  ] =
    useState(false)

  const [
    logoutError,
    setLogoutError
  ] =
    useState<string | null>(
      null
    )


  const selectedEmployee =
    useMemo(
      () =>
        employees.find(
          (employee) =>
            employee.id ===
            selectedEmployeeId
        ) ?? null,
      [
        employees,
        selectedEmployeeId
      ]
    )


  const loadEmployees =
    useCallback(
      async () => {
        setEmployeesLoading(true)

        setEmployeesError(
          null
        )

        try {
          const result =
            await window
              .desktopApi
              .auth
              .getEmployees()

          if (!result.ok) {
            if (
              result.error ===
              'device_not_ready'
            ) {
              void onDeviceNotReady()

              return
            }

            setEmployeesError(
              'Không thể tải danh sách nhân viên. Vui lòng kiểm tra kết nối và thử lại.'
            )

            return
          }

          setEmployees(
            result.value.employees
          )
        } catch (error) {
          console.error(
            'Failed to load employees:',
            error
          )

          setEmployeesError(
            'Không thể tải danh sách nhân viên.'
          )
        } finally {
          setEmployeesLoading(
            false
          )
        }
      },
      [
        onDeviceNotReady
      ]
    )


  const loadAuthState =
    useCallback(
      async () => {
        setAuthLoading(true)

        try {
          const nextState =
            await window
              .desktopApi
              .auth
              .getState()

          setAuthState(
            nextState
          )

          if (
            nextState.status ===
            'device_not_ready'
          ) {
            void onDeviceNotReady()

            return
          }

          if (
            nextState.status ===
            'signed_out'
          ) {
            await loadEmployees()
          }
        } catch (error) {
          console.error(
            'Failed to load auth state:',
            error
          )

          setAuthState({
            status:
              'unavailable',

            reason:
              'backend_unavailable'
          })
        } finally {
          setAuthLoading(
            false
          )
        }
      },
      [
        loadEmployees,
        onDeviceNotReady
      ]
    )


  useEffect(
    () => {
      void loadAuthState()
    },
    [
      loadAuthState
    ]
  )


  /*
   * The server remains the source of truth
   * for session expiry.
   *
   * This timer only makes the renderer
   * re-check the server when the known
   * absolute expiry is reached.
   */
  useEffect(
    () => {
      if (
        authState?.status !==
        'authenticated'
      ) {
        return
      }

      const expiresAt =
        Date.parse(
          authState
            .session
            .expiresAt
        )

      if (
        !Number.isFinite(
          expiresAt
        )
      ) {
        return
      }

      const delay =
        expiresAt -
        Date.now() +
        250

      if (
        delay <= 0
      ) {
        void loadAuthState()

        return
      }

      const timeout =
        window.setTimeout(
          () => {
            void loadAuthState()
          },
          delay
        )

      return () => {
        window.clearTimeout(
          timeout
        )
      }
    },
    [
      authState,
      loadAuthState
    ]
  )


  /*
   * UI countdown only.
   *
   * It does NOT unlock the server.
   * The next login request is still
   * verified by server-side lockout.
   */
  useEffect(
    () => {
      if (!lockedUntil) {
        setLockRemaining(0)

        return
      }

      const updateRemaining =
        (): void => {
          const remaining =
            Math.max(
              0,

              Math.ceil(
                (
                  lockedUntil -
                  Date.now()
                ) /
                  1000
              )
            )

          setLockRemaining(
            remaining
          )
        }

      updateRemaining()

      const interval =
        window.setInterval(
          updateRemaining,
          250
        )

      return () => {
        window.clearInterval(
          interval
        )
      }
    },
    [
      lockedUntil
    ]
  )


  useEffect(
    () => {
      if (
        lockRemaining === 0 &&
        lockedUntil !== null &&
        Date.now() >=
          lockedUntil
      ) {
        setLockedUntil(
          null
        )
      }
    },
    [
      lockRemaining,
      lockedUntil
    ]
  )


  function selectEmployee(
    employee:
      EmployeeSummary
  ): void {
    setSelectedEmployeeId(
      employee.id
    )

    setPin('')

    setLoginError(
      null
    )

    setLockedUntil(
      null
    )
  }


  function changeEmployee():
  void {
    setSelectedEmployeeId(
      null
    )

    setPin('')

    setLoginError(
      null
    )

    setLockedUntil(
      null
    )
  }


  function appendDigit(
    digit: string
  ): void {
    if (
      loginLoading ||
      lockRemaining > 0
    ) {
      return
    }

    setPin(
      (current) => {
        if (
          current.length >= 6
        ) {
          return current
        }

        return (
          current +
          digit
        )
      }
    )

    setLoginError(
      null
    )
  }


  function deleteDigit():
  void {
    if (
      loginLoading ||
      lockRemaining > 0
    ) {
      return
    }

    setPin(
      (current) =>
        current.slice(
          0,
          -1
        )
    )

    setLoginError(
      null
    )
  }


  function clearPin():
  void {
    if (loginLoading) {
      return
    }

    setPin('')

    setLoginError(
      null
    )
  }


  async function handleLogin(
    event:
      React.FormEvent
  ): Promise<void> {
    event.preventDefault()

    if (
      !selectedEmployee
    ) {
      return
    }

    if (
      !selectedEmployee.hasPin
    ) {
      setLoginError(
        'Nhân viên này chưa được thiết lập PIN.'
      )

      return
    }

    if (
      lockRemaining > 0
    ) {
      return
    }

    if (
      !PIN_PATTERN.test(
        pin
      )
    ) {
      setLoginError(
        'PIN phải gồm từ 4 đến 6 chữ số.'
      )

      return
    }

    setLoginLoading(
      true
    )

    setLoginError(
      null
    )

    try {
      const result =
        await window
          .desktopApi
          .auth
          .login({
            employeeId:
              selectedEmployee.id,

            pin
          })

      /*
       * Never keep a submitted PIN around
       * longer than necessary.
       */
      setPin('')

      if (result.ok) {
        setLockedUntil(
          null
        )

        setSelectedEmployeeId(
          null
        )

        setEmployees([])

        setAuthState({
          status:
            'authenticated',

          session:
            result.session
        })

        return
      }

      switch (
        result.error
      ) {
        case 'invalid_employee_or_pin':
          setLoginError(
            'Nhân viên hoặc PIN không đúng.'
          )
          break

        case 'pin_not_configured':
          setLoginError(
            'Nhân viên này chưa được thiết lập PIN. Vui lòng liên hệ quản lý.'
          )
          break

        case 'pin_locked': {
          const retryAfter =
            Math.max(
              1,

              Math.ceil(
                result
                  .retryAfterSeconds ??
                  1
              )
            )

          setLockedUntil(
            Date.now() +
              retryAfter *
                1000
          )

          setLoginError(
            'Đăng nhập tạm thời bị khóa do nhập sai PIN nhiều lần.'
          )

          break
        }

        case 'secure_storage_unavailable':
          setLoginError(
            'Kho lưu trữ bảo mật của hệ điều hành hiện không khả dụng.'
          )
          break

        case 'session_storage_failed':
          setLoginError(
            'Không thể lưu phiên đăng nhập an toàn trên thiết bị.'
          )
          break

        case 'device_not_ready':
          void onDeviceNotReady()
          break

        case 'authentication_unavailable':
        case 'backend_unavailable':
        default:
          setLoginError(
            'Không thể đăng nhập lúc này. Vui lòng kiểm tra kết nối và thử lại.'
          )
          break
      }
    } catch (error) {
      console.error(
        'Employee login failed:',
        error
      )

      setPin('')

      setLoginError(
        'Không thể đăng nhập lúc này.'
      )
    } finally {
      setLoginLoading(
        false
      )
    }
  }


  async function handleLogout():
  Promise<void> {
    setLogoutLoading(
      true
    )

    setLogoutError(
      null
    )

    try {
      const result =
        await window
          .desktopApi
          .auth
          .logout()

      if (
        !result.remoteRevoked
      ) {
        console.warn(
          'AuthSession was removed locally but could not be revoked remotely.'
        )
      }

      setAuthState({
        status:
          'signed_out'
      })

      setSelectedEmployeeId(
        null
      )

      setPin('')

      setLockedUntil(
        null
      )

      await loadEmployees()
    } catch (error) {
      console.error(
        'Employee logout failed:',
        error
      )

      setLogoutError(
        'Không thể đăng xuất phiên làm việc.'
      )
    } finally {
      setLogoutLoading(
        false
      )
    }
  }


  if (authLoading) {
    return (
      <AuthStatusCard
        eyebrow="Xác thực nhân viên"
        title="Đang kiểm tra phiên làm việc"
        description="Đang xác minh phiên đăng nhập trên thiết bị..."
        loading
      />
    )
  }


  if (!authState) {
    return (
      <AuthStatusCard
        title="Không thể kiểm tra đăng nhập"
        description="Không thể đọc trạng thái phiên làm việc."
        buttonLabel="Thử lại"
        onButtonClick={() =>
          void loadAuthState()
        }
      />
    )
  }


  if (
    authState.status ===
    'device_not_ready'
  ) {
    return (
      <AuthStatusCard
        title="Đang kiểm tra lại thiết bị"
        description="Thiết bị cần được xác minh lại trước khi đăng nhập nhân viên."
        loading
      />
    )
  }


  if (
    authState.status ===
    'unavailable'
  ) {
    return (
      <AuthStatusCard
        eyebrow="Mất kết nối"
        title="Không thể kiểm tra phiên đăng nhập"
        description="Máy POS hiện không thể kết nối máy chủ xác thực."
        buttonLabel="Thử lại"
        onButtonClick={() =>
          void loadAuthState()
        }
      />
    )
  }


  if (
    authState.status ===
    'local_error'
  ) {
    const message =
      authState.reason ===
      'secure_storage_unavailable'
        ? 'Kho lưu trữ bảo mật của hệ điều hành hiện không khả dụng.'
        : 'Dữ liệu phiên đăng nhập cục bộ không hợp lệ.'

    return (
      <AuthStatusCard
        eyebrow="Lỗi bảo mật cục bộ"
        title="Không thể đăng nhập nhân viên"
        description={message}
        buttonLabel="Kiểm tra lại"
        onButtonClick={() =>
          void loadAuthState()
        }
      />
    )
  }


  if (
    authState.status ===
    'authenticated'
  ) {
    return (
      <AuthenticatedWorkspace
        deviceContext={
          deviceContext
        }
        session={
          authState.session
        }
        logoutLoading={
          logoutLoading
        }
        logoutError={
          logoutError
        }
        onLogout={() =>
          void handleLogout()
        }
      />
    )
  }


  if (
    employeesLoading
  ) {
    return (
      <AuthStatusCard
        eyebrow="Đăng nhập nhân viên"
        title={deviceContext.store.name}
        description="Đang tải danh sách nhân viên..."
        loading
      />
    )
  }


  if (
    employeesError
  ) {
    return (
      <AuthStatusCard
        eyebrow="Đăng nhập nhân viên"
        title="Không thể tải nhân viên"
        description={
          employeesError
        }
        buttonLabel="Thử lại"
        onButtonClick={() =>
          void loadEmployees()
        }
      />
    )
  }


  if (
    selectedEmployee
  ) {
    const canSubmit =
      selectedEmployee.hasPin &&
      PIN_PATTERN.test(pin) &&
      !loginLoading &&
      lockRemaining === 0

    return (
      <main className="auth-page">
        <section className="auth-card auth-pin-card">
          <div className="auth-card-header">
            <button
              type="button"
              className="auth-back-button"
              onClick={
                changeEmployee
              }
              disabled={
                loginLoading
              }
            >
              ← Đổi nhân viên
            </button>

            <p className="auth-eyebrow">
              Đăng nhập nhân viên
            </p>

            <h1>
              Nhập mã PIN
            </h1>

            <p>
              PIN gồm từ 4 đến 6 chữ số.
            </p>
          </div>

          <div className="auth-selected-employee">
            <EmployeeAvatar
              name={
                selectedEmployee
                  .displayName
              }
            />

            <div>
              <strong>
                {
                  selectedEmployee
                    .displayName
                }
              </strong>

              <span>
                {
                  selectedEmployee
                    .roleName
                }
              </span>
            </div>
          </div>

          <form
            className="auth-pin-form"
            onSubmit={
              (event) =>
                void handleLogin(
                  event
                )
            }
          >
            <input
              className="auth-pin-input"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              aria-label="Mã PIN nhân viên"
              value={pin}
              disabled={
                loginLoading ||
                lockRemaining > 0
              }
              onChange={
                (event) => {
                  const nextPin =
                    event
                      .currentTarget
                      .value
                      .replace(
                        /\D/g,
                        ''
                      )
                      .slice(
                        0,
                        6
                      )

                  setPin(
                    nextPin
                  )

                  setLoginError(
                    null
                  )
                }
              }
            />

            <div
              className="auth-pin-progress"
              aria-hidden="true"
            >
              {Array.from({
                length: 6
              }).map(
                (_, index) => (
                  <span
                    key={
                      index
                    }
                    className={
                      index <
                      pin.length
                        ? 'filled'
                        : ''
                    }
                  />
                )
              )}
            </div>

            {lockRemaining >
              0 && (
              <div className="auth-lockout">
                Đăng nhập bị khóa.
                Thử lại sau{' '}
                <strong>
                  {
                    lockRemaining
                  }s
                </strong>
                .
              </div>
            )}

            {loginError && (
              <div className="auth-error">
                {loginError}
              </div>
            )}

            <div className="auth-keypad">
              {KEYPAD_DIGITS.map(
                (digit) => (
                  <button
                    key={
                      digit
                    }
                    type="button"
                    onClick={() =>
                      appendDigit(
                        digit
                      )
                    }
                    disabled={
                      loginLoading ||
                      lockRemaining >
                        0
                    }
                  >
                    {digit}
                  </button>
                )
              )}

              <button
                type="button"
                className="auth-keypad-secondary"
                onClick={
                  clearPin
                }
                disabled={
                  loginLoading ||
                  lockRemaining > 0
                }
              >
                Xóa
              </button>

              <button
                type="button"
                onClick={() =>
                  appendDigit(
                    '0'
                  )
                }
                disabled={
                  loginLoading ||
                  lockRemaining > 0
                }
              >
                0
              </button>

              <button
                type="button"
                className="auth-keypad-secondary"
                aria-label="Xóa một chữ số"
                onClick={
                  deleteDigit
                }
                disabled={
                  loginLoading ||
                  lockRemaining > 0
                }
              >
                ⌫
              </button>
            </div>

            <button
              type="submit"
              className="auth-primary-button"
              disabled={
                !canSubmit
              }
            >
              {loginLoading
                ? 'Đang đăng nhập...'
                : 'Đăng nhập'}
            </button>
          </form>
        </section>
      </main>
    )
  }


  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-card-header">
          <p className="auth-eyebrow">
            Thiết bị đã sẵn sàng
          </p>

          <h1>
            {deviceContext.store.name}
          </h1>

          <p>
            Chọn nhân viên đang sử dụng máy POS.
          </p>

          <div className="auth-device-label">
            {deviceContext.device.name}
            {' · '}
            {deviceContext.device.platform}
          </div>
        </div>

        {employees.length ===
        0 ? (
          <div className="auth-empty">
            <strong>
              Chưa có nhân viên khả dụng
            </strong>

            <p>
              Cửa hàng chưa có nhân viên đang hoạt động để đăng nhập.
            </p>

            <button
              type="button"
              className="auth-secondary-button"
              onClick={() =>
                void loadEmployees()
              }
            >
              Tải lại
            </button>
          </div>
        ) : (
          <div className="auth-employee-grid">
            {employees.map(
              (employee) => (
                <button
                  key={
                    employee.id
                  }
                  type="button"
                  className="auth-employee-button"
                  disabled={
                    !employee.hasPin
                  }
                  onClick={() =>
                    selectEmployee(
                      employee
                    )
                  }
                >
                  <EmployeeAvatar
                    name={
                      employee
                        .displayName
                    }
                  />

                  <span className="auth-employee-info">
                    <strong>
                      {
                        employee
                          .displayName
                      }
                    </strong>

                    <span>
                      {
                        employee
                          .roleName
                      }
                    </span>
                  </span>

                  <span
                    className={
                      employee.hasPin
                        ? 'auth-pin-ready'
                        : 'auth-pin-missing'
                    }
                  >
                    {employee.hasPin
                      ? 'Đăng nhập'
                      : 'Chưa có PIN'}
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </section>
    </main>
  )
}


interface AuthenticatedWorkspaceProps {
  deviceContext:
    DeviceContext

  session:
    AuthSessionResponse

  logoutLoading:
    boolean

  logoutError:
    string | null

  onLogout:
    () => void
}


function AuthenticatedWorkspace({
  deviceContext,
  session,
  logoutLoading,
  logoutError,
  onLogout
}: AuthenticatedWorkspaceProps):
React.JSX.Element {
  return (
    <main className="auth-page">
      <section className="auth-card auth-authenticated-card">
        <p className="auth-success-label">
          Đăng nhập thành công
        </p>

        <EmployeeAvatar
          name={
            session.actor
              .displayName
          }
          large
        />

        <h1>
          {session.actor.displayName}
        </h1>

        <p>
          {session.actor.roleName}
        </p>

        <div className="auth-session-grid">
          <div>
            <span>
              Cửa hàng
            </span>

            <strong>
              {
                deviceContext
                  .store
                  .name
              }
            </strong>
          </div>

          <div>
            <span>
              Thiết bị
            </span>

            <strong>
              {
                deviceContext
                  .device
                  .name
              }
            </strong>
          </div>

          <div>
            <span>
              Vai trò
            </span>

            <strong>
              {
                session.actor
                  .roleName
              }
            </strong>
          </div>

          <div>
            <span>
              Phiên hết hạn
            </span>

            <strong>
              {
                formatExpiration(
                  session
                    .expiresAt
                )
              }
            </strong>
          </div>
        </div>

        <div className="auth-workspace-ready">
          Phiên nhân viên đã được xác thực.
          POS hiện đã có Trusted Actor để sử dụng cho các thao tác nghiệp vụ.
        </div>

        {logoutError && (
          <div className="auth-error">
            {logoutError}
          </div>
        )}

        <button
          type="button"
          className="auth-secondary-button"
          disabled={
            logoutLoading
          }
          onClick={
            onLogout
          }
        >
          {logoutLoading
            ? 'Đang đăng xuất...'
            : 'Đăng xuất nhân viên'}
        </button>
      </section>
    </main>
  )
}


interface EmployeeAvatarProps {
  name: string
  large?: boolean
}


function EmployeeAvatar({
  name,
  large = false
}: EmployeeAvatarProps):
React.JSX.Element {
  return (
    <span
      className={[
        'auth-avatar',

        large
          ? 'auth-avatar-large'
          : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {getInitials(
        name
      )}
    </span>
  )
}


interface AuthStatusCardProps {
  eyebrow?: string

  title: string

  description: string

  loading?: boolean

  buttonLabel?: string

  onButtonClick?:
    () => void
}


function AuthStatusCard({
  eyebrow,
  title,
  description,
  loading = false,
  buttonLabel,
  onButtonClick
}: AuthStatusCardProps):
React.JSX.Element {
  return (
    <main className="auth-page">
      <section className="auth-card auth-status-card">
        {loading && (
          <div className="auth-spinner" />
        )}

        {eyebrow && (
          <p className="auth-eyebrow">
            {eyebrow}
          </p>
        )}

        <h1>
          {title}
        </h1>

        <p>
          {description}
        </p>

        {buttonLabel &&
          onButtonClick && (
          <button
            type="button"
            className="auth-primary-button"
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


function getInitials(
  name: string
): string {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)

  if (
    parts.length === 0
  ) {
    return '?'
  }

  return parts
    .slice(-2)
    .map(
      (part) =>
        part.charAt(0)
    )
    .join('')
    .toUpperCase()
}


function formatExpiration(
  value: string
): string {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  return new Intl
    .DateTimeFormat(
      'vi-VN',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit'
      }
    )
    .format(date)
}