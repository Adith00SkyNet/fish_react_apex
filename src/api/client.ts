import axios from 'axios'
import { alertError } from '../utils/alerts'
import type {
  AuthResponseDto,
  AuthUserDto,
  CategoryDto,
  CategoryPayload,
  CreateOrderPayload,
  OrderDto,
  OrderTrackingDto,
  OrderStatus,
  ParsedPriceListRow,
  ProductDto,
  Role,
} from '../types/api'

export const ORDS_BASE_URL = import.meta.env.VITE_ORDS_BASE_URL || '/ords/skynetspace/api/v1'
// The ORDS handler must use this exact APEX page in order_meta.return_url.
// APEX sessions are dynamic and must not be appended or hardcoded.
export const FRONTEND_BASE_URL = 'https://oracleapex.com/ords/r/skynetspace3/7seafish/shop'
export const CASHFREE_MODE: 'sandbox' | 'production' = import.meta.env.VITE_CASHFREE_MODE === 'production' ? 'production' : 'sandbox'

// True once a real ORDS base URL has been configured. Screens use this to
// fall back to local demo data / simulated actions so the app stays
// previewable before the backend exists, without scattering env checks.
export const isApiConfigured = Boolean(import.meta.env.VITE_ORDS_BASE_URL)

export const apiClient = axios.create({
  baseURL: ORDS_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('fishshop_access_token')
  if (token) config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      window.dispatchEvent(new Event('fishshop:unauthorized'))
    }
    if (error?.response?.status !== 401) {
      const message = error?.response?.data?.message ?? error?.response?.data?.error
      void alertError('Request failed', typeof message === 'string' ? message : 'Please try again.')
    }
    return Promise.reject(error)
  },
)

// Some PL/SQL-backed list endpoints return a bare array; others (confirmed:
// GET /orders/my) wrap it in an envelope object, e.g. { user_id, orders }.
// Unwrap defensively so a screen never crashes on `.map` because the
// backend chose an envelope for one endpoint and not another.
function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const values = Object.values(data as Record<string, unknown>)
    const arrayField = values.find((value) => Array.isArray(value))
    if (arrayField) return arrayField as T[]
  }
  return []
}

function unwrapItem<T>(data: unknown): T {
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown[] }).items)) {
    return ((data as { items: unknown[] }).items[0] ?? {}) as T
  }
  return data as T
}

export const authApi = {
  login: (phone: string, password: string) =>
    apiClient.post<AuthResponseDto>('/auth/login', { phone, password }),
  register: (payload: { name: string; phone: string; email: string; address: string; password: string; role?: Role }) =>
    apiClient.post<AuthResponseDto>('/auth/register', payload),
  me: () => apiClient.get<AuthUserDto>('/users/me'),
}

export const catalogApi = {
  categories: () => apiClient.get('/categories').then((response) => unwrapList<CategoryDto>(response.data)),
  products: (categoryId?: number) =>
    apiClient
      .get('/products', { params: categoryId ? { category_id: categoryId } : undefined })
      .then((response) => unwrapList<ProductDto>(response.data)),
  product: (id: number) => apiClient.get(`/products/${id}`).then((response) => ({ ...response, data: unwrapItem<ProductDto>(response.data) })),
  mediaUrl: (productId: number, mediaId: number) => `${ORDS_BASE_URL}/products/${productId}/media/${mediaId}`,
  media: (productId: number, mediaId: number) => apiClient.get(`/products/${productId}/media/${mediaId}`, { responseType: 'blob' }),
}

export const orderApi = {
  create: (payload: CreateOrderPayload) => apiClient.post<OrderDto>('/orders', payload),
  mine: () => apiClient.get('/orders/my').then((response) => unwrapList<OrderDto>(response.data)),
  cancel: (id: number) => apiClient.put<OrderDto>(`/orders/${id}/cancel`),
  getOrderTracking: (orderId: number) => apiClient.get<OrderTrackingDto>(`/orders/${orderId}/tracking`),
}

export type CashfreePaymentResponse = {
  success: boolean
  message: string
  payment_id: number
  order_id: number
  amount: number
  currency: string
  gateway: 'CASHFREE'
  gateway_order_id: string
  payment_session_id: string
  status: string
}

export const paymentApi = {
  createCashfree: (orderId: number) =>
    apiClient.post<CashfreePaymentResponse>('/payments/cashfree/create', { order_id: orderId }),
  verifyCashfree: (orderId: number) =>
    apiClient.get('/payments/cashfree/verify/' + orderId),
}


export const deliveryApi = {
  assigned: () => apiClient.get('/delivery/orders').then((response) => unwrapList<OrderDto>(response.data)),
  assign: (orderId: number, deliveryPersonId: number) =>
    apiClient.post('/admin/delivery-orders', { order_id: orderId, delivery_person_id: deliveryPersonId }),
  updateStatus: (id: number, status: OrderStatus) =>
    apiClient.put<OrderDto>(`/orders/${id}/status`, { status }),
  updateDeliveryLocation: (orderId: number, latitude: number, longitude: number) =>
    apiClient.post(`/delivery/orders/${orderId}/location`, { latitude, longitude }),
}

export const adminApi = {
  createCategory: (payload: CategoryPayload) => apiClient.post<CategoryDto>('/categories', payload),
  getCategory: (id: number) => apiClient.get<CategoryDto>(`/admin/categories/${id}`).then((response) => ({ ...response, data: unwrapItem<CategoryDto>(response.data) })),
  updateCategory: (id: number, payload: Partial<CategoryPayload>) =>
    apiClient.put<CategoryDto>(`/admin/categories/${id}`, payload),
  deleteCategory: (id: number) => apiClient.delete(`/admin/categories/${id}`),
  createProduct: (payload: Partial<ProductDto>) => apiClient.post<ProductDto>('/products', payload),
  updateProduct: (id: number, payload: Partial<ProductDto>) =>
    apiClient.put<ProductDto>(`/products/${id}`, payload),
  deleteProduct: (id: number) => apiClient.delete(`/products/${id}`),
  uploadMedia: (productId: number, file: File, mediaType: 'IMAGE' | 'VIDEO') => {
    const form = new FormData()
    form.append('file', file)
    form.append('media_type', mediaType)
    return apiClient.post(`/admin/products/${productId}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  postMedia: (productId: number, mediaId: number, file: File, mediaType: 'IMAGE' | 'VIDEO') => {
    const form = new FormData()
    form.append('file', file)
    form.append('media_type', mediaType)
    return apiClient.post(`/products/${productId}/media/${mediaId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  parsePriceList: (rawText: string) => apiClient.post<ParsedPriceListRow[]>('/admin/price-lists/parse', { raw_text: rawText }),
  publishPriceList: (payload: { title: string; items: { product_id: number; price: number; unit: string }[] }) =>
    apiClient.post('/admin/price-lists', payload),
  orders: (params?: { status?: string }) =>
    apiClient.get('/orders', { params }).then((response) => unwrapList<OrderDto>(response.data)),
  updateStatus: (orderId: number, status: OrderStatus) =>
    apiClient.put<OrderDto>(`/orders/${orderId}/status`, { status }),
  deliveryPartners: () => apiClient.get('/admin/delivery-partners').then((response) => unwrapList(response.data)),
  createDeliveryPartner: (payload: { name: string; phone: string; email: string; address: string; password: string }) =>
    apiClient.post('/admin/delivery-partners', payload),
  updateDeliveryPartner: (id: number, payload: { is_active: number }) =>
    apiClient.put(`/admin/delivery-partners/${id}`, payload),
  assignOrder: (orderId: number, deliveryPersonId: number) =>
    apiClient.put(`/admin/orders/${orderId}/assign`, { delivery_person_id: deliveryPersonId }),
}
