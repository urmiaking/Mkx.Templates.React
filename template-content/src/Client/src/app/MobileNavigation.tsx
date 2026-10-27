import { Boxes, CheckCheck, Home, LogIn, Menu, Moon, Plus, Sun, UserRound, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import type { Mode } from '../shared/hooks/useTheme'

interface MobileNavigationProps {
  authenticated: boolean
  canViewWorkItems: boolean
  canManageWorkItems: boolean
  canViewUsers: boolean
  mode: Mode
  onToggleTheme: (source: HTMLElement) => void
  onOpenMenu: () => void
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  'mobile-navigation__item' + (isActive ? ' is-active' : '')

export function MobileNavigation({
  authenticated, canViewWorkItems, canManageWorkItems, canViewUsers,
  mode, onToggleTheme, onOpenMenu
}: MobileNavigationProps) {
  const canCreate = canViewWorkItems && canManageWorkItems

  return <nav className="mobile-navigation" aria-label="ناوبری موبایل">
    <NavLink to="/" end className={linkClass}>
      <Home size={23} aria-hidden="true"/><span>خانه</span>
    </NavLink>

    {canViewWorkItems
      ? <NavLink to="/work-items" className={linkClass}>
          <CheckCheck size={23} aria-hidden="true"/><span>نمونه‌ها</span>
        </NavLink>
      : <NavLink to="/components" className={linkClass}>
          <Boxes size={23} aria-hidden="true"/><span>اجزای UI</span>
        </NavLink>}

    <NavLink
      to={canCreate ? '/work-items?create=1' : authenticated ? '/account' : '/login'}
      className={({ isActive }) =>
        'mobile-navigation__item mobile-navigation__item--primary' + (isActive ? ' is-active' : '')
      }
    >
      <span className="mobile-navigation__action-circle">
        {canCreate ? <Plus size={29} aria-hidden="true"/>
          : authenticated ? <UserRound size={27} aria-hidden="true"/>
            : <LogIn size={27} aria-hidden="true"/>}
      </span>
      <span>{canCreate ? 'ثبت جدید' : authenticated ? 'حساب من' : 'ورود'}</span>
    </NavLink>

    {canViewUsers
      ? <NavLink to="/users" className={linkClass}>
          <Users size={23} aria-hidden="true"/><span>کاربران</span>
        </NavLink>
      : canViewWorkItems
        ? <NavLink to="/components" className={linkClass}>
            <Boxes size={23} aria-hidden="true"/><span>اجزای UI</span>
          </NavLink>
        : <button type="button" className="mobile-navigation__item"
            aria-label={mode === 'dark' ? 'فعال‌سازی حالت روشن' : 'فعال‌سازی حالت تاریک'}
            aria-pressed={mode === 'dark'}
            onClick={event => onToggleTheme(event.currentTarget)}>
            {mode === 'dark' ? <Sun size={23} aria-hidden="true"/> : <Moon size={23} aria-hidden="true"/>}
            <span>ظاهر</span>
          </button>}

    {canCreate
      ? <NavLink to="/account" className={linkClass}>
          <UserRound size={23} aria-hidden="true"/><span>حساب من</span>
        </NavLink>
      : <button type="button" className="mobile-navigation__item" onClick={onOpenMenu}
          aria-label="باز کردن منوی اصلی" aria-controls="workspace-navigation">
          <Menu size={23} aria-hidden="true"/><span>منو</span>
        </button>}
  </nav>
}
