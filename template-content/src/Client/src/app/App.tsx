import { lazy, Suspense, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, CheckCheck, Menu, X, Palette as PaletteIcon, LogIn, LogOut, Moon, Sun, ArrowUpLeft, Github, ShieldCheck, Layers3, Code2, Boxes } from 'lucide-react'
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { authApi } from '../features/auth/auth.api'
const LoginPage = lazy(() => import('../features/auth/LoginPage').then(module => ({ default: module.LoginPage })))
const WorkItemsPage = lazy(() => import('../features/work-items/WorkItemsPage').then(module => ({ default: module.WorkItemsPage })))
const UsersPage = lazy(() => import('../features/users/UsersPage').then(module => ({ default: module.UsersPage })))
const ComponentsPage = lazy(() => import('../features/component-showcase/ComponentsPage').then(module => ({ default: module.ComponentsPage })))
import { policies } from '../features/users/users.api'
import { palettes } from '../shared/hooks/useTheme'
import { useTheme } from '../shared/hooks/useTheme'
import { Card } from '../shared/ui/Card'

function AccessDenied({ authenticated }: { authenticated: boolean }) {
  return <div className="page motion-enter"><Card className="content-card"><h1>دسترسی به این بخش محدود است</h1>
    <p className="muted">{authenticated ? 'مجوز لازم برای این صفحه را ندارید.' : 'ابتدا وارد حساب کاربری شوید.'}</p>
    <Link className="button button--secondary" to={authenticated ? '/' : '/login'}>{authenticated ? 'بازگشت' : 'ورود'}</Link>
  </Card></div>
}
function HomePage() {
  const features = [
    { icon: <Layers3 size={23}/>, title: 'معماری قابل توسعه', text: 'تفکیک Domain، Application، Infrastructure و API با قابلیت توسعه ویژگی‌محور' },
    { icon: <ShieldCheck size={23}/>, title: 'هویت و امنیت', text: 'Identity، کوکی HttpOnly، CSRF، محدودسازی نرخ ورود و خطاهای استاندارد API' },
    { icon: <Code2 size={23}/>, title: 'Agent-first', text: 'راهنمای روشن برای Agentها، قراردادها، تست و مسیر توسعه هر Feature' }
  ]
  return <div className="page home-page">
    <section className="hero motion-enter">
      <div className="hero-copy">
        <span className="hero-badge"><span className="status-dot"/> React 19 + ASP.NET Core 10</span>
        <h1>پایه‌ای مطمئن برای ساخت <span>محصول بعدی شما</span></h1>
        <p>یک نقطه شروع استاندارد، سبک و قابل شخصی‌سازی برای ساخت پنل‌های مدرن؛ از اولین کامپوننت تا انتشار یکپارچه.</p>
        <div className="hero-actions"><Link className="button button--primary" to="/work-items">مشاهده نمونه CRUD <ArrowUpLeft size={18}/></Link></div>
      </div>
      <div className="hero-art" aria-hidden="true"><span className="orb orb-one"/><span className="orb orb-two"/><div className="mini-app"><div className="mini-top"><i/><i/><i/></div><div className="mini-line long"/><div className="mini-line"/><div className="mini-row"><span/><span/><span/></div><div className="mini-line mid"/></div></div>
    </section>
    <div className="section-title motion-enter"><div><p className="eyebrow">طراحی شده برای توسعه</p><h2>اجزای اصلی معماری</h2></div></div>
    <div className="feature-grid">{features.map((feature,index) => <Card className="feature-card motion-enter" key={feature.title} style={{ animationDelay: String(index * 80) + 'ms' }}><div className="feature-icon">{feature.icon}</div><h3>{feature.title}</h3><p className="muted">{feature.text}</p></Card>)}</div>
    <div className="home-footer motion-enter"><span>آماده توسعه، بدون وابستگی به کتابخانه UI خاص</span><span>TypeScript · Vite · React Query · EF Core</span></div>
  </div>
}

export function App() {
  const { mode, palette, setPalette, toggle } = useTheme()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const queryClient = useQueryClient()
  const session = useQuery({ queryKey: ['session'], queryFn: authApi.me })
  const logout = useMutation({ mutationFn: authApi.logout, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session'] }) })
  const isAuthenticated = session.data?.authenticated === true
  const can = (permission: string) => isAuthenticated && (session.data?.permissions?.includes(permission) ?? false)

  return <div className="app-shell">
    <aside className={'sidebar ' + (menuOpen ? 'sidebar--open' : '')}>
      <div className="brand"><div className="brand-icon"><Layers3 size={24}/></div><div><strong>Mkx Workspace</strong><small>React Starter</small></div><button className="icon-button mobile-only" onClick={() => setMenuOpen(false)} aria-label="بستن منو"><X size={20}/></button></div>
      <nav aria-label="منوی اصلی" className="nav-items">
        <span className="nav-section">فضای کار</span>
        <NavLink to="/" end className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')} onClick={() => setMenuOpen(false)}><LayoutDashboard size={19}/>داشبورد</NavLink>
        {can(policies.workItemsView) && <NavLink to="/work-items" className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')} onClick={() => setMenuOpen(false)}><CheckCheck size={19}/>نمونه مدیریت کارها</NavLink>}
        <NavLink to="/components" className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')} onClick={() => setMenuOpen(false)}><Boxes size={19}/>کامپوننت‌های UI</NavLink>
        {can(policies.usersView) && <NavLink to="/users" className={({ isActive }) => 'nav-link ' + (isActive ? 'active' : '')} onClick={() => setMenuOpen(false)}><ShieldCheck size={19}/>مدیریت کاربران</NavLink>}
      </nav>
      <div className="sidebar-footer"><div className="sidebar-tip"><span className="status-dot"/><span>پایه توسعه آماده است</span></div><span className="version-label">MKX REACT · V0.1</span></div>
    </aside>
    {menuOpen && <button aria-label="بستن منو" className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}
    <div className="content-shell">
      <header className="app-header">
        <div className="header-start"><button className="icon-button mobile-only" aria-label="باز کردن منو" onClick={() => setMenuOpen(true)}><Menu size={22}/></button><span className="breadcrumb">فضای کار <span>/</span> {location.pathname === '/work-items' ? 'مدیریت کارها' : location.pathname === '/login' ? 'ورود' : location.pathname === '/users' ? 'مدیریت کاربران' : 'داشبورد'}</span></div>
        <div className="header-end">
          <div className="palette-anchor">
            <button className="icon-button palette-trigger" type="button" aria-label="انتخاب پالت رنگ" aria-expanded={paletteOpen}
              onClick={() => setPaletteOpen(v => !v)}><PaletteIcon size={19}/></button>
            {paletteOpen && <div className="palette-menu"><strong>رنگ اصلی</strong>
              <div className="palette-options" role="group" aria-label="رنگ‌بندی برنامه">
                {palettes.map(color => <button key={color} type="button" className={'palette-swatch palette-' + color}
                  title={color} aria-label={'پالت ' + color} aria-pressed={palette === color}
                  onClick={() => { setPalette(color); setPaletteOpen(false) }} />)}
              </div></div>}
          </div>
          <button className="icon-button theme-button" aria-label="تغییر تم" onClick={toggle}>{mode === 'dark' ? <Sun size={19}/> : <Moon size={19}/>}</button>
          {isAuthenticated ? <><span className="user-label" dir="ltr">{session.data?.email}</span><button className="icon-button" disabled={logout.isPending} aria-label="خروج" onClick={() => logout.mutate()}><LogOut size={19}/></button></> : <Link className="button button--secondary button--sm" to="/login"><LogIn size={16}/>ورود</Link>}
        </div>
      </header>
      <main id="main-content">
        <Suspense fallback={<div className="page" role="status">در حال بارگذاری...</div>}><Routes>
          <Route path="/" element={<HomePage/>}/>
          <Route path="/work-items" element={session.isPending ? <div className="page" role="status">در حال بررسی دسترسی...</div> :
            can(policies.workItemsView) ? <WorkItemsPage canManage={can(policies.workItemsManage)}/> : <AccessDenied authenticated={isAuthenticated}/>}/>
          <Route path="/users" element={session.isPending ? <div className="page" role="status">در حال بررسی دسترسی...</div> :
            can(policies.usersView) ? <UsersPage canManage={can(policies.usersManage)} canManageClaims={can(policies.usersManageClaims)}/> : <AccessDenied authenticated={isAuthenticated}/>}/>
          <Route path="/components" element={<ComponentsPage/>}/>
          <Route path="/login" element={<LoginPage/>}/>
          <Route path="*" element={<div className="page"><Card><h1>صفحه پیدا نشد</h1><Link to="/">بازگشت به داشبورد</Link></Card></div>}/>
        </Routes></Suspense>
      </main>
      <footer className="app-footer"><span>© Mkx Templates</span><span><Github size={14}/> توسعه‌پذیر و مستقل از UI Library</span></footer>
    </div>
  </div>
}
