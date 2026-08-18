import React, { useEffect, useState } from 'react'
import type { DesktopAuthState } from '../../../../shared/auth-api'
import { OverviewDashboard } from '../admin/OverviewDashboard'
import { ReportsScreen } from '../admin/ReportsScreen'
import { InvoicesHistoryScreen } from '../admin/InvoicesHistoryScreen'
import { ProductsManagementScreen } from '../admin/ProductsManagementScreen'
import { StaffManagementScreen } from '../staff/StaffManagementScreen'
import { RolesManagementScreen } from '../admin/RolesManagementScreen'
import { CustomersManagementScreen } from '../admin/CustomersManagementScreen'
import { StoreSettingsScreen } from '../admin/StoreSettingsScreen'

interface DashboardLayoutProps {
  authState: DesktopAuthState
  onLogout: () => void
}

type AdminViewKey =
  | 'overview'
  | 'reports_revenue'
  | 'reports_products'
  | 'reports_staff'
  | 'invoices_sales'
  | 'products_list'
  | 'products_menu'
  | 'products_categories'
  | 'staff_list'
  | 'staff_roles'
  | 'customers_list'
  | 'customers_groups'
  | 'settings'

interface NavGroup {
  key: string
  label: string
  icon: string
  children?: Array<{
    key: AdminViewKey
    label: string
    icon: string
  }>
}

export function DashboardLayout({ authState, onLogout }: DashboardLayoutProps): React.JSX.Element {
  const [activeView, setActiveView] = useState<AdminViewKey>('overview')
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString('vi-VN'))
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  // Track which accordion sections are expanded in the sidebar
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    reports: true,
    invoices: true,
    products: true,
    staff: true,
    customers: true
  })

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const user = authState.status === 'authenticated' ? authState.user : null
  const store = authState.status === 'authenticated' ? authState.store : null

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
  }

  // Define sidebar menu structure according to exact user requirements
  const menuGroups: NavGroup[] = [
    {
      key: 'overview',
      label: 'Tổng quan',
      icon: '📊'
      // No children for Overview
    },
    {
      key: 'reports',
      label: 'Báo cáo',
      icon: '📈',
      children: [
        { key: 'reports_revenue', label: 'Báo cáo doanh thu', icon: '💰' },
        { key: 'reports_products', label: 'Báo cáo mặt hàng', icon: '📦' },
        { key: 'reports_staff', label: 'Báo cáo nhân viên', icon: '👥' }
      ]
    },
    {
      key: 'invoices',
      label: 'Hóa đơn',
      icon: '🧾',
      children: [
        { key: 'invoices_sales', label: 'Hóa đơn bán hàng', icon: '📑' }
      ]
    },
    {
      key: 'products',
      label: 'Mặt hàng',
      icon: '🍽️',
      children: [
        { key: 'products_list', label: 'Danh sách mặt hàng', icon: '📦' },
        { key: 'products_menu', label: 'Thực đơn', icon: '🍽️' },
        { key: 'products_categories', label: 'Danh mục', icon: '📑' }
      ]
    },
    {
      key: 'staff',
      label: 'Nhân viên',
      icon: '👥',
      children: [
        { key: 'staff_list', label: 'Danh sách nhân viên', icon: '👤' },
        { key: 'staff_roles', label: 'Vai trò nhân viên', icon: '🛡️' }
      ]
    },
    {
      key: 'customers',
      label: 'Khách hàng',
      icon: '🤝',
      children: [
        { key: 'customers_list', label: 'Danh sách khách hàng', icon: '👥' },
        { key: 'customers_groups', label: 'Nhóm khách hàng', icon: '👑' }
      ]
    }
  ]

  return (
    <div className={`admin-layout-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Modern Left Sidebar */}
      <aside className="admin-sidebar">
        {/* Brand Header */}
        <div className="admin-sidebar-brand">
          <div className="admin-brand-icon">🎱</div>
          {!isSidebarCollapsed && (
            <div className="admin-brand-info">
              <span className="admin-brand-title">Billiard POS</span>
              <span className="admin-brand-badge">Quản Trị</span>
            </div>
          )}
        </div>

        {/* Store Context Badge */}
        {!isSidebarCollapsed && (
          <div className="admin-sidebar-store">
            <div className="store-status-dot"></div>
            <div className="store-text-box">
              <strong>{store?.name || 'Billiard Club Sài Gòn'}</strong>
              <small>Mã quán: {store?.slug || 'SG01'}</small>
            </div>
          </div>
        )}

        {/* Navigation Menu with Accordion Dropdowns */}
        <nav className="admin-sidebar-nav">
          {menuGroups.map((group) => {
            // Case 1: Single item without children (Tổng quan)
            if (!group.children || group.children.length === 0) {
              return (
                <button
                  key={group.key}
                  type="button"
                  className={`admin-nav-btn ${activeView === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveView('overview')}
                  title={isSidebarCollapsed ? group.label : undefined}
                >
                  <span className="nav-btn-icon">{group.icon}</span>
                  {!isSidebarCollapsed && (
                    <span className="nav-btn-label" style={{ fontWeight: 700 }}>
                      {group.label}
                    </span>
                  )}
                  {activeView === 'overview' && <span className="nav-active-indicator"></span>}
                </button>
              )
            }

            // Case 2: Group with dropdown children
            const isExpanded = !!expandedGroups[group.key]
            const isChildActive = group.children.some((c) => c.key === activeView)

            return (
              <div key={group.key} className="admin-nav-group-wrapper">
                <button
                  type="button"
                  className={`admin-nav-group-header ${isChildActive ? 'child-active' : ''}`}
                  onClick={() => toggleGroup(group.key)}
                  title={isSidebarCollapsed ? group.label : undefined}
                >
                  <div className="group-header-left">
                    <span className="nav-btn-icon">{group.icon}</span>
                    {!isSidebarCollapsed && (
                      <span className="group-header-label">{group.label}</span>
                    )}
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="group-chevron-icon">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  )}
                </button>

                {/* Submenu Dropdown Items */}
                {isExpanded && !isSidebarCollapsed && (
                  <div className="admin-nav-submenu">
                    {group.children.map((child) => (
                      <button
                        key={child.key}
                        type="button"
                        className={`admin-nav-subitem-btn ${activeView === child.key ? 'active' : ''}`}
                        onClick={() => setActiveView(child.key)}
                      >
                        <span className="subitem-icon">{child.icon}</span>
                        <span className="subitem-label">{child.label}</span>
                        {activeView === child.key && <span className="subitem-active-dot"></span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Sidebar Footer Collapse Toggle */}
        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="admin-collapse-toggle-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            <span>{isSidebarCollapsed ? '⏩' : '⏪'}</span>
            {!isSidebarCollapsed && <span>Thu gọn thanh bên</span>}
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="admin-main-area">
        {/* Top Header Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <div className="status-pill-open">
              <span className="live-dot"></span>
              <span>Đang mở cửa</span>
            </div>
            <div className="topbar-clock">
              <span>⏰ {currentTime}</span>
            </div>
          </div>

          <div className="admin-topbar-right">
            {/* Quick Action Buttons */}
            <div className="quick-actions-bar">
              <button
                type="button"
                className="topbar-action-btn"
                onClick={() => setActiveView('reports_revenue')}
                title="Xem báo cáo doanh thu"
              >
                📊 Doanh thu
              </button>
              <button
                type="button"
                className="topbar-action-btn"
                onClick={() => setActiveView('products_list')}
                title="Danh sách mặt hàng"
              >
                📦 Mặt hàng
              </button>
              <button
                type="button"
                className="topbar-action-btn"
                onClick={() => setActiveView('staff_list')}
                title="Quản lý nhân viên"
              >
                👥 Nhân sự
              </button>
            </div>

            {/* User Profile Dropdown */}
            <div className="admin-user-dropdown-container">
              <button
                type="button"
                className="admin-user-profile-btn"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <div className="admin-user-avatar">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="admin-user-meta">
                  <span className="admin-user-name">{user?.displayName || 'Chủ quán'}</span>
                  <span className="admin-user-role">{user?.roleName || 'Chủ cửa hàng'}</span>
                </div>
                <span className="dropdown-arrow-icon">{isUserDropdownOpen ? '▲' : '▼'}</span>
              </button>

              {isUserDropdownOpen && (
                <div className="admin-user-dropdown-menu">
                  <div className="dropdown-menu-header">
                    <strong>{user?.displayName || 'Quản trị viên'}</strong>
                    <small>{user?.username || 'admin'}</small>
                    <span className="badge-role-owner">👑 {user?.roleName || 'Chủ quán'}</span>
                  </div>

                  <div className="dropdown-menu-divider"></div>

                  <button
                    type="button"
                    className="dropdown-menu-item"
                    onClick={() => {
                      setActiveView('settings')
                      setIsUserDropdownOpen(false)
                    }}
                  >
                    <span>⚙️ Cài đặt cửa hàng</span>
                  </button>

                  <button
                    type="button"
                    className="dropdown-menu-item"
                    onClick={() => {
                      setActiveView('staff_list')
                      setIsUserDropdownOpen(false)
                    }}
                  >
                    <span>👥 Quản lý tài khoản</span>
                  </button>

                  <div className="dropdown-menu-divider"></div>

                  <button
                    type="button"
                    className="dropdown-menu-item item-logout"
                    onClick={() => {
                      setIsUserDropdownOpen(false)
                      onLogout()
                    }}
                  >
                    <span>🚪 Đăng xuất khỏi hệ thống</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Body View Router */}
        <main className="admin-content-body">
          {/* 1. Tổng quan */}
          {activeView === 'overview' && <OverviewDashboard />}

          {/* 2. Báo cáo */}
          {activeView === 'reports_revenue' && <ReportsScreen subType="revenue" />}
          {activeView === 'reports_products' && <ReportsScreen subType="products" />}
          {activeView === 'reports_staff' && <ReportsScreen subType="staff" />}

          {/* 3. Hóa đơn */}
          {activeView === 'invoices_sales' && <InvoicesHistoryScreen />}

          {/* 4. Mặt hàng */}
          {activeView === 'products_list' && <ProductsManagementScreen subType="list" />}
          {activeView === 'products_menu' && <ProductsManagementScreen subType="menu" />}
          {activeView === 'products_categories' && <ProductsManagementScreen subType="categories" />}

          {/* 5. Nhân viên */}
          {activeView === 'staff_list' && <StaffManagementScreen />}
          {activeView === 'staff_roles' && <RolesManagementScreen />}

          {/* 6. Khách hàng */}
          {activeView === 'customers_list' && <CustomersManagementScreen subType="list" />}
          {activeView === 'customers_groups' && <CustomersManagementScreen subType="groups" />}

          {/* 7. Cài đặt (Optional quick settings) */}
          {activeView === 'settings' && <StoreSettingsScreen />}
        </main>
      </div>
    </div>
  )
}
