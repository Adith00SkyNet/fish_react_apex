import { useState } from 'react'
import type { FormEvent } from 'react'
import { Check, ImagePlus, PlaySquare, X } from 'lucide-react'
import { adminApi, isApiConfigured } from '../../api/client'
import { useCatalog } from '../../hooks/useCatalog'
import type { Product, ProductMedia } from '../../types/product'
import { mapProductDto } from '../../utils/mappers'
import './AddCatchForm.css'
import { alertSuccess } from '../../utils/alerts'

type AddCatchFormProps = { onClose: () => void; onSave: (product: Product) => void }

export function AddCatchForm({ onClose, onSave }: AddCatchFormProps) {
  const { categories } = useCatalog()
  const [form, setForm] = useState({ name: '', malayalam: '', categoryId: '', cut: 'Curry cut', unit: 'kg', price: '', stockQuantity: '0', weight: '', emoji: '🐟' })
  const [images, setImages] = useState<File[]>([])
  const [videos, setVideos] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const addFiles = (files: FileList | null, type: 'IMAGE' | 'VIDEO') => {
    if (!files) return
    const selected = Array.from(files)
    if (type === 'IMAGE') setImages((current) => [...current, ...selected])
    else setVideos((current) => [...current, ...selected])
  }

  const removeFile = (type: 'IMAGE' | 'VIDEO', index: number) => {
    if (type === 'IMAGE') setImages((current) => current.filter((_, fileIndex) => fileIndex !== index))
    else setVideos((current) => current.filter((_, fileIndex) => fileIndex !== index))
  }

  const activeCategory = categories.find((category) => category.id === Number(form.categoryId)) ?? categories[0]
  const hasCutType = /fish|chicken|meat/i.test(activeCategory?.name ?? '')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const media: ProductMedia[] = [...images.map((file) => ({ type: 'IMAGE' as const, name: file.name, url: URL.createObjectURL(file), file })), ...videos.map((file) => ({ type: 'VIDEO' as const, name: file.name, url: URL.createObjectURL(file), file }))]

    if (!isApiConfigured) {
      onSave({ id: Date.now(), name: form.name, malayalam: form.malayalam, category: activeCategory?.name ?? '', categoryId: activeCategory?.id ?? null, cut: form.cut, unit: form.unit, price: Number(form.price), weight: form.weight || 'Fresh today', accent: 'sky', emoji: form.emoji || '🐟', media })
      return
    }

    setSubmitting(true)
    setError('')

    let created
    try {
      const response = await adminApi.createProduct({
        name_en: form.name,
        name_ml: form.malayalam,
        category_id: activeCategory?.id,
        cut_type: hasCutType ? form.cut : undefined,
        unit: form.unit,
        base_price: Number(form.price),
        stock_quantity: Number(form.stockQuantity),
        weight_note: form.weight || undefined,
        emoji: form.emoji || undefined,
      })
      created = response.data
    } catch {
      setError('Could not save this product to ORDS. Check the connection and try again.')
      setSubmitting(false)
      return
    }

    // The product is saved at this point — treat it as a success regardless
    // of what happens with media next, so a media-upload failure (or a
    // not-yet-built media endpoint) never masks a product that's already in
    // the catalog.
    onSave(mapProductDto(created, activeCategory?.name ?? ''))
    void alertSuccess('Product added', `${form.name} is now in the catalog.`)

    if (images.length > 0 || videos.length > 0) {
      try {
        await Promise.all([
          ...images.map((file) => adminApi.uploadMedia(created!.product_id, file, 'IMAGE')),
          ...videos.map((file) => adminApi.uploadMedia(created!.product_id, file, 'VIDEO')),
        ])
      } catch {
        console.warn('Product saved, but media upload failed — the media endpoint may not be live yet.')
      }
    }

    setSubmitting(false)
  }

  return <div className="catch-modal-backdrop" onClick={onClose}><section className="catch-modal" onClick={(event) => event.stopPropagation()}><header className="catch-modal-header"><div><span className="eyebrow">CATALOG · NEW PRODUCT</span><h2>Add new product</h2><p>Make today&apos;s fresh product available to customers.</p></div><button type="button" className="icon-button" onClick={onClose} aria-label="Close add product form"><X size={20} /></button></header><form className="catch-form" onSubmit={submit}><label className="catch-field catch-field-wide"><span>English name</span><input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Kingfish Curry Cut" /></label><label className="catch-field catch-field-wide"><span>Malayalam name</span><input required value={form.malayalam} onChange={(event) => updateField('malayalam', event.target.value)} placeholder="നെയ്മീൻ കറി കട്ട്" /></label><label className="catch-field"><span>Category</span><select value={form.categoryId || String(categories[0]?.id ?? '')} onChange={(event) => updateField('categoryId', event.target.value)}>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>{hasCutType && <label className="catch-field"><span>Cut type</span><select value={form.cut} onChange={(event) => updateField("cut", event.target.value)}><option>Curry cut</option><option>Fry cut</option><option>Cleaned</option><option>Whole</option><option>Meat</option></select></label>}<label className="catch-field"><span>Price</span><input required min="1" type="number" value={form.price} onChange={(event) => updateField('price', event.target.value)} placeholder="780" /></label><label className="catch-field"><span>Quantity</span><input required min="0" type="number" value={form.stockQuantity} onChange={(event) => updateField("stockQuantity", event.target.value)} /></label><label className="catch-field"><span>Unit</span><select value={form.unit} onChange={(event) => updateField('unit', event.target.value)}><option>kg</option><option>500gm</option></select></label><label className="catch-field"><span>Weight note</span><input value={form.weight} onChange={(event) => updateField('weight', event.target.value)} placeholder="6 kg fish" /></label><div className="media-upload catch-field-wide"><div className="media-upload-heading"><span>Photos and videos</span><small>Images and short videos can be uploaded with this product.</small></div><div className="media-upload-actions"><label className="media-picker"><ImagePlus size={17} /><span>Add images</span><input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => addFiles(event.target.files, 'IMAGE')} /></label><label className="media-picker"><PlaySquare size={17} /><span>Add videos</span><input type="file" accept="video/mp4,video/webm,video/quicktime" multiple onChange={(event) => addFiles(event.target.files, 'VIDEO')} /></label></div>{(images.length > 0 || videos.length > 0) && <div className="selected-media">{images.map((file, index) => <div className="media-file" key={`${file.name}-${index}`}><img src={URL.createObjectURL(file)} alt="" /><span>{file.name}</span><button type="button" onClick={() => removeFile('IMAGE', index)} aria-label={`Remove ${file.name}`}><X size={13} /></button></div>)}{videos.map((file, index) => <div className="media-file video-file" key={`${file.name}-${index}`}><PlaySquare size={18} /><span>{file.name}</span><button type="button" onClick={() => removeFile('VIDEO', index)} aria-label={`Remove ${file.name}`}><X size={13} /></button></div>)}</div>}</div>{error && <p className="auth-error catch-field-wide">{error}</p>}<footer className="catch-modal-footer"><button type="button" className="modal-cancel" onClick={onClose}>Cancel</button><button type="submit" className="modal-save" disabled={submitting}><Check size={16} /> {submitting ? 'Saving…' : 'Add to catalog'}</button></footer></form></section></div>
}
