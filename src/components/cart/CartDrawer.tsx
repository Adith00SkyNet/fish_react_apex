import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CheckCircle2, CreditCard, Minus, Plus, ShoppingCart, X } from 'lucide-react'
import { CASHFREE_MODE, isApiConfigured, orderApi, paymentApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { formatPrice } from '../../utils/format'

type Step = 'cart' | 'address' | 'placing' | 'payment' | 'payment-return' | 'success' | 'error'
type PaymentMethod = 'COD' | 'ONLINE'
type PaymentStatus = 'PAID' | 'PENDING' | 'PROCESSING' | 'FAILED' | 'CANCELLED' | 'UNKNOWN'

type CashfreeInstance = { checkout: (options: { paymentSessionId: string; redirectTarget: '_self' }) => Promise<unknown> | unknown }
declare global { interface Window { Cashfree?: (options: { mode: 'sandbox' | 'production' }) => CashfreeInstance } }

const DELIVERY_SLOTS = ['Morning Delivery', 'Afternoon Delivery', 'Evening Delivery']

function waitForCashfree(timeoutMs = 10000): Promise<NonNullable<Window['Cashfree']>> {
  if (window.Cashfree) return Promise.resolve(window.Cashfree)
  return new Promise((resolve, reject) => {
    const startedAt = Date.now()
    const check = () => {
      if (window.Cashfree) {
        resolve(window.Cashfree)
      } else if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error('cashfree_sdk_unavailable'))
      } else {
        window.setTimeout(check, 100)
      }
    }
    check()
  })
}

export function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, subtotal, increment, decrement, remove, clear } = useCart()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('cart')
  const [address, setAddress] = useState(() => user?.address ?? '')
  const [slot, setSlot] = useState(DELIVERY_SLOTS[1])
  const [orderId, setOrderId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD')
  const [paymentStatus] = useState<PaymentStatus>('PENDING')
  const [locationState, setLocationState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [locationMessage, setLocationMessage] = useState('')

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationState('error')
      setLocationMessage('Location is not supported by this browser.')
      return
    }
    setLocationState('loading')
    setLocationMessage('Requesting your current location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const location = `Current location (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`
        setAddress((current) => current.trim() ? current : location)
        setLocationState('ready')
        setLocationMessage('Your current location was added. Please include your house name, building, or a nearby landmark so delivery is easy to find.')
      },
      () => {
        setLocationState('error')
        setLocationMessage('Could not access your location. Allow location permission or enter your address manually.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const placeOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStep('placing')
    setError('')
    const payload = {
      delivery_address: address,
      delivery_slot: slot,
      payment_method: paymentMethod,
      items: items.map((item) => ({ product_id: item.product.id, qty: item.qty, unit: item.product.unit })),
    }
    if (!isApiConfigured) { setError('Connect the ORDS API before placing an order.'); setStep('error'); return }
    try {
      let createdOrderId = orderId
      if (createdOrderId == null) {
        const response = await orderApi.create(payload)
        createdOrderId = response.data.order_id
        setOrderId(createdOrderId)
      }
      if (paymentMethod === 'COD') {
        setStep('success')
        return
      }
      setStep('payment')
      const payment = await paymentApi.createCashfree(createdOrderId)
      if (!payment.data.payment_session_id) throw new Error('missing_payment_session')
      const cashfreeFactory = await waitForCashfree()
      const cashfree = cashfreeFactory({ mode: CASHFREE_MODE })
      // ORDS configures Cashfree's return_url to the APEX shop page. The
      // database order id is retained because Cashfree returns its gateway id.
      window.sessionStorage.setItem('fishshop_pending_payment_order', String(createdOrderId))
      await cashfree.checkout({ paymentSessionId: payment.data.payment_session_id, redirectTarget: '_self' })
    } catch (paymentError) {
      console.error('Cashfree checkout failed', paymentError)
      setError(paymentMethod === 'ONLINE'
        ? 'Cashfree could not start this payment. Please check the connection and try again.'
        : 'Could not place the order. Check your connection and try again.')
      setStep('error')
    }
  }

  const finish = () => {
    clear()
    setStep('cart')
    setAddress('')
    setOrderId(null)
    setPaymentMethod('COD')
    onClose()
  }

  if (step === 'success') {
    return <div className="drawer-backdrop" onClick={finish}><aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
      <div className="order-success"><CheckCircle2 size={40} /><h2>Order placed!</h2><p>Order #{orderId} is confirmed for {slot.toLowerCase()}. Pay cash on delivery.</p><button type="button" className="outline-button" onClick={finish}>Back to catalog</button></div>
    </aside></div>
  }

  if (step === 'payment-return') {
    const statusCopy: Record<PaymentStatus, { title: string; message: string }> = {
      PAID: { title: 'Payment confirmed', message: `Order #${orderId} has been paid successfully.` },
      PENDING: { title: 'Payment pending', message: `Order #${orderId} is still waiting for payment confirmation.` },
      PROCESSING: { title: 'Payment processing', message: `Order #${orderId} is being processed. We will update its status from the backend.` },
      FAILED: { title: 'Payment failed', message: 'The payment was not completed. Please try again from your orders.' },
      CANCELLED: { title: 'Payment cancelled', message: 'The Cashfree checkout was cancelled.' },
      UNKNOWN: { title: 'Checking payment status', message: 'We could not confirm the final status yet. Please check your orders shortly.' },
    }
    const copy = statusCopy[paymentStatus]
    return <div className="drawer-backdrop"><aside className="cart-drawer"><div className="order-success"><CreditCard size={40} /><h2>{copy.title}</h2><p>{copy.message}</p><button type="button" className="outline-button" onClick={onClose}>Return to catalog</button></div></aside></div>
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

    {items.length > 0 && (step === 'address' || step === 'placing' || step === 'payment' || step === 'error') && <form className="checkout-form" onSubmit={placeOrder}>
      <label><span>Delivery address</span><textarea required rows={3} value={address} onChange={(event) => setAddress(event.target.value)} placeholder={user?.name ? `${user.name}'s address` : 'House name, street, town'} /></label>
      <button type="button" className="text-button" onClick={useCurrentLocation} disabled={locationState === 'loading'}>
        {locationState === 'loading' ? 'Locating you…' : locationState === 'ready' ? 'Refresh my location' : 'Use my current location'}
      </button>
      {locationMessage && <small className={`location-message ${locationState}`}>{locationMessage}</small>}
      <label><span>Delivery slot</span><select value={slot} onChange={(event) => setSlot(event.target.value)}>{DELIVERY_SLOTS.map((option) => <option key={option}>{option}</option>)}</select></label>
      <fieldset className="payment-methods"><legend>Choose how to pay</legend>
        <label className={paymentMethod === 'COD' ? 'payment-option selected' : 'payment-option'}><input type="radio" name="payment-method" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} /><span className="payment-option-copy"><strong>Cash on delivery</strong><small>Pay when your order arrives</small></span></label>
        <label className={paymentMethod === 'ONLINE' ? 'payment-option selected' : 'payment-option'}><input type="radio" name="payment-method" checked={paymentMethod === 'ONLINE'} onChange={() => setPaymentMethod('ONLINE')} /><span className="payment-option-copy"><strong>Online payment</strong><small>Secure checkout powered by Cashfree</small></span></label>
      </fieldset>
      <div className="cart-total"><span>Total ({items.reduce((sum, item) => sum + item.qty, 0)} items)</span><strong>{formatPrice(subtotal)}</strong></div>
      {error && <p className="auth-error">{error}</p>}
      <button type="submit" className="checkout-button" disabled={step === 'placing' || step === 'payment'}>{step === 'placing' ? 'Placing order…' : step === 'payment' ? 'Creating secure payment…' : paymentMethod === 'ONLINE' ? 'Place order · Pay online' : 'Place order · COD'} <ArrowRight size={17} /></button>
      <button type="button" className="text-button" onClick={() => setStep('cart')}>Back to basket</button>
    </form>}
  </aside></div>
}
