import { useState } from 'react'
import { LogOut, ShoppingCart } from 'lucide-react'
import { CartDrawer } from '../cart/CartDrawer'
import { CatalogSection } from '../catalog/CatalogSection'
import { OrderHistory } from '../orders/OrderHistory'
import { useCart } from '../../context/CartContext'
import './UserDashboard.css'

type UserDashboardProps = { name: string; onLogout: () => void }
type Tab = 'shop' | 'orders'

export function UserDashboard({ name, onLogout }: UserDashboardProps) {
  const { count, isOpen, open, close, add } = useCart()
  const [tab, setTab] = useState<Tab>('shop')

  return <div className="customer-shell">
    <header className="customer-header">
      <div className="customer-brand"><img src="/logo.jpeg" alt="& SEA FISH" /></div>
      <div className="customer-actions">
        <span className="customer-greeting">Hello, <strong>{name}</strong></span>
        <button type="button" className="customer-cart" onClick={open}><ShoppingCart size={18} /><span>Basket</span>{count > 0 && <b>{count}</b>}</button>
        <button type="button" className="customer-logout" onClick={onLogout}><LogOut size={16} /><span>Sign out</span></button>
      </div>
    </header>
    <main className="customer-main">
      <section className="customer-hero">
        <div><span className="eyebrow"><span className="live-dot" /> TODAY&apos;S PRODUCTS</span><h1>Fresh from the coast<br />to your kitchen.</h1><p>Choose your favourites and we&apos;ll deliver them this afternoon.</p></div>
        <div className="customer-delivery"><span>DELIVERY WINDOW</span><strong>Today, 2:00 – 5:00 PM</strong><small>COD available</small></div>
      </section>
      <div className="customer-tabs">
        <button type="button" className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>Shop</button>
        <button type="button" className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>My orders</button>
      </div>
      {tab === 'shop' ? <CatalogSection onAddToCart={add} /> : <OrderHistory />}
    </main>
    {isOpen && <CartDrawer onClose={close} />}
  </div>
}
