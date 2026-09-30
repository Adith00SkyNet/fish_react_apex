import { useEffect, useState } from 'react'
import { Check, Pencil, Trash2, X } from 'lucide-react'
import { adminApi, catalogApi } from '../../api/client'
import { mapCategoryDto } from '../../utils/mappers'
import type { Category } from '../../types/product'
import { alertSuccess, confirmAction } from '../../utils/alerts'

const emptyForm = { name_en: '', name_ml: '', sort_order: '10' }

export function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState(emptyForm)
  const [editing, setEditing] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try { setCategories((await catalogApi.categories()).map(mapCategoryDto)); setError('') }
    catch { setError('Could not load categories.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { name_en: form.name_en.trim(), name_ml: form.name_ml.trim(), sort_order: Number(form.sort_order) }
      if (editing) await adminApi.updateCategory(editing.id, payload)
      else await adminApi.createCategory(payload)
      setForm(emptyForm); setEditing(null); await load(); void alertSuccess(editing ? 'Category updated' : 'Category added')
    } catch { setError(`Could not ${editing ? 'update' : 'create'} the category.`) }
    finally { setSaving(false) }
  }

  const edit = (category: Category) => { setEditing(category); setForm({ name_en: category.name, name_ml: category.malayalam, sort_order: String(category.sortOrder) }) }
  const remove = async (category: Category) => {
    if (!await confirmAction(`Delete ${category.name}?`, 'Products in this category may be affected.')) return
    try { await adminApi.deleteCategory(category.id); await load(); void alertSuccess('Category deleted') } catch { setError('Could not delete the category.') }
  }

  return <section className="category-admin">
    <div className="panel-heading"><div><h2>Categories</h2><p>Organize the DELFISH catalog for customers.</p></div></div>
    <form className="category-form" onSubmit={submit}>
      <input required placeholder="English name" value={form.name_en} onChange={(event) => setForm({ ...form, name_en: event.target.value })} />
      <input required placeholder="Malayalam name" value={form.name_ml} onChange={(event) => setForm({ ...form, name_ml: event.target.value })} />
      <input required min="1" type="number" placeholder="Sort order" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: event.target.value })} />
      <button className="modal-save" type="submit" disabled={saving}><Check size={15} /> {editing ? 'Update' : 'Add category'}</button>
      {editing && <button className="modal-cancel" type="button" onClick={() => { setEditing(null); setForm(emptyForm) }}><X size={15} /> Cancel</button>}
    </form>
    {error && <p className="catalog-notice">{error}</p>}
    {loading ? <p className="catalog-notice">Loading categories…</p> : <div className="category-list">{categories.map((category) => <article className="category-row" key={category.id}><div><strong>{category.name}</strong><span>{category.malayalam} · Order {category.sortOrder}</span></div><div><button className="icon-button" type="button" onClick={() => edit(category)} aria-label={`Edit ${category.name}`}><Pencil size={16} /></button><button className="icon-button" type="button" onClick={() => void remove(category)} aria-label={`Delete ${category.name}`}><Trash2 size={16} /></button></div></article>)}</div>}
  </section>
}
