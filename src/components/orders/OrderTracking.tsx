import { useEffect, useRef, useState } from 'react'
import { Navigation, Phone, RefreshCw, Truck, X } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { orderApi } from '../../api/client'
import type { OrderDto, OrderTrackingDto } from '../../types/api'
import './OrderTracking.css'

type Props = { order: OrderDto; onClose: () => void }
const hasPoint = (point?: { latitude?: number | null; longitude?: number | null } | null): point is { latitude: number; longitude: number } => Number.isFinite(point?.latitude) && Number.isFinite(point?.longitude)
const ago = (value?: string | null) => value ? `${Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))} seconds ago` : 'Location update pending'

export function OrderTracking({ order, onClose }: Props) {
  const [tracking, setTracking] = useState<OrderTrackingDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const mapRef = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef<L.LayerGroup | null>(null)
  const route = useRef<L.Polyline | null>(null)

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
    route.current?.remove(); route.current = null
    const customerPoint = hasPoint(tracking.customer_location) ? [tracking.customer_location.latitude, tracking.customer_location.longitude] as [number, number] : null
    const deliveryPoint = hasPoint(tracking.delivery_location) ? [tracking.delivery_location.latitude, tracking.delivery_location.longitude] as [number, number] : null
    if (customerPoint) L.circleMarker(customerPoint, { radius: 8, color: '#c62828', fillColor: '#e53935', fillOpacity: 1, weight: 2 }).addTo(markers.current).bindPopup('Customer destination')
    if (deliveryPoint) {
      L.marker(deliveryPoint, { title: 'Delivery partner' }).addTo(markers.current).bindPopup('Delivery partner')
      if (customerPoint) {
        route.current = L.polyline([deliveryPoint, customerPoint], { color: '#1677ff', weight: 5, opacity: 0.85 }).addTo(map.current)
        map.current.fitBounds(route.current.getBounds(), { padding: [35, 35] })
        void fetch(`https://router.project-osrm.org/route/v1/driving/${deliveryPoint[1]},${deliveryPoint[0]};${customerPoint[1]},${customerPoint[0]}?overview=full&geometries=geojson`).then((response) => response.ok ? response.json() : null).then((data) => { const coordinates = data?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined; if (coordinates?.length && route.current) route.current.setLatLngs(coordinates.map(([longitude, latitude]) => [latitude, longitude] as [number, number])) }).catch(() => undefined)
      } else map.current.setView(deliveryPoint, 15)
    } else if (customerPoint) map.current.setView(customerPoint, 15)
  }, [tracking])

  const status = (tracking?.status ?? order.status).toUpperCase() as OrderTrackingDto['status']
  const isOutForDelivery = status === 'OUT_FOR_DELIVERY'
  return <div className="tracking-backdrop" onClick={onClose}><section className="tracking-panel" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow"><Navigation size={13} /> LIVE DELIVERY</span><h2>Track your delivery</h2><p>Order #{order.order_id}</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close tracking"><X size={19} /></button></header><div className="tracking-body"><div className="tracking-status-heading"><strong>{status === 'DELIVERED' ? 'Order delivered' : isOutForDelivery ? 'OUT FOR DELIVERY' : 'TRACKING UNAVAILABLE'}</strong><span>{isOutForDelivery ? 'Your delivery partner is on the way.' : status === 'DELIVERED' ? 'Your order has arrived.' : 'Live tracking will become available when your order is out for delivery.'}</span></div>{isOutForDelivery && <><div className="tracking-map" ref={mapRef} />{(!tracking || (!hasPoint(tracking.customer_location) && !hasPoint(tracking.delivery_location))) && !loading && <p className="tracking-unavailable">Live delivery location is currently unavailable.</p>}{error && <p className="tracking-unavailable">{error}</p>}<div className="tracking-person"><div className="tracking-person-icon"><Truck size={18} /></div><div><strong>{tracking?.delivery_person_name ?? 'Delivery partner'}</strong><span>{tracking?.delivery_person_phone && <><Phone size={12} /> {tracking.delivery_person_phone}</>}</span></div><small>{ago(tracking?.location_updated_at)}</small></div></>}<div className="tracking-timeline"><div className="tracking-step done"><b>✓</b><span>Order placed</span></div><div className="tracking-step done"><b>✓</b><span>Order confirmed</span></div><div className="tracking-step done"><b>✓</b><span>Preparing</span></div><div className={`tracking-step ${isOutForDelivery ? 'active' : status === 'DELIVERED' ? 'done' : ''}`}><b>{status === 'DELIVERED' ? '✓' : '●'}</b><span>Out for delivery</span></div><div className={`tracking-step ${status === 'DELIVERED' ? 'done' : ''}`}><b>{status === 'DELIVERED' ? '✓' : '○'}</b><span>Delivered</span></div></div>{isOutForDelivery && <button type="button" className="tracking-refresh" disabled={loading} onClick={() => void refresh()}><RefreshCw size={15} /> {loading ? 'Refreshing…' : 'Refresh location'}</button>}</div></section></div>
}
