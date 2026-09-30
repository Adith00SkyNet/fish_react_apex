// Raw payload shapes as returned by the ORDS PL/SQL-backed modules.
// Assumption: handlers emit lower snake_case keys mirroring the Oracle column
// names (e.g. via apex_json). Adjust these DTOs if the actual modules differ —
// everything else in the app talks to the mapped view-model types in
// `types/product.ts`, never to these DTOs directly, so a shape change here is
// a one-file fix.

export type Role = 'ADMIN' | 'DELIVERY' | 'CUSTOMER'

export type CategoryDto = {
  category_id: number
  name_en: string
  name_ml: string | null
  sort_order: number
}

export type CategoryPayload = {
  name_en: string
  name_ml: string
  sort_order: number
}

export type ProductMediaDto = {
  media_id: number
  product_id: number
  media_type: 'IMAGE' | 'VIDEO'
  mime_type: string
  file_name: string
}

export type ProductDto = {
  product_id: number
  category_id: number
  name_en: string
  name_ml: string | null
  emoji: string | null
  cut_type: string | null
  unit: string
  base_price: number
  stock_quantity?: number
  weight_note: string | null
  is_active: number
  sort_order: number
  media_id?: number | null
  media?: ProductMediaDto[]
}

export type AuthUserDto = {
  user_id: number
  name: string
  phone: string
  email?: string
  address?: string
  role: Role
}

export type AuthResponseDto = {
  access_token?: string
  accessToken?: string
  token?: string
  refresh_token?: string
  user: AuthUserDto
}

export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'

export type OrderTrackingDto = {
  success: boolean
  order_id: number
  customer_id: number
  status: OrderStatus
  delivery_person_id: number | null
  delivery_person_name: string | null
  delivery_person_phone: string | null
  customer_location: { latitude: number | null; longitude: number | null } | null
  delivery_location: { latitude: number | null; longitude: number | null } | null
  location_updated_at: string | null
}

export type OrderItemDto = {
  order_item_id: number
  product_id: number
  product_name_en?: string
  product_name_ml?: string
  emoji?: string
  qty: number
  unit: string
  price_at_order: number
  subtotal: number
}

export type OrderDto = {
  order_id: number
  status: OrderStatus
  delivery_person_id?: number | null
  delivery_person_name?: string
  delivery_address: string
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_slot: string | null
  total_amount: number
  payment_status: 'PENDING' | 'PAID'
  payment_method: string
  placed_at: string
  delivered_at?: string | null
  customer_name?: string
  customer_phone?: string
  items?: OrderItemDto[]
}

export type CreateOrderPayload = {
  delivery_address: string
  delivery_latitude?: number | null
  delivery_longitude?: number | null
  delivery_slot?: string
  payment_method?: 'COD'
  items: { product_id: number; qty: number; unit: string }[]
}

export type ParsedPriceListRow = {
  emoji: string
  name_ml: string
  name_en: string
  price: number
  unit: string
  matched_product_id: number | null
}
