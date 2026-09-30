import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, MapPin, Phone, UserRound } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import './AuthPage.css'

type AuthMode = 'login' | 'register'

export function AuthPage() {
  const { login, register, authError, submitting } = useAuth()
  const [mode, setMode] = useState<AuthMode>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', password: '' })

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }))

  const switchMode = (nextMode: AuthMode) => setMode(nextMode)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      if (mode === 'login') await login(form.phone, form.password)
      else await register({ name: form.name, phone: form.phone, email: form.email, address: form.address, password: form.password })
    } catch {
      // authError is already set by the context; nothing further to do here.
    }
  }

  return <main className="auth-shell">
    <section className="auth-story">
      <div className="auth-brand"><img className="app-logo" src="/logo.jpeg" alt="& SEA FISH" /></div>
      <div className="story-copy"><span className="eyebrow auth-eyebrow">ALAPPUZHA · FRESH FROM THE COAST</span><h1>Good food starts with good ingredients.</h1><p>Bring the day&apos;s best seafood home, prepared just the way you like it.</p></div>
      <div className="story-footer"><span><CheckCircle2 size={15} /> Daily product updates</span><span><CheckCircle2 size={15} /> Same-day delivery</span></div>
    </section>
    <section className="auth-panel"><div className="auth-form-wrap">
      <div className="auth-mobile-brand"><img className="app-logo" src="/logo.jpeg" alt="& SEA FISH" /></div>
      <div className="auth-heading"><span className="eyebrow">WELCOME TO & SEA FISH</span><h2>{mode === 'login' ? 'Welcome back.' : 'Join the harbor.'}</h2><p>{mode === 'login' ? 'Sign in to manage your catch and deliveries.' : 'Create an account for fresh seafood at your door.'}</p></div>
      <div className="auth-tabs"><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Sign in</button><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Create account</button></div>
      <form className="auth-form" onSubmit={submit}>
        {mode === 'register' && <label><span>Full name</span><div className="input-wrap"><UserRound size={17} /><input required value={form.name} onChange={(event) => updateField('name', event.target.value)} placeholder="Your name" /></div></label>}
        <label><span>Phone number</span><div className="input-wrap"><Phone size={17} /><input required type="tel" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+91 98765 43210" /></div></label>
        {mode === 'register' && <label><span>Email</span><div className="input-wrap"><Mail size={17} /><input required type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" /></div></label>}
        {mode === 'register' && <label><span>Delivery address</span><div className="input-wrap"><MapPin size={17} /><input required value={form.address} onChange={(event) => updateField('address', event.target.value)} placeholder="House name, street, town" /></div></label>}
        <label><span>Password</span><div className="input-wrap"><LockKeyhole size={17} /><input required minLength={6} type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="At least 6 characters" /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
        {mode === 'login' && <div className="form-options"><label className="remember"><input type="checkbox" /> <span>Remember me</span></label><button type="button" className="forgot">Forgot password?</button></div>}
        {authError && <p className="auth-error">{authError}</p>}
        <button type="submit" className="auth-submit" disabled={submitting}>{submitting ? 'Connecting...' : mode === 'login' ? 'Sign in to workspace' : 'Create my account'} <ArrowRight size={17} /></button>
      </form>
      <p className="auth-switch">{mode === 'login' ? 'New to & SEA FISH?' : 'Already have an account?'} <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
      <small className="auth-note">By continuing, you agree to our terms and privacy policy.</small>
    </div></section>
  </main>
}
