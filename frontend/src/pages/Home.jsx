import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronRight } from 'lucide-react'
import HeroSlider from '../components/slider/HeroSlider'
import PopularCategories from '../components/home/PopularCategories'
import PopularSections from '../components/home/PopularSections'
import { PRODUCTS } from '../data'
import ProductCard from '../components/ProductCard'
import SEO from '../components/common/SEO'
import { STORE } from '../data/store'

function Section({ title, children, linkTo, linkLabel, t }) {
  return (
    <section className="py-12 md:py-16">
      <div className="flex items-end justify-between mb-8 gap-4">
        <motion.h2
          initial={{ opacity: 0, x: -16 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-white font-display font-bold text-2xl md:text-3xl flex items-center gap-3"
        >
          <span className="w-1 h-9 bg-gradient-to-b from-primary to-teal rounded-full" />
          {title}
        </motion.h2>
        {linkTo && (
          <Link
            to={linkTo}
            className="flex items-center gap-1 text-sm font-semibold text-white/50 hover:text-teal transition-colors shrink-0"
          >
            {linkLabel || t('common.view_all')}
            <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

import ProductSkeleton from '../components/common/ProductSkeleton'

export default function Home() {
  const { t } = useTranslation()
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  useEffect(() => {
    api.get('/products?limit=16&status=active')
      .then(res => {
        const data = res.data?.data || res.data?.products || []
        setProducts(data)
      })
      .catch(() => {
        setProducts([])
      })
      .finally(() => setLoadingProducts(false))
  }, [])

  const hotProducts = products.filter(p => p.badge).slice(0, 8)
  const newProducts = products.slice(0, 8)

  return (
    <div>
      <SEO 
        title={t('nav.home')} 
        description={t('brand.desc') || `${STORE.name} — IoT, Arduino, ESP32, Raspberry Pi. Professional elektronika do'koni.`}
        schemaData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": STORE.name,
          "url": typeof window !== 'undefined' ? window.location.origin : ''
        }}
      />
      <HeroSlider />

      <div className="max-w-[1440px] mx-auto px-4 md:px-6 -mt-4 relative z-10">
        <PopularCategories />

        <Section title={t('hot.title')} linkTo="/products" t={t}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {loadingProducts
              ? Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
              : (hotProducts.length > 0 ? hotProducts : products.slice(0, 8)).map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))
            }
          </div>
        </Section>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[15px] my-10 border border-white/15 bg-gradient-to-r from-primary/25 via-teal/20 to-cyan-500/15 backdrop-blur-sm"
        >
          <div className="relative z-10 p-8 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-lg">
              <span className="text-teal text-xs font-bold uppercase tracking-widest">{t('promo.label')}</span>
              <h3 className="text-white font-display font-bold text-2xl md:text-4xl mt-2 mb-3">
                {t('promo.title')} <span className="text-teal">{t('promo.highlight')}</span>
              </h3>
              <p className="text-white/60 text-sm md:text-base leading-relaxed">{t('promo.desc')}</p>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white text-gray-900 font-bold rounded-full hover:shadow-xl transition-all hover:-translate-y-0.5 shrink-0"
            >
              {t('promo.cta')}
              <ArrowRight size={18} />
            </Link>
          </div>
        </motion.div>

        <PopularSections />

        <Section title={t('new.title')} linkTo="/products" t={t}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {loadingProducts
              ? Array(8).fill(0).map((_, i) => <ProductSkeleton key={i} />)
              : newProducts.map((p, i) => (
                  <ProductCard key={p.id} product={p} index={i} />
                ))
            }
          </div>
        </Section>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pb-16"
        >
          <div className="rounded-[15px] border border-white/12 bg-white/[0.06] backdrop-blur-sm p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <div className="text-teal text-xs font-bold uppercase tracking-widest mb-3">{t('about_sec.label')}</div>
                <h2 className="text-white font-display font-bold text-3xl mb-4">{t('about_sec.title')}</h2>
                <p className="text-white/60 leading-relaxed mb-4">{t('about_sec.desc')}</p>
                <ul className="space-y-2 text-white/50 text-sm">
                  <li className="flex items-center gap-2"><span className="text-teal">✓</span>{t('about_sec.point1')}</li>
                  <li className="flex items-center gap-2"><span className="text-teal">✓</span>{t('about_sec.point2')}</li>
                  <li className="flex items-center gap-2"><span className="text-teal">✓</span>{t('about_sec.point3')}</li>
                </ul>
                <Link to="/about" className="inline-flex items-center gap-2 mt-6 text-teal font-semibold text-sm hover:gap-3 transition-all">
                  {t('about_sec.more')} <ArrowRight size={16} />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  [`${products.length > 0 ? products.length + '+' : '120+'}`, t('stats.products')],
                  ['10K+', t('stats.clients')],
                  ['99%', t('stats.quality')],
                  ['24/7', t('stats.support')],
                ].map(([n, l]) => (
                  <div key={l} className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                    <div className="text-2xl font-display font-bold stat-number">{n}</div>
                    <div className="text-white/45 text-xs mt-1">{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  )
}
