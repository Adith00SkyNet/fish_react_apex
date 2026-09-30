import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { Product } from '../../types/product'
import { formatPrice } from '../../utils/format'

type ProductCardProps = { product: Product; onAdd: (product: Product) => void; admin?: boolean; onDelete?: (product: Product) => void; onEdit?: (product: Product) => void }

export function ProductCard({ product, onAdd, admin, onDelete, onEdit }: ProductCardProps) {
  const image = product.media?.find((item) => item.type === 'IMAGE')
  const outOfStock = product.stockQuantity != null && product.stockQuantity <= 0
  return <article className={`product-card ${outOfStock ? 'product-card-out' : ''}`}><div className={`product-art ${product.accent}`}>{image ? <img className="product-image" src={image.url} alt={product.name} onError={(event) => { event.currentTarget.style.display = 'none' }} /> : <span className="product-emoji">{product.emoji}</span>}<span className="fresh-label">{outOfStock ? 'OUT OF STOCK' : 'AVAILABLE'}</span>{admin ? <div className="admin-product-actions"><button type="button" className="admin-edit-button" onClick={() => onEdit?.(product)} aria-label={`Edit ${product.name}`}><Pencil size={14} /></button><button type="button" className="admin-delete-button" onClick={() => onDelete?.(product)} aria-label={`Delete ${product.name}`}><Trash2 size={14} /></button></div> : <button type="button" className="quick-add" disabled={outOfStock} onClick={() => onAdd(product)} aria-label={outOfStock ? `${product.name} is out of stock` : `Add ${product.name} to cart`}><Plus size={17} /></button>}</div><div className="product-info"><div className="product-title"><div><h3>{product.name}</h3><p>{product.malayalam}</p></div><span className="product-price">{formatPrice(product.price)}<small> / {product.unit}</small></span></div><div className="product-meta"><span>Qty: {product.stockQuantity ?? '—'}</span><span>{product.weight}</span></div></div></article>
}
