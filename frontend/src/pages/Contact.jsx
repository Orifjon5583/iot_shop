import { useState, useEffect } from 'react'
import { usePersistedState } from '../hooks/usePersistedState'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, Navigation, Car, Footprints, MessageSquare, Instagram, UserCheck } from 'lucide-react'
import StoreMap from '../components/map/StoreMap'
import Chat247 from '../components/contact/Chat247'
import { STORE } from '../data/store'
import { FormInput, FormTextarea } from '../components/ui/FormField'
import api from '../api/axios'
import { toast } from 'react-hot-toast'
import { useApp } from '../context/AppContext'

export default function Contact() {
  const { t } = useTranslation()
  const { user } = useApp()
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm, clearForm] = usePersistedState('iot_form_contact', {
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    subject: '',
    message: '',
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // User login bo'lsa maydonlarni to'ldirish
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
      }))
    }
  }, [user])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      toast.error(t('contact.err_fill'))
      return
    }
    setLoading(true)
    try {
      await api.post('/messages', {
        name: form.name,
        email: form.email,
        phone: form.phone || '',
        subject: form.subject || 'Sayt orqali murojaat',
        message: form.message,
        userId: user?.id || null,
      })
      setSent(true)
      clearForm()
      toast.success(t('contact.success_msg'))
      setTimeout(() => setSent(false), 5000)
    } catch (err) {
      toast.error(err.response?.data?.message || t('contact.err_msg'))
    } finally {
      setLoading(false)
    }
  }

  const items = [
    { icon: MapPin, title: t('contact.address'), value: STORE.address },
    { icon: Phone, title: `${t('contact.phone')} 1`, value: STORE.phone, href: `tel:${STORE.phone.replace(/\s/g, '')}` },
    { icon: Phone, title: `${t('contact.phone')} 2`, value: STORE.phone2, href: `tel:${STORE.phone2.replace(/\s/g, '')}` },
    { icon: MessageSquare, title: 'Telegram Kanal', value: 't.me/elektronikachi_uz', href: STORE.telegram, external: true },
    { icon: UserCheck, title: 'Telegram Admin', value: STORE.telegramAdminUsername, href: STORE.telegramAdmin, external: true },
    { icon: Instagram, title: 'Instagram', value: `@${STORE.instagramUsername}`, href: STORE.instagram, external: true },
    { icon: Clock, title: t('contact.hours'), value: STORE.hours },
  ]

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-32 md:pt-36 pb-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
        <h1 className="text-white font-display font-bold text-4xl md:text-5xl mb-3">{t('nav.contact')}</h1>
        <p className="text-white/55 text-lg max-w-xl mx-auto">{t('contact.subtitle')}</p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-10 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          {items.map(({ icon: Icon, title, value, href }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-start gap-4 p-5 rounded-[15px] border border-white/12 bg-white/[0.06] hover:border-white/20 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-teal flex items-center justify-center shrink-0">
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white/45 text-xs uppercase tracking-wider mb-1">{title}</p>
                {href ? (
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="text-white font-medium hover:text-teal transition-colors"
                  >
                    {value}
                  </a>
                ) : (
                  <p className="text-white font-medium">{value}</p>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.form
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onSubmit={submit}
          className="rounded-[15px] border border-white/12 bg-white/[0.06] p-6 md:p-8 space-y-4"
        >
          <h3 className="text-white font-bold text-xl mb-2">{t('contact.form_title')}</h3>
          <FormInput
            label={t('contact.name_ph')}
            type="text"
            placeholder={t('contact.name_ph')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <FormInput
            label={t('contact.email_ph')}
            type="email"
            placeholder={t('contact.email_ph')}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <FormInput
            label={t('contact.phone_opt')}
            type="text"
            placeholder="+998 90 123 45 67"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <FormInput
            label={t('contact.subject')}
            type="text"
            placeholder={t('contact.subject_ph')}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
          <FormTextarea
            label={t('contact.message_ph')}
            placeholder={t('contact.message_ph')}
            rows={5}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <motion.button
            type="submit"
            disabled={loading || sent}
            whileHover={{ scale: loading ? 1 : 1.01 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary to-teal text-white font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : sent ? (
              <CheckCircle size={18} />
            ) : (
              <Send size={18} />
            )}
            {sent ? t('contact.sent') : loading ? t('contact.sending') : t('contact.send')}
          </motion.button>
        </motion.form>
      </div>

      <div className="mb-12">
        <h2 className="text-white font-display font-bold text-2xl mb-2 flex items-center gap-3">
          <span className="w-1 h-8 bg-gradient-to-b from-primary to-teal rounded-full" />
          {t('chat.section_title')}
        </h2>
        <p className="text-white/50 text-sm mb-6 ml-4">{t('chat.section_desc')}</p>
        <Chat247 />
      </div>

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-white font-display font-bold text-2xl flex items-center gap-3">
              <span className="w-1 h-8 bg-gradient-to-b from-primary to-teal rounded-full" />
              {t('contact.map_title')}
            </h2>
            <p className="text-white/50 text-sm mt-2 ml-4">{STORE.region}, {STORE.city} — {t('contact.map_note')}</p>
          </div>

          <div className="flex flex-wrap gap-2 ml-4 md:ml-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-medium">
              <Car size={13} /> {t('map.center')}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-medium">
              <Footprints size={13} /> {t('map.walk')}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/25 text-violet-300 text-xs font-medium">
              <Navigation size={13} /> {t('map.gps')}
            </span>
          </div>
        </div>

        <StoreMap height={420} />
      </motion.div>
    </div>
  )
}
