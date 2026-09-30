import { useState } from 'react'
import { Plus } from 'lucide-react'
import { AuthPage } from './components/auth/AuthPage'
import { CartDrawer } from './components/cart/CartDrawer'
import { CatalogSection } from './components/catalog/CatalogSection'
import { AddCatchForm } from './components/catalog/AddCatchForm'
import { UserDashboard } from './components/customer/UserDashboard'
import { DeliveryModule } from './components/delivery/DeliveryModule'
import { DeliveryPartnerDashboard } from './components/delivery/DeliveryPartnerDashboard'
import { OrdersOverview } from './components/admin/OrdersOverview'
import { PriceListImport } from './components/admin/PriceListImport'
import { DeliveryPartners } from './components/admin/DeliveryPartners'
import { CategoriesManagement } from './components/admin/CategoriesManagement'
import { DeckNote } from './components/dashboard/DeckNote'
import { OrderPulse } from './components/dashboard/OrderPulse'
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { useAuth } from './context/AuthContext'
import { useCart } from './context/CartContext'
import type { Product } from './types/product'
import './App.css'
import './brand.css'

function App() {
  const { user, logout } = useAuth()
  const { count, isOpen, open, close, add } = useCart()
  const [activeNav, setActiveNav] = useState('Overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [addCatchOpen, setAddCatchOpen] = useState(false)
  const [additionalProducts, setAdditionalProducts] = useState<Product[]>([])

  const handleNavigate = (label: string) => {
    setActiveNav(label)
    setMenuOpen(false)
  }

  const handleSaveCatch = (product: Product) => {
    setAdditionalProducts((current) => [...current, product])
    setAddCatchOpen(false)
  }

  const showCatalog = activeNav === 'Overview' || activeNav === 'Products'

  if (!user) return <AuthPage />
  if (user.role === 'DELIVERY') return <DeliveryPartnerDashboard name={user.name} onLogout={logout} />
  if (user.role !== 'ADMIN') return <UserDashboard name={user.name} onLogout={logout} />

  return <div className="app-shell">
    <Sidebar activeNav={activeNav} menuOpen={menuOpen} onNavigate={handleNavigate} onLogout={logout} />
    <main className="content">
      <Topbar activeNav={activeNav} cartCount={count} onMenuToggle={() => setMenuOpen((menuIsOpen) => !menuIsOpen)} onCartOpen={open} />
      <div className="page-wrap">
        <section className="intro-row"><div><div className="eyebrow"><span className="live-dot" /> LIVE CATALOG <span className="eyebrow-divider" /> TUESDAY, 24 JUNE 2025</div><h1>Good morning, {user.name.split(' ')[0]}.</h1><p className="intro-copy">The coast is generous today. Build your next delivery from the freshest products.</p></div><button type="button" className="outline-button" onClick={() => setAddCatchOpen(true)}><Plus size={17} /> Add new product</button></section>
        {activeNav === 'Deliveries' ? <DeliveryModule onBack={() => handleNavigate('Overview')} />
          : activeNav === 'Orders' ? <OrdersOverview />
          : activeNav === 'Price lists' ? <PriceListImport />
          : activeNav === 'Delivery team' ? <DeliveryPartners />
          : activeNav === 'Categories' ? <CategoriesManagement />
          : showCatalog ? <CatalogSection additionalProducts={additionalProducts} onAddToCart={add} admin={activeNav === 'Products'} />
          : null}
        {(activeNav === 'Overview' || activeNav === 'Products') && <section className="lower-grid"><OrderPulse /><DeckNote /></section>}
      </div>
    </main>
    {isOpen && <CartDrawer onClose={close} />}
    {addCatchOpen && <AddCatchForm onClose={() => setAddCatchOpen(false)} onSave={handleSaveCatch} />}
  </div>
}

export default App
