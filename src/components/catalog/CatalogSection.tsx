import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Check, Pencil, Search, X } from 'lucide-react'
import { useCatalog } from '../../hooks/useCatalog'
import type { Product } from '../../types/product'
import { ProductCard } from './ProductCard'
import { adminApi } from '../../api/client'
import { alertSuccess, confirmAction } from '../../utils/alerts'

type CatalogSectionProps = { onAddToCart: (product: Product) => void; additionalProducts?: Product[]; admin?: boolean }

const ALL_CATEGORY_LABEL = 'All products'

export function CatalogSection({ onAddToCart, additionalProducts = [], admin = false }: CatalogSectionProps) {
  const { categories, products, loading, error } = useCatalog()
  // null = "All products". Filter/key by id, not name — the backend can have
  // multiple category rows that share the same name_en.
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [removedIds, setRemovedIds] = useState<number[]>([])
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState<Product | null>(null)
  const [editForm, setEditForm] = useState({ name: '', malayalam: '', price: '', stockQuantity: '', unit: '', cut: '', weight: '' })
  const [saving, setSaving] = useState(false)
  const [mediaFiles, setMediaFiles] = useState<{ file: File; type: 'IMAGE' | 'VIDEO' }[]>([])

  const visibleProducts = useMemo(() => {
    const query = search.toLowerCase()
    return [...products, ...additionalProducts].filter((product) => !removedIds.includes(product.id)).filter((product) => {
      const matchesCategory = activeCategoryId === null || product.categoryId === activeCategoryId
      return matchesCategory && (product.name.toLowerCase().includes(query) || product.malayalam.includes(search))
    })
  }, [activeCategoryId, additionalProducts, products, removedIds, search])
  const pageSize = 9
  const pageCount = Math.max(1, Math.ceil(visibleProducts.length / pageSize))
  const pagedProducts = visibleProducts.slice((page - 1) * pageSize, page * pageSize)

  const deleteProduct = async (product: Product) => { if (!await confirmAction(`Delete ${product.name}?`, 'This product will be removed from the catalog.')) return; try { await adminApi.deleteProduct(product.id); setRemovedIds((current) => [...current, product.id]); void alertSuccess('Product deleted') } catch { setActionError(`Could not delete ${product.name}.`) } }
  const openEdit = (product: Product) => { setEditing(product); setMediaFiles([]); setEditForm({ name: product.name, malayalam: product.malayalam, price: String(product.price), stockQuantity: String(product.stockQuantity ?? 0), unit: product.unit, cut: product.cut, weight: product.weight }) }
  const hasCutType = /fish|chicken|meat/i.test(editing?.category ?? "")
  const saveEdit = async (event: FormEvent) => { event.preventDefault(); if (!editing || editing.categoryId == null) { setActionError('This product has no category and cannot be updated.'); return } setSaving(true); setActionError(''); try { await adminApi.updateProduct(editing.id, { category_id: editing.categoryId, name_en: editForm.name, name_ml: editForm.malayalam, base_price: Number(editForm.price), stock_quantity: Number(editForm.stockQuantity), unit: editForm.unit, cut_type: hasCutType ? editForm.cut : undefined, weight_note: editForm.weight }); await Promise.all(mediaFiles.map((item) => adminApi.uploadMedia(editing.id, item.file, item.type))); setEditing(null); void alertSuccess('Product updated'); window.location.reload() } catch { setActionError(`Could not update ${editing.name} or its media.`) } finally { setSaving(false) } }

  return <>
    <section className="section-heading">
      <div><h2>Today&apos;s products</h2><p>Curated from this afternoon&apos;s price list</p></div>
      <button type="button" className="text-button" onClick={() => setActiveCategoryId(null)}>View full catalog <ArrowRight size={16} /></button>
    </section>
    <div className="toolbar">
      <div className="category-tabs">
        <button type="button" className={activeCategoryId === null ? 'selected' : ''} onClick={() => { setActiveCategoryId(null); setPage(1) }}>{ALL_CATEGORY_LABEL}</button>
        {categories.map((category) => (
          <button type="button" key={category.id} className={activeCategoryId === category.id ? 'selected' : ''} onClick={() => { setActiveCategoryId(category.id); setPage(1) }}>{category.name}</button>
        ))}
      </div>
      <label className="search-box"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search products" /></label>
    </div>
    {(error || actionError) && <p className="catalog-notice">{error || actionError}</p>}
    {loading ? <p className="catalog-notice">Loading today&apos;s products…</p> : visibleProducts.length === 0 ? <div className="catalog-empty"><h3>No products found</h3><p>Try another search or choose a different category.</p>{search && <button type="button" className="outline-button" onClick={() => setSearch('')}>Clear search</button>}</div> : <><div className="product-grid">{pagedProducts.map((product) => <ProductCard key={product.id} product={product} onAdd={onAddToCart} admin={admin} onDelete={deleteProduct} onEdit={openEdit} />)}</div>{pageCount > 1 && <nav className="catalog-pagination" aria-label="Product pages"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></nav>}</>}
    {editing && <div className="product-edit-backdrop" onClick={() => setEditing(null)}><form className="product-edit-modal" onSubmit={saveEdit} onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow"><Pencil size={13} /> PRODUCT EDITOR</span><h2>Edit product</h2><p>Update product details and add media files.</p></div><button type="button" className="icon-button" onClick={() => setEditing(null)} aria-label="Close"><X size={18} /></button></header><div className="product-edit-form"><label><span>Name</span><input required value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} /></label><label><span>Malayalam name</span><input value={editForm.malayalam} onChange={(event) => setEditForm({ ...editForm, malayalam: event.target.value })} /></label><label><span>Price</span><input required min="0" type="number" value={editForm.price} onChange={(event) => setEditForm({ ...editForm, price: event.target.value })} /></label><label><span>Unit</span><input required value={editForm.unit} onChange={(event) => setEditForm({ ...editForm, unit: event.target.value })} /></label>{hasCutType && <label><span>Cut type</span><input value={editForm.cut} onChange={(event) => setEditForm({ ...editForm, cut: event.target.value })} /></label>}<label><span>Weight note</span><input value={editForm.weight} onChange={(event) => setEditForm({ ...editForm, weight: event.target.value })} /></label><label className="product-media-editor"><span>Product media</span><small>Upload new images or videos. Existing media is kept until a delete endpoint is available.</small><input type="file" accept="image/*,video/*" multiple onChange={(event) => setMediaFiles(Array.from(event.target.files ?? []).map((file) => ({ file, type: file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE' })))} />{mediaFiles.length > 0 && <em>{mediaFiles.length} file{mediaFiles.length > 1 ? 's' : ''} selected</em>}</label></div><footer><button type="button" className="modal-cancel" onClick={() => setEditing(null)}>Cancel</button><button type="submit" className="modal-save" disabled={saving}><Check size={15} /> {saving ? 'Saving…' : 'Save changes'}</button></footer></form></div>}
  </>
}
