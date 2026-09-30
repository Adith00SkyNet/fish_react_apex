import { useEffect, useState } from 'react'
import { PackageSearch } from 'lucide-react'
import { adminApi, isApiConfigured } from '../../api/client'
import type { OrderDto, OrderStatus } from '../../types/api'
import { formatPrice } from '../../utils/format'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export function OrdersOverview() {
  const [orders, setOrders] = useState<OrderDto[]>([])
  const [loading, setLoading] = useState(isApiConfigured)
  const [error, setError] = useState('')
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null)
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'date'>('all')
  const [specificDate, setSpecificDate] = useState('')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')

  useEffect(() => {
    if (!isApiConfigured) return
    let cancelled = false
    adminApi.orders().then((orders) => {
      if (!cancelled) setOrders(orders)
    }).catch(() => {
      if (!cancelled) setError('Could not reach ORDS — connect the API to see live orders.')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const updateStatus = async (orderId: number, status: OrderStatus) => {
    const previousStatus = orders.find((order) => order.order_id === orderId)?.status
    if (!previousStatus || previousStatus === status) return

    setSavingOrderId(orderId)
    setError('')
    setOrders((current) => current.map((order) => order.order_id === orderId ? { ...order, status } : order))
    try {
      const response = await adminApi.updateStatus(orderId, status)
      setOrders((current) => current.map((order) => order.order_id === orderId ? { ...order, ...response.data } : order))
    } catch {
      setOrders((current) => current.map((order) => order.order_id === orderId ? { ...order, status: previousStatus } : order))
      setError(`Could not update order #${orderId}. Please try again.`)
    } finally {
      setSavingOrderId(null)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const placedAt = new Date(order.placed_at)
    if (Number.isNaN(placedAt.getTime())) return dateFilter === 'all' && !fromTime && !toTime
    const now = new Date()
    const orderDate = placedAt.toLocaleDateString('en-CA')
    const today = now.toLocaleDateString('en-CA')
    const yesterdayDate = new Date(now)
    yesterdayDate.setDate(now.getDate() - 1)
    const yesterday = yesterdayDate.toLocaleDateString('en-CA')
    if (dateFilter === 'today' && orderDate !== today) return false
    if (dateFilter === 'yesterday' && orderDate !== yesterday) return false
    if (dateFilter === 'date' && (!specificDate || orderDate !== specificDate)) return false
    const orderMinutes = placedAt.getHours() * 60 + placedAt.getMinutes()
    if (fromTime) { const [hours, minutes] = fromTime.split(':').map(Number); if (orderMinutes < hours * 60 + minutes) return false }
    if (toTime) { const [hours, minutes] = toTime.split(':').map(Number); if (orderMinutes > hours * 60 + minutes) return false }
    return true
  })

  if (!isApiConfigured) {
    return <section className="empty-state"><div className="empty-icon"><PackageSearch size={28} /></div><h2>Orders</h2><p>Connect <code>VITE_ORDS_BASE_URL</code> to load live orders from <code>GET /orders</code>.</p></section>
  }

  if (loading) return <p className="catalog-notice">Loading orders…</p>
  if (error) return <p className="catalog-notice">{error}</p>
  if (orders.length === 0) return <section className="empty-state"><div className="empty-icon"><PackageSearch size={28} /></div><h2>No orders yet</h2><p>Orders placed by customers will show up here.</p></section>

  return <><div className="orders-filter-bar"><span className="orders-filter-label">Filter orders</span><select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as typeof dateFilter)} aria-label="Filter orders by date"><option value="all">All dates</option><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="date">Specific date</option></select>{dateFilter === 'date' && <input type="date" value={specificDate} onChange={(event) => setSpecificDate(event.target.value)} aria-label="Choose order date" />}<label>From <input type="time" value={fromTime} onChange={(event) => setFromTime(event.target.value)} /></label><label>To <input type="time" value={toTime} onChange={(event) => setToTime(event.target.value)} /></label>{(dateFilter !== 'all' || specificDate || fromTime || toTime) && <button type="button" className="orders-filter-clear" onClick={() => { setDateFilter('all'); setSpecificDate(''); setFromTime(''); setToTime('') }}>Clear</button>}</div><p className="orders-filter-count">Showing {filteredOrders.length} of {orders.length} orders</p>{filteredOrders.length === 0 ? <section className="empty-state"><div className="empty-icon"><PackageSearch size={28} /></div><h2>No matching orders</h2><p>Try another date or time range.</p></section> : <div className="orders-table-wrap"><table className="orders-table">
    <thead><tr><th>Order</th><th>Date & time</th><th>Customer</th><th>Fish & quantity</th><th>Status</th><th>Slot</th><th>Total</th><th>Payment</th></tr></thead>
    <tbody>{filteredOrders.map((order) => <tr key={order.order_id}>
      <td>#{order.order_id}</td>
      <td>{new Date(order.placed_at).toLocaleString()}</td>
      <td>{order.customer_name ?? '—'}</td>
      <td>{order.items?.length ? order.items.map((item) => `${item.product_name_en ?? `Product #${item.product_id}`} × ${item.qty} ${item.unit}`).join(', ') : '—'}</td>
      <td><select className={`order-status-select status-${order.status.toLowerCase()}`} value={order.status} disabled={savingOrderId === order.order_id} onChange={(event) => updateStatus(order.order_id, event.target.value as OrderStatus)} aria-label={`Update status for order ${order.order_id}`}>
        {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
      </select>{savingOrderId === order.order_id && <small className="order-status-saving">Saving…</small>}</td>
      <td>{order.delivery_slot ?? '—'}</td>
      <td>{formatPrice(order.total_amount)}</td>
      <td>{order.payment_status}</td>
    </tr>)}</tbody>
  </table></div>}</>
}
