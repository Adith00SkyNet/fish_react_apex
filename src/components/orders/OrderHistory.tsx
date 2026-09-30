import { useEffect, useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { isApiConfigured, orderApi } from '../../api/client'
import type { OrderDto, OrderStatus } from '../../types/api'
import { formatPrice } from '../../utils/format'
import './OrderHistory.css'
import { alertSuccess, confirmAction } from '../../utils/alerts'
import { OrderTracking } from './OrderTracking'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export function OrderHistory() {
  const [orders, setOrders] = useState<OrderDto[]>([])
  const [loading, setLoading] = useState(isApiConfigured)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [trackingOrder, setTrackingOrder] = useState<OrderDto | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 4
  const isOutForDelivery = (status: string) => status.toUpperCase().replaceAll(' ', '_') === 'OUT_FOR_DELIVERY'

  const cancelOrder = async (orderId: number) => {
    if (!await confirmAction(`Cancel order #${orderId}?`, 'This action cannot be undone.')) return
    setCancellingId(orderId); setError('')
    try {
      const response = await orderApi.cancel(orderId)
      setOrders((current) => current.map((order) => order.order_id === orderId ? { ...order, ...response.data, status: 'CANCELLED' } : order)); void alertSuccess('Order cancelled')
    } catch { setError(`Could not cancel order #${orderId}. It may already be out for delivery.`) } finally { setCancellingId(null) }
  }

  useEffect(() => {
    if (!isApiConfigured) return
    let cancelled = false
    orderApi.mine().then((orders) => {
      const enriched = orders.map((order) => {
        if (order.delivery_latitude != null && order.delivery_longitude != null) return order
        try { const saved = JSON.parse(localStorage.getItem(`sea_fish_order_location_${order.order_id}`) ?? 'null') as { latitude?: number; longitude?: number } | null; return saved?.latitude != null && saved.longitude != null ? { ...order, delivery_latitude: saved.latitude, delivery_longitude: saved.longitude } : order } catch { return order }
      })
      if (!cancelled) setOrders(enriched)
    }).catch(() => {
      if (!cancelled) setError('Could not reach ORDS — connect the API to see your order history.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  if (!isApiConfigured) {
    return <section className="empty-state"><div className="empty-icon"><PackageSearch size={28} /></div><h2>Order history</h2><p>Connect <code>VITE_ORDS_BASE_URL</code> to load your past orders from <code>GET /orders/my</code>.</p></section>
  }

  if (loading) return <p className="catalog-notice">Loading your orders…</p>
  if (error) return <p className="catalog-notice">{error}</p>
  if (orders.length === 0) return <section className="empty-state"><div className="empty-icon"><PackageSearch size={28} /></div><h2>No orders yet</h2><p>Your placed orders will show up here.</p></section>

  const pageCount = Math.max(1, Math.ceil(orders.length / pageSize))
  const visibleOrders = orders.slice((page - 1) * pageSize, page * pageSize)
  return <div className="order-history">{visibleOrders.map((order) => <article className="order-history-card" key={order.order_id}>
    <div className="order-history-top">
      <span>Order #{order.order_id}</span>
      <span className={`order-status-pill status-${order.status.toLowerCase()}`}>{STATUS_LABEL[order.status]}</span>
    </div>
    <ul>{(order.items ?? []).map((item) => <li key={item.order_item_id}>{item.product_name_en ?? `Product #${item.product_id}`} · {item.qty} {item.unit}</li>)}</ul>
    <div className="order-history-bottom"><span>{order.delivery_slot ?? 'Delivery slot pending'}</span><strong>{formatPrice(order.total_amount)}</strong></div>
    {(order.status === 'PLACED' || order.status === 'CONFIRMED') && <button type="button" className="order-cancel-button" disabled={cancellingId === order.order_id} onClick={() => cancelOrder(order.order_id)}>{cancellingId === order.order_id ? 'Cancelling…' : 'Cancel order'}</button>}
    {isOutForDelivery(order.status) && <button type="button" className="order-track-button" onClick={() => setTrackingOrder(order)}>Track delivery</button>}
  </article>)}{pageCount > 1 && <nav className="orders-pagination" aria-label="Order pages"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}{trackingOrder && <OrderTracking order={trackingOrder} onClose={() => setTrackingOrder(null)} />}</div>
}
