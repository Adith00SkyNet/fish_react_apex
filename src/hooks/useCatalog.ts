import { useEffect, useState } from 'react'
import { catalogApi, isApiConfigured } from '../api/client'
import type { Category, Product } from '../types/product'
import { mapCategoryDto, mapProductDto } from '../utils/mappers'

type CatalogState = {
  categories: Category[]
  products: Product[]
  loading: boolean
  error: string
  isLive: boolean
}

export function useCatalog(): CatalogState {
  const [state, setState] = useState<CatalogState>({
    categories: [],
    products: [],
    loading: isApiConfigured,
    error: '',
    isLive: false,
  })

  useEffect(() => {
    if (!isApiConfigured) return
    let cancelled = false

    const load = async () => {
      setState((current) => ({ ...current, loading: true, error: '' }))
      try {
        const [categoryDtos, productDtos] = await Promise.all([
          catalogApi.categories(),
          catalogApi.products(),
        ])
        if (cancelled) return
        const categories = categoryDtos.map(mapCategoryDto)
        const categoryNameById = new Map(categories.map((category) => [category.id, category.name]))
        const products = productDtos.map((dto) =>
          mapProductDto(dto, categoryNameById.get(dto.category_id) ?? ''),
        )
        setState({ categories, products, loading: false, error: '', isLive: true })
      } catch {
        if (cancelled) return
        setState({
          categories: [],
          products: [],
          loading: false,
          error: 'Could not reach ORDS. No catalog data is available.',
          isLive: false,
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
