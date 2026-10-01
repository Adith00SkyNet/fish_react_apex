import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, CreditCard, Clock3, ExternalLink, XCircle } from 'lucide-react'
import { CASHFREE_MODE, paymentApi } from '../../api/client'

type PaymentState = 'VERIFYING' | 'PAID' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'UNKNOWN'
type PaymentVerificationResponse = {
  success?: boolean
  message?: string
  order_id?: number
  payment_id?: number
  amount?: number
  currency?: string
  status?: string
  payment_status?: string
  payment?: { status?: string }
  data?: { status?: string; payment_status?: string }
  cashfree_response?: string | Array<{ payment_status?: string; is_captured?: boolean }>
}
type CashfreeInstance = { checkout: (options: { paymentSessionId: string; redirectTarget: '_self' }) => Promise<unknown> | unknown }
declare global { interface Window { Cashfree?: (options: { mode: 'sandbox' | 'production' }) => CashfreeInstance } }

export function PaymentResult() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const databaseOrderId = window.sessionStorage.getItem('fishshop_pending_payment_order')
  const urlOrderId = params.get('order_id')
  // Our return URL uses the numeric database order id. Cashfree may also
  // return a nonnumeric gateway order id, so only treat numeric values as
  // database order ids and keep gateway references separate.
  const orderId = urlOrderId && /^\d+$/.test(urlOrderId)
    ? urlOrderId
    : params.get('database_order_id') || databaseOrderId
  const gatewayOrderId = params.get('gateway_order_id') || (urlOrderId && !/^\d+$/.test(urlOrderId) ? urlOrderId : null)
  const [state, setState] = useState<PaymentState>('VERIFYING')
  const [retrying, setRetrying] = useState(false)
  const [verificationError, setVerificationError] = useState(false)
  const [paymentDetails, setPaymentDetails] = useState<{ paymentId?: number; amount?: number; currency?: string }>({})

  useEffect(() => {
    if (!orderId || !/^\d+$/.test(orderId)) {
      setState('UNKNOWN')
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof window.setTimeout> | undefined
    let attempts = 0

    const verify = async () => {
      try {
        const response = await paymentApi.verifyCashfree(Number(orderId))
        const body = response.data as PaymentVerificationResponse
        setVerificationError(false)
        setPaymentDetails({ paymentId: body.payment_id, amount: body.amount, currency: body.currency })
        // ORDS wraps Cashfree's payment list as a JSON string in
        // `cashfree_response`. Parse it before looking at the payment status.
        let cashfreePayment: { payment_status?: string; is_captured?: boolean } | undefined
        if (typeof body.cashfree_response === 'string') {
          try {
            const parsed = JSON.parse(body.cashfree_response) as unknown
            if (Array.isArray(parsed)) cashfreePayment = parsed[0] as typeof cashfreePayment
          } catch {
            // Keep checking the normal response fields below.
          }
        } else if (Array.isArray(body.cashfree_response)) {
          cashfreePayment = body.cashfree_response[0]
        }
        const rawStatus = String(
          cashfreePayment?.payment_status ?? body.payment_status ?? body.status ?? body.payment?.status ?? body.data?.payment_status ?? body.data?.status ?? '',
        ).toUpperCase()
        const nextState: PaymentState = rawStatus === 'PAID' || rawStatus === 'SUCCESS' || rawStatus === 'COMPLETED'
          ? 'PAID'
          : rawStatus === 'FAILED' ? 'FAILED'
            : rawStatus === 'CANCELLED' || rawStatus === 'CANCELED' ? 'CANCELLED'
              : rawStatus === 'PENDING' || rawStatus === 'PROCESSING' ? 'PENDING'
                : 'UNKNOWN'

        if (cancelled) return
        if (nextState === 'PENDING' && attempts < 4) {
          attempts += 1
          timer = window.setTimeout(verify, 2000)
        } else {
          setState(nextState)
          if (nextState !== 'PENDING') window.sessionStorage.removeItem('fishshop_pending_payment_order')
        }
      } catch {
        if (!cancelled) { setVerificationError(true); setState('UNKNOWN') }
      }
    }

    void verify()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [orderId])

  const retryPayment = async () => {
    if (!orderId || !/^\d+$/.test(orderId) || !window.Cashfree) return
    setRetrying(true)
    try {
      if (!/^\d+$/.test(orderId)) return
      const response = await paymentApi.createCashfree(Number(orderId))
      await window.Cashfree({ mode: CASHFREE_MODE }).checkout({ paymentSessionId: response.data.payment_session_id, redirectTarget: '_self' })
    } finally { setRetrying(false) }
  }

  const statusCopy: Record<PaymentState, { title: string; message: string }> = {
    VERIFYING: { title: 'Verifying payment…', message: 'We are checking the payment status with DELFISH.' },
    PAID: { title: 'Payment confirmed', message: `Order #${orderId} has been paid successfully.` },
    PENDING: { title: 'Payment processing', message: 'You returned from Cashfree. The backend must verify the payment before it can be marked paid.' },
    FAILED: { title: 'Payment failed', message: 'The backend reports that this payment was not completed.' },
    CANCELLED: { title: 'Payment cancelled', message: 'The payment was cancelled before it was confirmed.' },
    UNKNOWN: { title: 'Payment status unavailable', message: 'We could not verify this payment yet. Please check your orders shortly.' },
  }
  const copy = statusCopy[state]
  const title = !orderId ? 'Order information is missing' : verificationError ? 'Unable to verify payment' : state === 'PAID' ? 'Payment Successful' : copy.title
  const message = !orderId ? 'We could not find the order information for this payment.' : verificationError ? 'Please try again or check your orders shortly.' : state === 'PAID' ? 'Payment completed successfully.' : copy.message
  const StatusIcon = state === 'PAID' ? CheckCircle2 : state === 'FAILED' || state === 'CANCELLED' ? XCircle : state === 'VERIFYING' || state === 'PENDING' ? Clock3 : CreditCard

  return <main className={`payment-result-page payment-${state.toLowerCase()}`}><section className="payment-result-card"><div className="payment-status-icon"><StatusIcon size={42} /></div><span className="eyebrow">DELFISH · PAYMENT STATUS</span><h1>{title}</h1><p>{message}</p>{orderId && <small>Order ID: {orderId}</small>}{paymentDetails.paymentId != null && <small>Payment ID: {paymentDetails.paymentId}</small>}{paymentDetails.amount != null && <small>Amount: {paymentDetails.currency === 'INR' ? '₹' : ''}{paymentDetails.amount}</small>}{gatewayOrderId && <small>Gateway reference: {gatewayOrderId}</small>}<div className="payment-result-actions">{(state === 'FAILED' || state === 'CANCELLED') && <button className="checkout-button" type="button" disabled={retrying} onClick={() => void retryPayment()}>{retrying ? 'Creating payment…' : 'Try payment again'}</button>}<a className="checkout-button" href="/?tab=orders"><ExternalLink size={16} /> View my orders</a><a className="payment-back-link" href="/">Continue shopping</a></div></section></main>
}
