import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Zap, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error(t('auth.emailPasswordRequired', 'Email va parol kiritilishi shart'))
    setLoading(true)
    try {
      await login(form.email, form.password)
      toast.success(t('auth.loginSuccess'))
      navigate('/admin/dashboard')
    } catch (err) {
      toast.error(err?.response?.data?.message || t('auth.loginError'))
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      {/* BG blobs */}
      <div className="login-bg-blob" style={{ width: 400, height: 400, background: 'rgba(99,102,241,0.15)', top: -100, left: -100 }} />
      <div className="login-bg-blob" style={{ width: 300, height: 300, background: 'rgba(6,182,212,0.1)', bottom: -80, right: -80 }} />

      <motion.div
        className="login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          }}>
            <Zap size={22} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>Elektronikachi</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Admin Panel</div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: 'var(--text-primary)' }}>
          {t('auth.login')}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
          {t('auth.loginSubtitle', 'Boshqaruv paneliga kirish')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ui-input-wrap">
            <label className="ui-label">{t('auth.email')}</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="ui-input"
                type="email"
                style={{ paddingLeft: 36 }}
                placeholder="admin@iotmarket.uz"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="ui-input-wrap">
            <label className="ui-label">{t('auth.password')}</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                className="ui-input"
                type={showPass ? 'text' : 'password'}
                style={{ paddingLeft: 36, paddingRight: 40 }}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <motion.button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: 44, fontSize: 14, marginTop: 4 }}
            disabled={loading}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? 'Kirish...' : t('auth.login')}
          </motion.button>
        </form>

        <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Faqat ruxsat etilgan adminlar kirishi mumkin
        </p>
      </motion.div>
    </div>
  )
}
