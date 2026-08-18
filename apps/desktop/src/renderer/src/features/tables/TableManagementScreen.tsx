import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from 'react'

import type {
    TableConfigurationResponse
} from '@billiards/contracts'

import type {
    UiPermissionContext
} from '../permissions/PermissionGate'

import './table-management.css'
interface TableManagementScreenProps {
    permissionContext:
    UiPermissionContext

    onSignedOut:
    () => void | Promise<void>

    onDeviceNotReady:
    () => void | Promise<void>
}


type TableScreenState =
    | {
        status:
        'loading'
    }
    | {
        status:
        'ready'

        configuration:
        TableConfigurationResponse
    }
    | {
        status:
        'error'

        message:
        string
    }


export function TableManagementScreen({
    permissionContext,
    onSignedOut,
    onDeviceNotReady
}: TableManagementScreenProps):
    React.JSX.Element {
    const [
        state,
        setState
    ] =
        useState<TableScreenState>({
            status:
                'loading'
        })


    const canView =
        permissionContext
            .hasPermission(
                'table.view'
            )


    const canManage =
        permissionContext
            .hasPermission(
                'table.manage'
            )


    const loadConfiguration =
        useCallback(
            async () => {
                /*
                 * Renderer permission = UX only.
                 *
                 * Worker vẫn enforce table.view.
                 */
                if (
                    !canView
                ) {
                    return
                }


                setState({
                    status:
                        'loading'
                })


                try {
                    const result =
                        await window
                            .desktopApi
                            .tables
                            .getConfiguration()


                    if (
                        result.ok
                    ) {
                        setState({
                            status:
                                'ready',

                            configuration:
                                result.value
                        })

                        return
                    }


                    switch (
                    result.error
                    ) {
                        case 'device_not_ready':
                            setState({
                                status:
                                    'error',
                                message:
                                    'Thiết bị POS chưa kích hoạt khóa phần cứng hoặc đang ở chế độ ngoại tuyến.'
                            })
                            return

                        case 'permission_denied':
                            setState({
                                status:
                                    'error',

                                message:
                                    'Bạn không có quyền xem hoặc quản lý cấu hình bàn.'
                            })
                            return


                        case 'secure_storage_unavailable':
                            setState({
                                status:
                                    'error',

                                message:
                                    'Kho lưu trữ bảo mật của hệ điều hành hiện không khả dụng.'
                            })

                            return


                        case 'backend_unavailable':
                        default:
                            setState({
                                status:
                                    'error',

                                message:
                                    'Không thể tải dữ liệu bàn. Vui lòng kiểm tra kết nối.'
                            })
                    }
                } catch (
                error
                ) {
                    console.error(
                        'Failed to load table configuration:',
                        error
                    )


                    setState({
                        status:
                            'error',

                        message:
                            'Không thể tải dữ liệu bàn.'
                    })
                }
            },
            [
                canView,
                onDeviceNotReady,
                onSignedOut
            ]
        )


    useEffect(
        () => {
            if (
                canView
            ) {
                void loadConfiguration()
            }
        },
        [
            canView,
            loadConfiguration
        ]
    )


    const typeById =
        useMemo(
            () => {
                if (
                    state.status !==
                    'ready'
                ) {
                    return new Map()
                }


                return new Map(
                    state.configuration
                        .tableTypes
                        .map(
                            (
                                type
                            ) => [
                                    type.id,
                                    type
                                ]
                        )
                )
            },
            [
                state
            ]
        )


    if (
        !canView
    ) {
        return (
            <div className="table-page">
                <section className="table-status-card">
                    <p className="table-eyebrow">
                        Quản lý bàn
                    </p>

                    <h1>
                        Không có quyền truy cập
                    </h1>

                    <p>
                        Tài khoản hiện tại không có quyền xem bàn.
                    </p>
                </section>
            </div>
        )
    }


    if (
        state.status ===
        'loading'
    ) {
        return (
            <main className="table-page">
                <section className="table-status-card">
                    <div className="table-spinner" />

                    <p className="table-eyebrow">
                        Quản lý bàn
                    </p>

                    <h1>
                        Đang tải danh sách bàn
                    </h1>

                    <p>
                        Đang đồng bộ cấu hình bàn từ cửa hàng...
                    </p>
                </section>
            </main>
        )
    }


    if (
        state.status ===
        'error'
    ) {
        return (
            <main className="table-page">
                <section className="table-status-card">
                    <p className="table-eyebrow">
                        Quản lý bàn
                    </p>

                    <h1>
                        Không thể tải bàn
                    </h1>

                    <p>
                        {state.message}
                    </p>

                    <button
                        type="button"
                        onClick={
                            () =>
                                void loadConfiguration()
                        }
                    >
                        Thử lại
                    </button>
                </section>
            </main>
        )
    }


    const {
        tableTypes,
        tables
    } =
        state.configuration


    return (
        <main className="table-page">
            <header className="table-page-header">
                <div>
                    <p className="table-eyebrow">
                        Vận hành cửa hàng
                    </p>

                    <h1>
                        Quản lý bàn
                    </h1>

                    <p>
                        {
                            tables.length
                        } bàn · {
                            tableTypes.length
                        } loại bàn
                    </p>
                </div>

                <div className="table-header-actions">
                    <button
                        type="button"
                        onClick={
                            () =>
                                void loadConfiguration()
                        }
                    >
                        Làm mới
                    </button>

                    {
                        canManage && (
                            <button
                                type="button"
                                disabled
                                title="Sẽ mở ở M1.4-E2-B"
                            >
                                + Thêm bàn
                            </button>
                        )
                    }
                </div>
            </header>


            {
                tableTypes.length === 0 &&
                    tables.length === 0
                    ? (
                        <section className="table-empty-state">
                            <h2>
                                Chưa có bàn
                            </h2>

                            <p>
                                Cửa hàng chưa được cấu hình loại bàn và bàn.
                            </p>

                            {
                                canManage && (
                                    <p>
                                        Chức năng tạo loại bàn và bàn sẽ được nối ở bước tiếp theo.
                                    </p>
                                )
                            }
                        </section>
                    )
                    : (
                        <>
                            <section className="table-types-section">
                                <div className="table-section-heading">
                                    <h2>
                                        Loại bàn
                                    </h2>

                                    <span>
                                        {
                                            tableTypes.length
                                        }
                                    </span>
                                </div>

                                <div className="table-type-list">
                                    {
                                        tableTypes.map(
                                            (
                                                type
                                            ) => (
                                                <article
                                                    key={
                                                        type.id
                                                    }
                                                    className="table-type-card"
                                                >
                                                    <span
                                                        className="table-type-color"
                                                        style={{
                                                            backgroundColor:
                                                                type.colorHex
                                                        }}
                                                    />

                                                    <div>
                                                        <strong>
                                                            {type.name}
                                                        </strong>

                                                        <small>
                                                            {
                                                                type.status ===
                                                                    'active'
                                                                    ? 'Đang hoạt động'
                                                                    : 'Đã vô hiệu hóa'
                                                            }
                                                        </small>
                                                    </div>
                                                </article>
                                            )
                                        )
                                    }
                                </div>
                            </section>


                            <section className="tables-section">
                                <div className="table-section-heading">
                                    <h2>
                                        Danh sách bàn
                                    </h2>

                                    <span>
                                        {
                                            tables.length
                                        }
                                    </span>
                                </div>


                                {
                                    tables.length === 0
                                        ? (
                                            <div className="table-empty-state">
                                                Chưa có bàn nào.
                                            </div>
                                        )
                                        : (
                                            <div className="table-grid">
                                                {
                                                    tables.map(
                                                        (
                                                            table
                                                        ) => {
                                                            const type =
                                                                typeById.get(
                                                                    table.tableTypeId
                                                                )


                                                            return (
                                                                <article
                                                                    key={
                                                                        table.id
                                                                    }
                                                                    className="billiard-table-card"
                                                                >
                                                                    <div className="billiard-table-card-top">
                                                                        <span
                                                                            className="table-type-color"
                                                                            style={{
                                                                                backgroundColor:
                                                                                    type?.colorHex ??
                                                                                    '#6B7280'
                                                                            }}
                                                                        />

                                                                        <span
                                                                            className={
                                                                                table.status ===
                                                                                    'active'
                                                                                    ? 'table-status table-status-active'
                                                                                    : 'table-status table-status-disabled'
                                                                            }
                                                                        >
                                                                            {
                                                                                table.status ===
                                                                                    'active'
                                                                                    ? 'Hoạt động'
                                                                                    : 'Vô hiệu hóa'
                                                                            }
                                                                        </span>
                                                                    </div>


                                                                    <h3>
                                                                        {table.name}
                                                                    </h3>

                                                                    <p>
                                                                        {
                                                                            type?.name ??
                                                                            'Không xác định'
                                                                        }
                                                                    </p>


                                                                    {
                                                                        canManage && (
                                                                            <button
                                                                                type="button"
                                                                                disabled
                                                                                title="Sẽ mở ở M1.4-E2-B"
                                                                            >
                                                                                Quản lý
                                                                            </button>
                                                                        )
                                                                    }
                                                                </article>
                                                            )
                                                        }
                                                    )
                                                }
                                            </div>
                                        )
                                }
                            </section>
                        </>
                    )
            }
        </main>
    )
}