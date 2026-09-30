import { ChevronDown, ClipboardList, FolderTree, LayoutDashboard, LogOut, ShoppingBasket, Sparkles, Truck, Users } from 'lucide-react'
import type { NavItem } from '../../types/product'

type SidebarProps = { activeNav: string; menuOpen: boolean; onNavigate: (label: string) => void; onLogout: () => void }

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Orders', icon: ClipboardList },
  { label: 'Deliveries', icon: Truck },
  { label: 'Delivery team', icon: Users },
  { label: 'Products', icon: ShoppingBasket },
  { label: 'Categories', icon: FolderTree },
  { label: 'Price lists', icon: ClipboardList },
]

export function Sidebar({ activeNav, menuOpen, onNavigate, onLogout }: SidebarProps) {
  return <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
    <div className="brand"><img className="app-logo" src="/logo.jpeg" alt="DELFISH" /></div>
    <div className="store-switcher"><span className="status-dot" /> <span>Alappuzha store</span><ChevronDown size={14} /></div>
    <nav className="main-nav" aria-label="Main navigation"><p className="nav-label">Workspace</p>{navItems.map((item, index) => { const Icon = item.icon; return <div key={item.label}>{index === 3 && <p className="nav-label catalog-label">Catalog</p>}<button type="button" className={`nav-item ${activeNav === item.label ? 'active' : ''}`} onClick={() => onNavigate(item.label)}><Icon size={18} /> <span>{item.label}</span>{item.label === 'Orders' && <b>12</b>}</button></div> })}</nav>
    <div className="sidebar-bottom"><div className="help-card"><Sparkles size={17} /><div><strong>Fresh products, better days.</strong><span>Tuesday delivery is open</span></div></div><div className="profile"><span className="avatar">AR</span><span><strong>Arjun R.</strong><small>Administrator</small></span><button type="button" className="logout-button" onClick={onLogout} aria-label="Sign out"><LogOut size={15} /></button></div></div>
  </aside>
}
