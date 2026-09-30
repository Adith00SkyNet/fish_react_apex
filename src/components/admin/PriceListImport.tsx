import { useState } from 'react'
import { CheckCircle2, Wand2 } from 'lucide-react'
import { adminApi, isApiConfigured } from '../../api/client'
import { useCatalog } from '../../hooks/useCatalog'
import { formatPrice } from '../../utils/format'
import { parsePriceListText } from '../../utils/priceListParser'
import type { ParsedRow } from '../../utils/priceListParser'

export function PriceListImport() {
  const { products } = useCatalog()
  const [raw, setRaw] = useState('')
  const [title, setTitle] = useState('Afternoon Delivery')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [status, setStatus] = useState<'idle' | 'parsing' | 'publishing' | 'published' | 'error'>('idle')
  const [error, setError] = useState('')

  const parse = async () => {
    setStatus('parsing')
    setError('')
    try {
      if (isApiConfigured) {
        const response = await adminApi.parsePriceList(raw)
        setRows(response.data.map((row) => ({ emoji: row.emoji, nameMl: row.name_ml, nameEn: row.name_en, price: row.price, unit: row.unit, matchedProductId: row.matched_product_id })))
      } else {
        setRows(parsePriceListText(raw, products))
      }
      setStatus('idle')
    } catch {
      setError('Could not reach the ORDS parse endpoint — parsing locally instead.')
      setRows(parsePriceListText(raw, products))
      setStatus('idle')
    }
  }

  const updateRow = (index: number, field: keyof ParsedRow, value: string) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: field === 'price' ? Number(value) : value } : row))
  }

  const publish = async () => {
    if (!isApiConfigured) {
      setStatus('published')
      return
    }
    setStatus('publishing')
    setError('')
    try {
      const items = rows.filter((row) => row.matchedProductId != null).map((row) => ({ product_id: row.matchedProductId as number, price: row.price, unit: row.unit }))
      await adminApi.publishPriceList({ title, items })
      setStatus('published')
    } catch {
      setError('Could not publish the price list. Check the connection and try again.')
      setStatus('error')
    }
  }

  const unmatchedCount = rows.filter((row) => row.matchedProductId == null).length

  return <section className="price-import">
    <div className="section-heading">
      <div><h2>Price list import</h2><p>Paste the WhatsApp-style broadcast and publish today&apos;s prices.</p></div>
    </div>
    <label className="catch-field catch-field-wide price-import-label"><span>Batch title</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Afternoon Delivery" /></label>
    <textarea className="price-import-textarea" rows={8} value={raw} onChange={(event) => setRaw(event.target.value)} placeholder={'Paste the price broadcast here, e.g.\n*🦪 കല്ലുമ്മേക്കായ = 750/500gm*\nMussels'} />
    <div className="price-import-actions">
      <button type="button" className="outline-button" onClick={parse} disabled={!raw.trim() || status === 'parsing'}><Wand2 size={16} /> {status === 'parsing' ? 'Parsing…' : 'Parse text'}</button>
      {rows.length > 0 && <button type="button" className="checkout-button price-import-publish" onClick={publish} disabled={status === 'publishing'}>{status === 'publishing' ? 'Publishing…' : `Publish ${rows.length} prices`}</button>}
    </div>
    {error && <p className="auth-error">{error}</p>}
    {status === 'published' && <p className="price-import-success"><CheckCircle2 size={16} /> Price list published{!isApiConfigured ? ' (preview only — connect ORDS to persist it)' : ''}.</p>}
    {rows.length > 0 && <div className="orders-table-wrap"><table className="orders-table price-import-table">
      <thead><tr><th></th><th>Malayalam</th><th>English</th><th>Price</th><th>Unit</th><th>Match</th></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}>
        <td>{row.emoji}</td>
        <td><input value={row.nameMl} onChange={(event) => updateRow(index, 'nameMl', event.target.value)} /></td>
        <td><input value={row.nameEn} onChange={(event) => updateRow(index, 'nameEn', event.target.value)} /></td>
        <td><input type="number" value={row.price} onChange={(event) => updateRow(index, 'price', event.target.value)} /> <small>{formatPrice(row.price)}</small></td>
        <td><input value={row.unit} onChange={(event) => updateRow(index, 'unit', event.target.value)} /></td>
        <td>{row.matchedProductId != null ? <span className="order-status-pill status-delivered">Matched</span> : <span className="order-status-pill status-cancelled">Unmatched</span>}</td>
      </tr>)}</tbody>
    </table>{unmatchedCount > 0 && <p className="catalog-notice">{unmatchedCount} row{unmatchedCount > 1 ? 's' : ''} could not be matched to an existing product and will be skipped on publish.</p>}</div>}
  </section>
}
