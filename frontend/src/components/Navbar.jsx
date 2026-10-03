import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Menu, X, Heart, ShoppingCart, User, LogOut,
  LayoutGrid, MapPin, Phone, ChevronDown, Search, Moon, Sun
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useApp } from '../context/AppContext'
import LanguageSwitcher from './common/LanguageSwitcher'
import SmartSearch from './search/SmartSearch'
import CatalogDropdown from './layout/CatalogDropdown'
import { STORE } from '../data/store'
import { useScrollLock } from '../hooks/useScrollLock'
import { useNavbarScroll } from '../hooks/useNavbarScroll'

export default function Navbar({ onAuthClick, transparent = true }) {
  const { t } = useTranslation()
  const { user, logout, cart, favs } = useApp()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const { scrolled, hidden } = useNavbarScroll()
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [activeL1, setActiveL1] = useState(null)
  const [activeL2, setActiveL2] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const catalogBtnRef = useRef(null)
  const catalogTimer = useRef(null)

  useScrollLock(catalogOpen || mobileOpen)

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const isHome = location.pathname === '/'

  useEffect(() => {
    setMobileOpen(false)
    setCatalogOpen(false)
    setActiveL1(null)
    setActiveL2(null)
  }, [location.pathname])

  const openCatalog = () => {
    if (catalogBtnRef.current) {
      setAnchorRect(catalogBtnRef.current.getBoundingClientRect())
    }
    setCatalogOpen(true)
  }

  const closeCatalog = () => {
    setCatalogOpen(false)
    setActiveL1(null)
    setActiveL2(null)
  }

  const scheduleCloseCatalog = () => {
    catalogTimer.current = setTimeout(closeCatalog, 220)
  }

  const cancelCloseCatalog = () => {
    clearTimeout(catalogTimer.current)
  }

  const glass =
    scrolled || !transparent || !isHome
      ? 'bg-[#0a0e17]/85 border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
      : 'bg-[#0a0e17]/55 border-white/10'

  const navLinks = [
    ['/', t('nav.home')],
    ['/products', t('nav.products')],
    ['/ready-products', t('nav.readyProducts', 'Tayyor mahsulotlar')],
    ['/about', t('nav.about')],
    ['/contact', t('nav.contact')],
  ]

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50"
      initial={false}
      animate={{ y: hidden ? -120 : 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="hidden md:flex items-center justify-between px-6 py-1.5 text-[11px] text-white/60 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <MapPin size={12} className="text-teal shrink-0" />
            {STORE.region}
          </span>
          <a href={`tel:${STORE.phone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Phone size={12} className="text-teal shrink-0" />
            {STORE.phone}
          </a>
          <span className="text-white/20">|</span>
          <a href={`tel:${STORE.phone2.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-white transition-colors">
            <Phone size={12} className="text-teal shrink-0" />
            {STORE.phone2}
          </a>
        </div>
        <div className="flex items-center gap-3 text-white/65">
          <a href={STORE.telegram} target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">
            Telegram
          </a>
          <span className="text-white/20">•</span>
          <a href={STORE.telegramAdmin} target="_blank" rel="noopener noreferrer" className="hover:text-teal transition-colors">
            Admin ({STORE.telegramAdminUsername})
          </a>
          <span className="text-white/20">•</span>
          <a href={STORE.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition-colors">
            Instagram
          </a>
        </div>
      </div>

      <nav
        className={`flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 backdrop-blur-2xl border-b transition-colors duration-300 ${glass}`}
        style={{ WebkitBackdropFilter: 'saturate(180%) blur(20px)' }}
      >
        <Link to="/" className="flex items-center gap-2.5 mr-1 flex-shrink-0">
          <div className="relative w-11 h-11 rounded-[14px] overflow-hidden shadow-[0_0_20px_rgba(79,70,229,0.2)] flex-shrink-0">
            <img src="/logo.png" alt="Elektronikachi Logo" className="w-full h-full object-cover" onError={(e) => { e.target.src = '/logo.jpg' }} />
          </div>
            <div className="hidden sm:block">
              <div className="text-white font-display font-bold text-[15px] bg-gradient-to-r from-white to-white/80 bg-clip-text">{t('brand.title')}</div>
              <div className="text-white/40 text-[10px] tracking-widest uppercase">{t('brand.tagline')}</div>
            </div>
        </Link>

        <div
          className="relative"
          onMouseEnter={() => { cancelCloseCatalog(); openCatalog() }}
          onMouseLeave={scheduleCloseCatalog}
        >
          <button
            ref={catalogBtnRef}
            type="button"
            onClick={() => (catalogOpen ? closeCatalog() : openCatalog())}
            className={`catalog-btn flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-300 ${
              catalogOpen ? 'bg-white/15 ring-1 ring-white/20 shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'bg-gradient-to-r from-primary to-teal hover:shadow-[0_0_20px_rgba(0,175,163,0.4)]'
            }`}
          >
            <LayoutGrid size={17} />
            <span className="hidden sm:inline">{t('nav.catalog')}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${catalogOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <CatalogDropdown
          open={catalogOpen}
          onClose={closeCatalog}
          anchorRect={anchorRect}
          activeL1={activeL1}
          activeL2={activeL2}
          setActiveL1={setActiveL1}
          setActiveL2={setActiveL2}
          onPanelEnter={cancelCloseCatalog}
          onPanelLeave={scheduleCloseCatalog}
        />

        <div className="hidden lg:flex items-center gap-0.5">
          {navLinks.map(([to, label]) => (
            <Link
              key={to}
              to={to}
              className={`group relative px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                location.pathname === to ? 'text-white' : 'text-white/65 hover:text-white'
              }`}
            >
              <span className="relative z-10">{label}</span>
              <span
                className={`absolute inset-0 rounded-lg bg-white/10 transition-all duration-200 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 ${
                  location.pathname === to ? 'opacity-100 scale-100' : ''
                }`}
              />
            </Link>
          ))}
        </div>

        <div className="flex-1 min-w-2" />

        <SmartSearch navHidden={hidden} className="hidden md:block w-40 lg:w-52 xl:w-60 flex-shrink-0" />
        <LanguageSwitcher compact onOpenChange={setLangOpen} />

        <button type="button" onClick={toggleTheme} className="nav-icon-btn relative p-2.5 text-white/60 hover:text-white rounded-xl hover:bg-white/10" aria-label="Toggle Theme">
          {theme === 'dark' ? <Sun size={20} strokeWidth={1.75} /> : <Moon size={20} strokeWidth={1.75} />}
        </button>

        <Link to="/favorites" className="nav-icon-btn relative p-2.5 text-white/60 hover:text-white rounded-xl hover:bg-white/10">
          <Heart size={20} strokeWidth={1.75} />
          {favs.length > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
              {favs.length}
            </span>
          )}
        </Link>

        <Link to="/cart" className="nav-icon-btn relative p-2.5 text-white/60 hover:text-white rounded-xl hover:bg-white/10">
          <ShoppingCart size={20} strokeWidth={1.75} />
          {cartCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-primary rounded-full text-[9px] text-white font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </Link>

        {user ? (
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/15 hover:bg-white/12 transition-all"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-teal flex items-center justify-center text-white text-xs font-bold">
                {user.name[0].toUpperCase()}
              </div>
              <span className="text-white text-sm font-medium max-w-[72px] truncate">{user.name}</span>
            </button>
            <button type="button" onClick={logout} className="p-2.5 text-white/50 hover:text-white rounded-xl hover:bg-white/10" aria-label={t('auth.logout')}>
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2">
            <button type="button" onClick={() => navigate('/login')} className="flex items-center gap-1.5 px-3 py-2 text-white/70 hover:text-white text-sm rounded-xl border border-white/15 hover:bg-white/10">
              <User size={16} />
              <span className="hidden xl:inline">{t('auth.login')}</span>
            </button>
            <button type="button" onClick={() => navigate('/register')} className="px-3 py-2 bg-gradient-to-r from-primary to-teal text-white text-sm font-semibold rounded-xl">
              <span className="hidden xl:inline">{t('auth.register')}</span>
              <span className="xl:hidden">+</span>
            </button>
          </div>
        )}

        <button type="button" onClick={() => setMobileOpen((o) => !o)} className="lg:hidden p-2.5 text-white rounded-xl hover:bg-white/10" aria-label={t('common.menu')}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed right-0 top-0 bottom-0 w-[min(320px,88vw)] z-50 bg-[#0a0e17] border-l border-white/15 lg:hidden overflow-y-auto"
            >
              <div className="p-5 pt-24 flex flex-col gap-2">
                <SmartSearch navHidden={false} className="mb-4" />
                {navLinks.map(([to, label]) => (
                  <Link key={to} to={to} className="px-4 py-3.5 text-white/85 hover:text-white text-base font-medium rounded-xl hover:bg-white/10">
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  )
}
