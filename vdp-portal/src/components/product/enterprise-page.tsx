import type { ReactNode } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: ReactNode }) {
  return <div className="page-heading"><div><div className="page-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</div>
}

export function SummaryGrid({ children, columns = 4 }: { children: ReactNode; columns?: number }) {
  return <div className="summary-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{children}</div>
}

export function SummaryCard({ label, value, detail, tone = 'neutral', icon }: { label: string; value: ReactNode; detail: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; icon?: ReactNode }) {
  return <div className={`summary-card tone-${tone}`}><div className="summary-card-top"><span>{label}</span>{icon}</div><strong>{value}</strong><small>{detail}</small></div>
}

export function SectionCard({ title, description, action, children, className = '' }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`enterprise-card ${className}`}><div className="section-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</div>{children}</section>
}

export function DataToolbar({ placeholder = 'Tìm kiếm theo tên hoặc mã định danh', filters }: { placeholder?: string; filters?: ReactNode }) {
  return <div className="data-toolbar"><label className="search-field"><Search /><input aria-label={placeholder} placeholder={placeholder} /></label><div className="toolbar-filters"><SlidersHorizontal />{filters ?? <><button>Tất cả trạng thái</button><button>Workspace hiện tại</button></>}</div></div>
}

export function StatusChip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' }) {
  return <span className={`status-chip status-${tone}`}>{children}</span>
}

export function Tabs({ items, active = 0 }: { items: string[]; active?: number }) {
  return <div className="enterprise-tabs">{items.map((item, index) => <button className={index === active ? 'active' : ''} key={item}>{item}</button>)}</div>
}

export function Meter({ value, tone = 'info' }: { value: number; tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  return <div className="meter" aria-label={`${value}%`}><span className={`meter-${tone}`} style={{ width: `${Math.min(value, 100)}%` }} /></div>
}

export function Meta({ label, value }: { label: string; value: ReactNode }) {
  return <div className="meta-pair"><span>{label}</span><strong>{value}</strong></div>
}
