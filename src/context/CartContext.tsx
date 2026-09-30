import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Product } from '../types/product'

export type CartItem = { product: Product; qty: number }

type CartContextValue = {
  items: CartItem[]
  count: number
  subtotal: number
  isOpen: boolean
  open: () => void
  close: () => void
  add: (product: Product) => void
  increment: (productId: number) => void
  decrement: (productId: number) => void
  remove: (productId: number) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const add = (product: Product) => {
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        return current.map((item) => (item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item))
      }
      return [...current, { product, qty: 1 }]
    })
    setIsOpen(true)
  }

  const increment = (productId: number) =>
    setItems((current) => current.map((item) => (item.product.id === productId ? { ...item, qty: item.qty + 1 } : item)))

  const decrement = (productId: number) =>
    setItems((current) =>
      current
        .map((item) => (item.product.id === productId ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0),
    )

  const remove = (productId: number) => setItems((current) => current.filter((item) => item.product.id !== productId))

  const clear = () => setItems([])

  const count = items.reduce((sum, item) => sum + item.qty, 0)
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.product.price, 0)

  const value: CartContextValue = { items, count, subtotal, isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false), add, increment, decrement, remove, clear }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
