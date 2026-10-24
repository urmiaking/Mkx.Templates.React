import type { ReactNode } from 'react'
import { ArrowRight, Layers3, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ThemeButton, type AppearanceControls } from '../shared/ui/ThemeControls'

type Props = Pick<AppearanceControls, 'mode' | 'toggle'> & { children: ReactNode }

export function IdentityLayout({ mode, toggle, children }: Props) {
  return <div className="identity-shell">
    <div className="identity-glow identity-glow-one" aria-hidden="true"/>
    <div className="identity-glow identity-glow-two" aria-hidden="true"/>
    <header className="identity-header">
      <Link to="/" className="identity-brand" aria-label="بازگشت به فضای کار">
        <span className="identity-brand-icon"><Layers3 size={23}/></span>
        <span><strong>Mkx Workspace</strong><small>React Starter</small></span>
      </Link>
      <div className="identity-header-actions">
        <Link to="/" className="identity-home-link"><ArrowRight size={17}/> فضای کار</Link>
        <ThemeButton mode={mode} toggle={toggle}/>
      </div>
    </header>
    <main className="identity-main" id="main-content">
      <div className="identity-heading motion-enter">
        <span className="identity-eyebrow"><ShieldCheck size={16}/> ورود امن</span>
        <p>خوش آمدید به فضای کار شما</p>
      </div>
      {children}
    </main>
    <footer className="identity-footer"><span>© Mkx Templates</span><span>طراحی‌شده برای تجربه‌ای امن و روان</span></footer>
  </div>
}
