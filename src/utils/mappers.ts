import type { CategoryDto, ProductDto } from '../types/api'
import { ORDS_BASE_URL } from '../api/client'
import type { Category, Product, ProductMedia } from '../types/product'

const ACCENTS = ['coral', 'sun', 'mint', 'sky', 'lilac', 'blue']

export const accentFor = (id: number) => ACCENTS[Math.abs(id) % ACCENTS.length]

export function mapCategoryDto(dto: CategoryDto): Category {
  return { id: dto.category_id, name: dto.name_en ?? '', malayalam: dto.name_ml ?? '', sortOrder: dto.sort_order }
}

export function mapProductDto(dto: ProductDto, categoryName = ''): Product {
  const media: ProductMedia[] = dto.media_id != null
    ? [{ type: 'IMAGE', name: `${dto.name_en}-image`, url: `${ORDS_BASE_URL}/products/${dto.product_id}/media/${dto.media_id}`, mediaId: dto.media_id }]
    : (dto.media ?? []).map((item) => ({
    type: item.media_type,
    name: item.file_name,
    url: `${ORDS_BASE_URL}/products/${dto.product_id}/media/${item.media_id}`,
    mediaId: item.media_id,
  }))
  return {
    id: dto.product_id,
    name: dto.name_en ?? '',
    malayalam: dto.name_ml ?? '',
    category: categoryName,
    categoryId: dto.category_id,
    cut: dto.cut_type ?? '',
    unit: dto.unit,
    price: dto.base_price ?? 0,
    stockQuantity: dto.stock_quantity,
    weight: dto.weight_note ?? '',
    accent: accentFor(dto.product_id),
    emoji: dto.emoji ?? '🐟',
    media,
  }
}
