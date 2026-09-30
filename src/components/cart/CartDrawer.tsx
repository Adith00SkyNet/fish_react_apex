import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CheckCircle2, LocateFixed, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { isApiConfigured, orderApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../utils/format'

type Step = 'cart' | 'address' | 'placing' | 'success' | 'error'

const DELIVERY_SLOTS = ['Morning Delivery', 'Afternoon Delivery', 'Evening Delivery']

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, subtotal, increment, decrement, remove, clear } = useCart()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('cart')
  const [address, setAddress] = useState('')
  const [slot, setSlot] = useState(DELIVERY_SLOTS[1])
  const [orderId, setOrderId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null)
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [locationDetected, setLocationDetected] = useState(false)

  const detectLocation = () => {
    if (!navigator.geolocation) { setLocationError('Unable to get your current location. Please try again.'); return }
    setLocationLoading(true); setLocationError(''); setLocationDetected(false)
    navigator.geolocation.getCurrentPosition((position) => {
      setDeliveryLatitude(position.coords.latitude); setDeliveryLongitude(position.coords.longitude); setLocationDetected(true); setLocationLoading(false)
    }, (location) => {
      setLocationError(location.code === location.PERMISSION_DENIED ? 'Location permission was denied. Please allow location access in your browser or enter your address manually.' : location.code === location.POSITION_UNAVAILABLE ? 'Your current location could not be determined. Please try again or enter your address manually.' : location.code === location.TIMEOUT ? 'Location request timed out. Please try again.' : 'Unable to get your current location. Please try again.')
      setLocationLoading(false)
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 })
  }

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStep('placing')
    setError('')
    const payload = {
      delivery_address: address,
      delivery_latitude: deliveryLatitude,
      delivery_longitude: deliveryLongitude,
      delivery_slot: slot,
      payment_method: 'COD' as const,
      items: items.map((item) => ({ product_id: item.product.id, qty: item.qty, unit: item.product.unit })),
    }
    if (!isApiConfigured) { setError('Connect the ORDS API before placing an order.'); setStep('error'); return }
    try {
      const response = await orderApi.create(payload)
      if (deliveryLatitude != null && deliveryLongitude != null) localStorage.setItem(`sea_fish_order_location_${response.data.order_id}`, JSON.stringify({ latitude: deliveryLatitude, longitude: deliveryLongitude }))
      setOrderId(response.data.order_id)
      setStep('success')
    } catch {
      setError('Could not place the order. Check your connection and try again.')
      setStep('error')
    }
  }

  const finish = () => {
    clear()
    setStep('cart')
    setAddress('')
    setDeliveryLatitude(null); setDeliveryLongitude(null); setLocationDetected(false); setLocationError('')
    setOrderId(null)
    onClose()
  }

  if (step === 'success') {
    return <div className="drawer-backdrop" onClick={finish}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
      <div className="order-success"><CheckCircle2 size={40} /><h2>Order placed!</h2><p>Order #{orderId} is confirmed for {slot.toLowerCase()}. Pay cash on delivery.</p><button type="button" className="outline-button" onClick={finish}>Back to catalog</button></div>
    </aside></div>
  }

  return <div className="drawer-backdrop" onClick={onClose}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
    <div className="drawer-header">
      <div><span className="eyebrow">YOUR BASKET</span><h2>{items.length ? `${items.length} fresh picks` : 'Your basket is empty'}</h2></div>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Close cart"><X size={20} /></button>
    </div>
    {items.length === 0 && <div className="empty-cart"><ShoppingCart size={32} /><p>Choose something good from today&apos;s products.</p><button type="button" className="outline-button" onClick={onClose}>Browse products</button></div>}

    {items.length > 0 && step === 'cart' && <>
      <div className="cart-items">{items.map((item) => <div className="cart-item" key={item.product.id}>
        <span className={`cart-thumb ${item.product.accent}`}>{item.product.emoji}</span>
        <div><strong>{item.product.name}</strong><span>{item.product.unit} · {formatPrice(item.product.price)}</span></div>
        <div className="cart-qty">
          <button type="button" onClick={() => decrement(item.product.id)} aria-label={`Reduce ${item.product.name} quantity`}><Minus size={13} /></button>
          <span>{item.qty}</span>
          <button type="button" onClick={() => increment(item.product.id)} aria-label={`Increase ${item.product.name} quantity`}><Plus size={13} /></button>
        </div>
        <button type="button" className="cart-remove" onClick={() => remove(item.product.id)} aria-label={`Remove ${item.product.name}`}><X size={15} /></button>
      </div>)}</div>
      <div className="cart-total"><span>Estimated total</span><strong>{formatPrice(subtotal)}</strong></div>
      <button type="button" className="checkout-button" onClick={() => setStep('address')}>Continue to checkout <ArrowRight size={17} /></button>
      <small className="cod-note">Cash on delivery · Final price confirmed at checkout</small>
    </>}

    {items.length > 0 && (step === 'address' || step === 'placing' || step === 'error') && <form className="checkout-form" onSubmit={placeOrder}>
      <label><span>Delivery address</span><textarea required rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder={user?.name ? `${user.name}'s address` : 'House name, street, town'} /><button type="button" className="location-button" onClick={detectLocation} disabled={locationLoading}><LocateFixed size={15} /> {locationLoading ? 'Getting location…' : locationDetected ? 'Location detected' : 'Use my current location'}</button>{locationError && <small className="location-error">{locationError}</small>}</label>
      <label><span>Delivery slot</span><select value={slot} onChange={(event) => setSlot(event.target.value)}>{DELIVERY_SLOTS.map((option) => <option key={option}>{option}</option>)}</select></label>
      <div className="cart-total"><span>Total ({items.reduce((sum, item) => sum + item.qty, 0)} items)</span><strong>{formatPrice(subtotal)}</strong></div>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="checkout-button" disabled={step === 'placing'}>{step === 'placing' ? 'Placing order…' : 'Place order · COD'} <ArrowRight size={17} /></button>
      <button type="button" className="text-button" onClick={() => setStep('cart')}>Back to basket</button>
    </form>}
  </aside></div>
}
