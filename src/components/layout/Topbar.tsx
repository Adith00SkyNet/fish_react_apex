import { Bell, Menu, ShoppingCart } from 'lucide-react'

type TopbarProps = { activeNav: string; cartCount: number; onMenuToggle: () => void; onCartOpen: () => void }

export function Topbar({ activeNav, cartCount, onMenuToggle, onCartOpen }: TopbarProps) {
  return <header className="topbar"><button type="button" className="icon-button menu-button" onClick={onMenuToggle} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div><div className="top-actions"><button type="button" className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button><button type="button" className="cart-button" onClick={onCartOpen}><ShoppingCart size={18} /><span>Cart</span>{cartCount > 0 && <b>{cartCount}</b>}</button></div></header>
}