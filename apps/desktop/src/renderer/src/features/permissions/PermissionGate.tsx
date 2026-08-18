import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react'

import type {
    ReactNode
} from 'react'

import type {
    PermissionKey
} from '@billiards/contracts'


// =========================================================
// UI PERMISSION CONTEXT
//
// Đây chỉ là capability snapshot cho Renderer.
//
// KHÔNG phải security authority.
//
// Worker vẫn phải enforce mọi business operation
// bằng requirePermission(...).
// =========================================================

export interface UiPermissionContext {
    permissions:
    ReadonlySet<PermissionKey>

    hasPermission(
        permission:
            PermissionKey
    ): boolean
}


// =========================================================
// COMPONENT PROPS
// =========================================================

interface PermissionGateProps {
    children:
    (
        context:
            UiPermissionContext
    ) => ReactNode

    /*
     * AuthSession không còn hợp lệ.
     *
     * Main Process đã xóa local session credential
     * trước khi trả signed_out.
     */
    onSignedOut:
    () => void | Promise<void>

    /*
     * Device credential không còn hợp lệ,
     * Device bị revoke hoặc Store inactive.
     */
    onDeviceNotReady:
    () => void | Promise<void>
}


// =========================================================
// INTERNAL STATE
// =========================================================

type PermissionGateState =
    | {
        status:
        'loading'
    }

    | {
        status:
        'ready'

        permissions:
        PermissionKey[]
    }

    | {
        status:
        'unavailable'

        reason:
        | 'backend_unavailable'
        | 'secure_storage_unavailable'
    }


// =========================================================
// PERMISSION GATE
// =========================================================

export function PermissionGate({
    children,
    onSignedOut,
    onDeviceNotReady
}: PermissionGateProps):
    React.JSX.Element {
    const [
        state,
        setState
    ] =
        useState<PermissionGateState>({
            status:
                'loading'
        })


    // =======================================================
    // LOAD PERMISSIONS
    // =======================================================

    const loadPermissions =
        useCallback(
            async () => {
                setState({
                    status:
                        'loading'
                })

                try {
                    const result =
                        await window
                            .desktopApi
                            .auth
                            .getPermissions()


                    // -----------------------------------------------
                    // SUCCESS
                    // -----------------------------------------------

                    if (result.ok) {
                        setState({
                            status:
                                'ready',

                            permissions:
                                result
                                    .value
                                    .permissions
                        })

                        return
                    }


                    // -----------------------------------------------
                    // SESSION INVALID
                    // -----------------------------------------------

                    if (
                        result.error ===
                        'signed_out'
                    ) {
                        await onSignedOut()

                        return
                    }


                    // -----------------------------------------------
                    // DEVICE INVALID
                    // -----------------------------------------------

                    if (
                        result.error ===
                        'device_not_ready'
                    ) {
                        await onDeviceNotReady()

                        return
                    }


                    // -----------------------------------------------
                    // SECURE STORAGE ERROR
                    // -----------------------------------------------

                    if (
                        result.error ===
                        'secure_storage_unavailable'
                    ) {
                        setState({
                            status:
                                'unavailable',

                            reason:
                                'secure_storage_unavailable'
                        })

                        return
                    }


                    // -----------------------------------------------
                    // NETWORK / BACKEND
                    // -----------------------------------------------

                    setState({
                        status:
                            'unavailable',

                        reason:
                            'backend_unavailable'
                    })
                } catch (error) {
                    /*
                     * Renderer không cần biết chi tiết
                     * credential/backend internals.
                     */
                    console.error(
                        'Failed to load permission context:',
                        error
                    )

                    setState({
                        status:
                            'unavailable',

                        reason:
                            'backend_unavailable'
                    })
                }
            },
            [
                onDeviceNotReady,
                onSignedOut
            ]
        )


    // =======================================================
    // INITIAL LOAD
    // =======================================================

    useEffect(
        () => {
            void loadPermissions()
        },
        [
            loadPermissions
        ]
    )


    // =======================================================
    // BUILD SAFE UI CONTEXT
    // =======================================================

    const permissionContext =
        useMemo<
            UiPermissionContext | null
        >(
            () => {
                if (
                    state.status !==
                    'ready'
                ) {
                    return null
                }


                /*
                 * Convert server array → Set
                 *
                 * hasPermission() sẽ O(1)
                 * thay vì array.includes() khắp UI.
                 */
                const permissions =
                    new Set<
                        PermissionKey
                    >(
                        state.permissions
                    )


                return {
                    permissions,

                    hasPermission(
                        permission
                    ) {
                        return permissions
                            .has(permission)
                    }
                }
            },
            [
                state
            ]
        )


    // =======================================================
    // LOADING
    // =======================================================

    if (
        state.status ===
        'loading'
    ) {
        return (
            <main className="auth-page">
                <section className="auth-card auth-status-card">
                    <div className="auth-spinner" />

                    <p className="auth-eyebrow">
                        Phân quyền
                    </p>

                    <h1>
                        Đang tải quyền truy cập
                    </h1>

                    <p>
                        Đang xác minh các chức năng nhân viên được phép sử dụng.
                    </p>
                </section>
            </main>
        )
    }


    // =======================================================
    // UNAVAILABLE
    // =======================================================

    if (
        state.status ===
        'unavailable'
    ) {
        const description =
            state.reason ===
                'secure_storage_unavailable'
                ? 'Kho lưu trữ bảo mật của hệ điều hành hiện không khả dụng.'
                : 'Không thể kết nối máy chủ để xác minh quyền truy cập.'

        return (
            <main className="auth-page">
                <section className="auth-card auth-status-card">
                    <p className="auth-eyebrow">
                        Phân quyền
                    </p>

                    <h1>
                        Không thể xác minh quyền truy cập
                    </h1>

                    <p>
                        {description}
                    </p>

                    <p>
                        POS sẽ không mở các chức năng nghiệp vụ cho đến khi quyền được xác minh lại.
                    </p>

                    <button
                        type="button"
                        className="auth-primary-button"
                        onClick={() =>
                            void loadPermissions()
                        }
                    >
                        Thử lại
                    </button>
                </section>
            </main>
        )
    }


    // =======================================================
    // DEFENSIVE FALLBACK
    // =======================================================

    if (!permissionContext) {
        return (
            <main className="auth-page">
                <section className="auth-card auth-status-card">
                    <h1>
                        Không thể tạo Permission Context
                    </h1>

                    <button
                        type="button"
                        className="auth-primary-button"
                        onClick={() =>
                            void loadPermissions()
                        }
                    >
                        Thử lại
                    </button>
                </section>
            </main>
        )
    }


    // =======================================================
    // READY
    // =======================================================

    return (
        <>
            {
                children(
                    permissionContext
                )
            }
        </>
    )
}