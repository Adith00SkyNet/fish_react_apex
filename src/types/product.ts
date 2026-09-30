export type ProductMedia = {
  type: 'IMAGE' | 'VIDEO'
  name: string
  url: string
  file?: File
  mediaId?: number
}

export type Product = {
  id: number
  name: string
  malayalam: string
  category: string
  categoryId: number | null
  cut: string
  unit: string
  price: number
  stockQuantity?: number
  weight: string
  accent: string
  emoji: string
  media?: ProductMedia[]
}

export type Category = {
  id: number
  name: string
  malayalam: string
  sortOrder: number
}

export type NavItem = {
  label: string
  icon: React.ComponentType<{ size?: number }>
}
