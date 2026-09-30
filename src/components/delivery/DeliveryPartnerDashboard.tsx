import { useEffect, useState } from 'react'
import { CheckCircle2, Clock3, LogOut, MapPin, Navigation, Phone, Truck } from 'lucide-react'
import { deliveryApi, isApiConfigured } from '../../api/client'
import type { OrderDto, OrderStatus } from '../../types/api'
import './DeliveryPartnerDashboard.css'

type ViewStatus = 'Ready' | 'Out for delivery' | 'Delivered'
type ViewOrder = { id: string; orderId: number | null; customer: string; phone: string; address: string; slot: string; items: string; status: ViewStatus }
type Tab = 'active' | 'history'
const statusMap: Record<OrderStatus, ViewStatus | null> = { PLACED: 'Ready', CONFIRMED: 'Ready', OUT_FOR_DELIVERY: 'Out for delivery', DELIVERED: 'Delivered', CANCELLED: null }
const nextStatus: Record<'Ready' | 'Out for delivery', OrderStatus> = { Ready: 'OUT_FOR_DELIVERY', 'Out for delivery': 'DELIVERED' }
const toView = (order: OrderDto): ViewOrder | null => { const status = statusMap[order.status]; if (!status) return null; const item = order.items?.[0]; return { id: `#${order.order_id}`, orderId: order.order_id, customer: order.customer_name ?? 'Customer', phone: order.customer_phone ?? '', address: order.delivery_address, slot: order.delivery_slot ?? 'Slot pending', items: item ? `${item.product_name_en ?? `Product #${item.product_id}`} · ${order.items?.length ?? 1} item${(order.items?.length ?? 1) > 1 ? 's' : ''}` : 'Order items pending', status } }

export function DeliveryPartnerDashboard({ name, onLogout }: { name: string; onLogout: () => void }) {
  const [orders, setOrders] = useState<ViewOrder[]>([])
  const [loading, setLoading] = useState(isApiConfigured)
  const [tab, setTab] = useState<Tab>('active')
  const [error, setError] = useState('')
  const [locationState, setLocationState] = useState<'inactive' | 'active' | 'denied' | 'unavailable'>('inactive')
  useEffect(() => { if (!isApiConfigured) return; deliveryApi.assigned().then((items) => setOrders(items.map(toView).filter((item): item is ViewOrder => item !== null))).catch(() => setError('Could not load your deliveries.')).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    const activeOrders = orders.filter((order) => order.status === 'Out for delivery' && order.orderId != null)
    if (!activeOrders.length || !navigator.geolocation) { setLocationState(activeOrders.length ? 'unavailable' : 'inactive'); return }
    setLocationState('active')
    const lastSent = new Map<number, number>()
    const watchers = activeOrders.map((order) => navigator.geolocation.watchPosition((position) => {
      const orderId = order.orderId!
      const now = Date.now()
      if (now - (lastSent.get(orderId) ?? 0) < 10000) return
      lastSent.set(orderId, now)
      void deliveryApi.updateDeliveryLocation(orderId, position.coords.latitude, position.coords.longitude).catch(() => setLocationState('unavailable'))
    }, (geoError) => setLocationState(geoError.code === geoError.PERMISSION_DENIED ? 'denied' : 'unavailable'), { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }))
    return () => watchers.forEach((watcher) => navigator.geolocation.clearWatch(watcher))
  }, [orders])
  const updateStatus = async (order: ViewOrder) => { if (order.orderId == null || order.status === 'Delivered') return; const next = nextStatus[order.status]; const view = next === 'OUT_FOR_DELIVERY' ? 'Out for delivery' : 'Delivered'; setOrders((items) => items.map((item) => item.id === order.id ? { ...item, status: view } : item)); try { await deliveryApi.updateStatus(order.orderId, next) } catch { setOrders((items) => items.map((item) => item.id === order.id ? { ...item, status: order.status } : item)); setError('Could not update the order status.') } }
  const history = orders.filter((order) => order.status === 'Delivered')
  const visible = tab === 'history' ? history : orders.filter((order) => order.status !== 'Delivered')
  return <div className="partner-shell"><header className="partner-header"><img src="/logo.jpeg" alt="& SEA FISH" /><div className="partner-header-actions"><span className="partner-user"><span className="partner-avatar">{name.slice(0, 2).toUpperCase()}</span><span><strong>{name}</strong><small>Delivery partner</small></span></span><button type="button" onClick={onLogout}><LogOut size={16} /><span>Sign out</span></button></div></header><main className="partner-main"><section className="partner-welcome"><div><span className="eyebrow"><span className="live-dot" /> DELIVERY PARTNER</span><h1>Your route for today.</h1><p>Keep every order moving. You have {orders.length - history.length} active stops.</p></div></section><section className="partner-stats"><div><Truck size={18} /><span><strong>{orders.length}</strong><small>Assigned orders</small></span></div><div><Clock3 size={18} /><span><strong>{orders.filter((order) => order.status === 'Ready').length}</strong><small>Waiting for pickup</small></span></div><div><CheckCircle2 size={18} /><span><strong>{history.length}</strong><small>Delivered</small></span></div></section><div className="partner-section-heading"><div><h2>My deliveries</h2><p>Update each order as you complete the route.</p></div><span className={`route-status location-${locationState}`}><span /> {locationState === 'active' ? 'Location sharing active' : locationState === 'denied' ? 'Location sharing disabled' : locationState === 'unavailable' ? 'Location unavailable' : 'Location sharing inactive'}</span></div><div className="partner-tabs"><button type="button" className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Active deliveries <b>{orders.length - history.length}</b></button><button type="button" className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Delivery history <b>{history.length}</b></button></div>{error && <p className="catalog-notice">{error}</p>}{locationState === 'denied' && <p className="catalog-notice">Location permission is required to update your delivery location.</p>}{locationState === 'unavailable' && <p className="catalog-notice">Unable to get your current location. Retrying…</p>}{loading ? <p className="catalog-notice">Loading your route…</p> : visible.length === 0 ? <div className="partner-empty"><CheckCircle2 size={25} /><p>{tab === 'active' ? 'No active deliveries.' : 'No delivery history yet.'}</p></div> : <section className="partner-orders">{visible.map((order) => <article className="partner-order" key={order.id}><div className="partner-order-top"><span className="partner-order-id">{order.id}</span><span className={`partner-order-status ${order.status.toLowerCase().replaceAll(' ', '-')}`}>{order.status}</span></div><h3>{order.customer}</h3><p className="partner-items">{order.items}</p><div className="partner-order-details"><span><MapPin size={15} /> {order.address}</span><span><Clock3 size={15} /> {order.slot}</span>{order.phone && <a href={`tel:${order.phone}`}><Phone size={15} /> {order.phone}</a>}</div><div className="partner-order-actions">{order.status === 'Ready' && <button type="button" onClick={() => updateStatus(order)}><Navigation size={15} /> Start delivery</button>}{order.status === 'Out for delivery' && <button type="button" onClick={() => updateStatus(order)}><CheckCircle2 size={15} /> Mark delivered</button>}{order.status === 'Delivered' && <span className="delivered-label"><CheckCircle2 size={15} /> Delivered successfully</span>}</div></article>)}</section>}</main></div>
}
