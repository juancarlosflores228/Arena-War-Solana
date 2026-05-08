import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'

export default function Footer() {
  const { t } = useLang()
  return (
    <footer className="border-t border-arena-border/40 bg-arena-surface/50 py-8 mt-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-widest">
              ARENA<span className="text-arena-red">WAR</span>
            </span>
            <span className="font-body text-xs text-arena-muted">/ {t.footer.network}</span>
          </div>
          <div className="flex items-center gap-6">
            {[
              { label: t.nav.arena,     to: '/'          },
              { label: t.nav.create,    to: '/create'    },
              { label: t.nav.dashboard, to: '/dashboard' },
            ].map(({ label, to }) => (
              <Link key={to} to={to} className="font-body text-xs text-arena-muted hover:text-arena-text transition-colors tracking-widest">
                {label}
              </Link>
            ))}
          </div>
          <span className="font-body text-xs text-arena-muted/40 tracking-wider">© 2025 Arena War</span>
        </div>
      </div>
    </footer>
  )
}