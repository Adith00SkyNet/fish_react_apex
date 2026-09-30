import { ArrowRight, Truck } from 'lucide-react'

export function DeliveryBanner() {
  return <section className="delivery-banner"><div className="delivery-icon"><Truck size={20} /></div><div><strong>Afternoon delivery is open</strong><span>Orders placed before 1:00 PM reach customers today</span></div><div className="banner-meta"><span className="pulse" /> 18 slots left</div><ArrowRight size={18} /></section>
}