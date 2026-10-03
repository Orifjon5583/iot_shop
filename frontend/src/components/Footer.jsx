import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Send, Instagram, UserCheck } from 'lucide-react'
import { STORE } from '../data/store'
import { useTheme } from '../context/ThemeContext'

export default function Footer() {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  return (
    <footer className={`mt-16 border-t ${isLight ? 'border-slate-200 bg-slate-900' : 'border-white/10 bg-black/50 backdrop-blur-xl'}`}>
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-teal flex items-center justify-center text-white font-display font-bold text-sm shadow-lg overflow-hidden">
                <img src="/logo.png" alt={STORE.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
              </div>
              <div>
                <div className="text-white font-display font-semibold">{t('brand.title', STORE.name)}</div>
                <div className="text-white/40 text-xs">{t('brand.tagline')}</div>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              {STORE.address} — {t('footer.region_desc')}.
            </p>
          </div>

          {/* Info links */}
          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-xs uppercase tracking-wider">{t('footer.info')}</h4>
            <div className="space-y-2.5">
              {[['/', t('nav.home')], ['/products', t('nav.products')], ['/about', t('nav.about')], ['/contact', t('nav.contact')]].map(([to, l]) => (
                <Link key={to} to={to} className="block text-white/50 text-sm hover:text-white transition-colors">
                  {l}
                </Link>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-xs uppercase tracking-wider">{t('footer.cats')}</h4>
            <div className="space-y-2.5">
              {['Arduino', 'Raspberry Pi', 'ESP Modullar', 'Sensorlar', 'Smart Home'].map((c) => (
                <Link key={c} to={`/products?cat=${encodeURIComponent(c)}`} className="block text-white/50 text-sm hover:text-white transition-colors">
                  {c}
                </Link>
              ))}
            </div>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="text-white/80 font-semibold mb-4 text-xs uppercase tracking-wider">{t('footer.contacts')}</h4>
            <div className="space-y-3 text-white/50 text-sm">
              <div className="flex items-start gap-2">
                <MapPin size={14} className="text-teal shrink-0 mt-0.5" />
                <span>{t('footer.address', STORE.address)}</span>
              </div>
              <a href={`tel:${STORE.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={14} className="text-teal shrink-0" />
                {STORE.phone}
              </a>
              <a href={`tel:${STORE.phone2.replace(/\s/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone size={14} className="text-teal shrink-0" />
                {STORE.phone2}
              </a>
              <a href={`mailto:${STORE.email}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail size={14} className="text-teal shrink-0" />
                {STORE.email}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">© {new Date().getFullYear()} {STORE.name}. {t('footer.rights')}.</p>
          <div className="flex flex-wrap items-center gap-3">
            <motion.a
              href={STORE.telegram}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              className="px-3.5 py-1.5 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:text-white hover:border-teal/50 text-xs font-semibold transition-all"
            >
              <Send size={13} className="text-teal" />
              <span>Telegram Kanal</span>
            </motion.a>
            <motion.a
              href={STORE.telegramAdmin}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              className="px-3.5 py-1.5 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:text-white hover:border-teal/50 text-xs font-semibold transition-all"
            >
              <UserCheck size={13} className="text-teal" />
              <span>Admin: {STORE.telegramAdminUsername}</span>
            </motion.a>
            <motion.a
              href={STORE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05, y: -2 }}
              className="px-3.5 py-1.5 flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 text-white/70 hover:text-white hover:border-pink-500/50 text-xs font-semibold transition-all"
            >
              <Instagram size={13} className="text-pink-400" />
              <span>@{STORE.instagramUsername}</span>
            </motion.a>
          </div>
        </div>
      </div>
    </footer>
  )
}
