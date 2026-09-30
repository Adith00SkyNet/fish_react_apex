import { useEffect, useRef, useState } from 'react'
import { Navigation, Phone, RefreshCw, Truck, X } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { orderApi } from '../../api/client'
import type { OrderDto, OrderTrackingDto } from '../../types/api'
import './OrderTracking.css'

type Props = { order: OrderDto; onClose: () => void }
const hasPoint = (point?: { latitude?: number; longitude?: number } | null): point is { latitude: number; longitude: number } => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
const ago = (value?: string | null) => value ? `${Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))} seconds ago` : 'Location update pending'

export function OrderTracking({ order, onClose }: Props) {
  const [tracking, setTracking] = useState<OrderTrackingDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)

  const refresh = async () => {
    try { setError(''); const response = await orderApi.getOrderTracking(order.order_id); setTracking(response.data) }
    catch { setError('Live delivery location is currently unavailable.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    void refresh()
    if (order.status.toUpperCase() !== 'OUT_FOR_DELIVERY') return
    const timer = window.setInterval(() => void refresh(), 20000)
    return () => window.clearInterval(timer)
  }, [order.order_id, order.status])

  useEffect(() => {
    if (!mapRef.current || map.current) return
    map.current = L.map(mapRef.current, { zoomControl: true }).setView([10.0159, 76.3419], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map.current)
    markers.current = L.layerGroup().addTo(map.current)
    const resizeTimer = window.setTimeout(() => map.current?.invalidateSize(), 150)
    return () => { window.clearTimeout(resizeTimer); map.current?.remove(); map.current = null }
  }, [])

  useEffect(() => {
    if (!map.current || !markers.current || !tracking) return
    markers.current.clearLayers()
    const points: L.LatLngExpression[] = []
    if (hasPoint(tracking.customer_location)) { const point: L.LatLngExpression = [tracking.customer_location.latitude, tracking.customer_location.longitude]; points.push(point); L.marker(point, { title: 'Customer location' }).addTo(markers.current).bindPopup('Customer') }
    if (hasPoint(tracking.delivery_location)) { const point: L.LatLngExpression = [tracking.delivery_location.latitude, tracking.delivery_location.longitude]; points.push(point); L.marker(point, { title: 'Delivery partner' }).addTo(markers.current).bindPopup('Delivery partner') }
    if (points.length === 2) map.current.fitBounds(L.latLngBounds(points), { padding: [35, 35] })
    else if (points.length === 1) map.current.setView(points[0], 15)
  }, [tracking])

  const status = (tracking?.status ?? order.status).toUpperCase() as OrderTrackingDto['status']
  const isOutForDelivery = status === 'OUT_FOR_DELIVERY'
  return <div className="tracking-backdrop" onClick={onClose}><section className="tracking-panel" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow"><Navigation size={13} /> LIVE DELIVERY</span><h2>Track your delivery</h2><p>Order #{order.order_id}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close tracking"><X size={19} /></button></header><div className="tracking-body"><div className="tracking-status-heading"><strong>{status === 'DELIVERED' ? 'Order delivered' : isOutForDelivery ? 'OUT FOR DELIVERY' : 'TRACKING UNAVAILABLE'}</strong><span>{isOutForDelivery ? 'Your delivery partner is on the way.' : status === 'DELIVERED' ? 'Your order has arrived.' : 'Live tracking will become available when your order is out for delivery.'}</span></div>{isOutForDelivery && <><div className="tracking-map" ref={mapRef} />{(!tracking || (!hasPoint(tracking.customer_location) && !hasPoint(tracking.delivery_location))) && !loading && <p className="tracking-unavailable">Live delivery location is currently unavailable.</p>}{error && <p className="tracking-unavailable">{error}</p>}<div className="tracking-person"><div className="tracking-person-icon"><Truck size={18} /></div><div><strong>{tracking?.delivery_person?.name ?? 'Delivery partner'}</strong><span>{tracking?.delivery_person?.phone && <><Phone size={12} /> {tracking.delivery_person.phone}</>}</span></div><small>{ago(tracking?.location_updated_at)}</small></div></>}<div className="tracking-timeline"><div className="tracking-step done"><b>✓</b><span>Order placed</span></div><div className="tracking-step done"><b>✓</b><span>Order confirmed</span></div><div className="tracking-step done"><b>✓</b><span>Preparing</span></div><div className={`tracking-step ${isOutForDelivery ? 'active' : status === 'DELIVERED' ? 'done' : ''}`}><b>{status === 'DELIVERED' ? '✓' : '●'}</b><span>Out for delivery</span></div><div className={`tracking-step ${status === 'DELIVERED' ? 'done' : ''}`}><b>{status === 'DELIVERED' ? '✓' : '○'}</b><span>Delivered</span></div></div>{isOutForDelivery && <button type="button" className="tracking-refresh" disabled={loading} onClick={() => void refresh()}><RefreshCw size={15} /> {loading ? 'Refreshing…' : 'Refresh location'}</button>}</div></section></div>
}
