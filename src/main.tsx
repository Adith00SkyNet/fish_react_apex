import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext.tsx'
import { CartProvider } from './context/CartContext.tsx'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { PaymentResult } from './components/payments/PaymentResult'
import './index.css'
import App from './App.tsx'

function AppEntry() {
  const params = new URLSearchParams(window.location.search)
  const isCashfreeReturn = Boolean(
    params.get('order_id') || params.get('gateway_order_id') || params.get('database_order_id') ||
    window.sessionStorage.getItem('fishshop_pending_payment_order'),
  )
  return isCashfreeReturn ? <PaymentResult /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Routes>
            <Route path="*" element={<AppEntry />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
