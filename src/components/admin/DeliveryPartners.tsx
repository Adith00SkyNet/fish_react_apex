import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, Phone, Plus, UserRound, X } from 'lucide-react'
import { adminApi, isApiConfigured } from '../../api/client'

type Partner = { delivery_person_id: number; name: string; phone: string; email?: string; is_active: number }

export function DeliveryPartners() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', password: '' })
  const [loading, setLoading] = useState(isApiConfigured)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isApiConfigured) return
    adminApi.deliveryPartners().then((items) => setPartners(items as Partner[])).catch(() => setError('Could not load delivery partners.')).finally(() => setLoading(false))
  }, [])

  const createPartner = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      if (isApiConfigured) {
        const response = await adminApi.createDeliveryPartner(form)
        setPartners((current) => [...current, response.data])
      }
      setForm({ name: '', phone: '', email: '', address: '', password: '' }); setOpen(false)
    } catch { setError('Could not create delivery partner. Please try again.') } finally { setSaving(false) }
  }

  const togglePartner = async (partner: Partner) => {
    const is_active = partner.is_active ? 0 : 1
    try {
      if (isApiConfigured) await adminApi.updateDeliveryPartner(partner.delivery_person_id, { is_active })
      setPartners((current) => current.map((item) => item.delivery_person_id === partner.delivery_person_id ? { ...item, is_active } : item))
    } catch { setError('Could not update this delivery partner.') }
  }

  return <section className="partners-page"><div className="partners-heading"><div><span className="eyebrow"><UserRound size={13} /> DELIVERY TEAM</span><h2>Delivery partners</h2><p>Add and manage the people handling today&apos;s routes.</p></div><button type="button" className="delivery-create-button" onClick={() => setOpen(true)}><Plus size={17} /> Add delivery boy</button></div>
    {error && <p className="catalog-notice">{error}</p>}
    {loading ? <p className="catalog-notice">Loading delivery partners…</p> : <div className="partners-list">{partners.map((partner) => <article className="partner-admin-card" key={partner.delivery_person_id}><span className={`partner-active ${partner.is_active ? '' : 'inactive'}`}>{partner.is_active ? 'Active' : 'Inactive'}</span><div className="partner-admin-avatar">{partner.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div><div className="partner-admin-info"><strong>{partner.name}</strong><span><Phone size={12} /> {partner.phone}</span><small>{partner.email || 'No email added'}</small></div><button type="button" className="partner-toggle" onClick={() => togglePartner(partner)}>{partner.is_active ? 'Deactivate' : 'Activate'}</button></article>)}</div>}
    {open && <div className="delivery-modal-backdrop" onClick={() => setOpen(false)}><section className="delivery-modal partner-modal" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">DELIVERY TEAM · NEW MEMBER</span><h2>Add delivery boy</h2><p>Create login details for a delivery partner.</p></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label="Close"><X size={19} /></button></header><form onSubmit={createPartner}><label><span>Full name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Phone number</span><input required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label><label className="delivery-full-field"><span>Email</span><input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="delivery-full-field"><span>Address</span><input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Kochi, Kerala" /></label><label className="delivery-full-field"><span>Temporary password</span><input required minLength={6} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><footer><button type="button" onClick={() => setOpen(false)}>Cancel</button><button type="submit" disabled={saving}><CheckCircle2 size={16} /> {saving ? 'Saving…' : 'Add partner'}</button></footer></form></section></div>}
  </section>
}
