import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Clock3, MapPin, PackageCheck, Phone, Plus, Truck, X } from 'lucide-react'
import { adminApi, deliveryApi, isApiConfigured } from '../../api/client'
import type { OrderDto } from '../../types/api'
import './DeliveryModule.css'

type Partner = { delivery_person_id: number; name: string }
type PartnerApi = Partial<Partner> & { user_id?: number; id?: number; full_name?: string }
type DeliveryStatus = 'Ready' | 'Out for delivery' | 'Delivered'
type Delivery = { id: number; order: string; customer: string; phone: string; address: string; slot: string; person: string; status: DeliveryStatus }
const toStatus = (status: OrderDto['status']): DeliveryStatus => status === 'DELIVERED' ? 'Delivered' : status === 'OUT_FOR_DELIVERY' ? 'Out for delivery' : 'Ready'
const toDelivery = (order: OrderDto, partnerNames = new Map<number, string>()): Delivery => ({ id: order.order_id, order: `#${order.order_id}`, customer: order.customer_name ?? 'Customer', phone: order.customer_phone ?? '', address: order.delivery_address, slot: order.delivery_slot ?? 'Slot pending', person: order.delivery_person_name ?? (order.delivery_person_id ? partnerNames.get(order.delivery_person_id) : undefined) ?? 'Unassigned', status: toStatus(order.status) })
const toPartner = (partner: PartnerApi): Partner => ({ delivery_person_id: partner.delivery_person_id ?? partner.user_id ?? partner.id ?? 0, name: partner.name ?? partner.full_name ?? 'Delivery partner' })

export function DeliveryModule({ onBack }: { onBack: () => void }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [orders, setOrders] = useState<OrderDto[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(isApiConfigured)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ orderId: '', partnerId: '' })

  useEffect(() => {
    if (!isApiConfigured) return
    Promise.all([adminApi.orders(), adminApi.deliveryPartners(), deliveryApi.assigned()]).then(([items, people, assigned]) => { const mappedPartners = (people as PartnerApi[]).map(toPartner).filter((partner) => partner.delivery_person_id > 0); const names = new Map(mappedPartners.map((partner) => [partner.delivery_person_id, partner.name])); setOrders(items); setPartners(mappedPartners); setDeliveries(assigned.map((order) => toDelivery(order, names))) }).catch(() => { setOrders([]); setPartners([]); setDeliveries([]) }).finally(() => setLoading(false))
  }, [])

  const assign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSaving(true); setError('')
    if (!form.orderId || !form.partnerId || Number(form.partnerId) <= 0) { setError('Please select both an order and a delivery partner.'); setSaving(false); return }
    try { await deliveryApi.assign(Number(form.orderId), Number(form.partnerId)); const items = await deliveryApi.assigned(); const names = new Map(partners.map((partner) => [partner.delivery_person_id, partner.name])); setDeliveries(items.map((order) => toDelivery(order, names))); setForm({ orderId: '', partnerId: '' }); setCreateOpen(false) }
    catch { setError('Could not assign this order. Please try again.') } finally { setSaving(false) }
  }

  const unassignedOrders = orders.filter((order) => order.status !== 'DELIVERED' && !deliveries.some((delivery) => delivery.id === order.order_id))
  return <section className="delivery-module"><div className="delivery-module-heading"><div><span className="eyebrow"><span className="live-dot" /> DELIVERY DESK</span><h2>Today&apos;s deliveries</h2><p>Assign routes and keep every order moving.</p></div><button type="button" className="delivery-create-button" onClick={() => setCreateOpen(true)}><Plus size={17} /> Assign delivery</button></div>{error && <p className="catalog-notice">{error}</p>}<div className="delivery-summary"><div><Truck size={18} /><span><strong>{deliveries.length}</strong> total routes</span></div><div><Clock3 size={18} /><span><strong>{deliveries.filter((item) => item.status === 'Ready').length}</strong> waiting for pickup</span></div><div><CheckCircle2 size={18} /><span><strong>{deliveries.filter((item) => item.status === 'Delivered').length}</strong> completed</span></div></div>{loading ? <p className="catalog-notice">Loading delivery orders…</p> : deliveries.length === 0 ? <div className="delivery-empty"><div className="empty-icon"><Truck size={28} /></div><h2>No delivery data</h2><p>Assigned deliveries will appear here when available.</p></div> : <div className="delivery-list">{deliveries.map((delivery) => <article className="delivery-card" key={delivery.id}><div className={`delivery-status ${delivery.status.toLowerCase().replaceAll(' ', '-')}`}>{delivery.status}</div><div className="delivery-card-main"><div className="delivery-order"><span>{delivery.order}</span><strong>{delivery.customer}</strong><small><Phone size={12} /> {delivery.phone}</small></div><div className="delivery-address"><MapPin size={16} /><span>{delivery.address}</span></div><div className="delivery-slot"><Clock3 size={15} /><span>{delivery.slot}</span></div><div className="delivery-person"><span className="delivery-avatar">{delivery.person.slice(0, 2).toUpperCase()}</span><span><small>Assigned to</small><strong>{delivery.person}</strong></span></div></div></article>)}</div>}<button type="button" className="back-to-overview" onClick={onBack}><PackageCheck size={16} /> Back to overview</button>{createOpen && <div className="delivery-modal-backdrop" onClick={() => setCreateOpen(false)}><section className="delivery-modal" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">DELIVERY DESK · ASSIGN ORDER</span><h2>Assign delivery</h2><p>Select an order and delivery partner.</p></div><button type="button" className="icon-button" onClick={() => setCreateOpen(false)} aria-label="Close"><X size={19} /></button></header><form onSubmit={assign}><label className="delivery-full-field"><span>Order</span><select required value={form.orderId} onChange={(event) => setForm({ ...form, orderId: event.target.value })}><option value="">Select an order</option>{unassignedOrders.map((order) => <option key={order.order_id} value={order.order_id}>#{order.order_id} · {order.customer_name ?? 'Customer'} · {order.delivery_address}</option>)}</select></label><label className="delivery-full-field"><span>Delivery partner</span><select required value={form.partnerId} onChange={(event) => setForm({ ...form, partnerId: event.target.value })}><option value="">Select partner</option>{partners.map((partner) => <option key={partner.delivery_person_id} value={partner.delivery_person_id}>{partner.name}</option>)}</select></label><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button type="submit" disabled={saving || !unassignedOrders.length || !partners.length}><CheckCircle2 size={16} /> {saving ? 'Assigning…' : 'Assign order'}</button></footer></form></section></div>}</section>
}
