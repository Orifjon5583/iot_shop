import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, EffectFade, Pagination, Navigation } from 'swiper/modules'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { SLIDES } from '../../data/slides'
import api from '../../api/axios'

import 'swiper/css'
import 'swiper/css/effect-fade'
import 'swiper/css/navigation'
import 'swiper/css/pagination'

const FALLBACK_IMAGES = {
  s1: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=3840&h=2160&fit=crop&q=90',
  s2: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=3840&h=2160&fit=crop&q=90',
  s3: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=3840&h=2160&fit=crop&q=90',
}

export default function HeroSlider() {
  const { t } = useTranslation()
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/banners/active')
      .then(res => {
        const data = res.data?.data || res.data?.banners || []
        if (Array.isArray(data) && data.length > 0) {
          setBanners(data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Agar backend bannerlar bo'lsa ularni ko'rsat, aks holda static slides
  const useBanners = banners.length > 0

  return (
    <section className="hero-slider relative w-full h-[100svh] min-h-[520px] max-h-[900px] overflow-hidden">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination, Navigation]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        speed={800}
        autoplay={{ delay: 5500, disableOnInteraction: false }}
        pagination={{ clickable: true, dynamicBullets: true }}
        navigation={{ prevEl: '.hero-nav-prev', nextEl: '.hero-nav-next' }}
        loop
        className="hero-swiper h-full w-full"
      >
        {useBanners
          ? banners.map((banner, i) => (
              <SwiperSlide key={banner.id}>
                <div className="swiper-slide-inner absolute inset-0 flex items-center">
                  <img
                    src={banner.image}
                    alt={banner.title}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover aspect-video"
                    onError={(e) => { e.target.src = FALLBACK_IMAGES.s1 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-950/88 via-gray-950/55 to-gray-950/25" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-transparent to-gray-950/25" />
                  <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-10 pt-32 md:pt-40 pb-24">
                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.15 }}
                      className="max-w-2xl"
                    >
                      <span className="inline-block mb-4 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 border border-white/25 rounded-full bg-black/30 backdrop-blur-md">
                        Elektronikachi · {i + 1}/{banners.length}
                      </span>
                      <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] mb-4 drop-shadow-lg">
                        {banner.title}
                      </h1>
                      {banner.description && (
                        <p className="text-white/85 text-base md:text-xl max-w-lg leading-relaxed mb-8 drop-shadow-md">
                          {banner.description}
                        </p>
                      )}
                      <Link
                        to={banner.link || '/products'}
                        className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-900 font-bold text-sm rounded-full hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                      >
                        Ko'rish <ChevronRight size={18} />
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </SwiperSlide>
            ))
          : SLIDES.map((slide, i) => (
              <SwiperSlide key={slide.id}>
                <div className="swiper-slide-inner absolute inset-0 flex items-center">
                  <img
                    src={FALLBACK_IMAGES[slide.key]}
                    alt={t(`slides.${slide.key}_title`)}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover aspect-video"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-950/88 via-gray-950/55 to-gray-950/25" />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-950/75 via-transparent to-gray-950/25" />
                  <div className="relative z-10 w-full max-w-[1440px] mx-auto px-6 md:px-10 pt-32 md:pt-40 pb-24">
                    <motion.div
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, delay: 0.15 }}
                      className="max-w-2xl"
                    >
                      <span className="inline-block mb-4 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 border border-white/25 rounded-full bg-black/30 backdrop-blur-md">
                        {t('slides.badge')} · {i + 1}/{SLIDES.length}
                      </span>
                      <h1 className="font-display font-bold text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-white leading-[1.1] mb-4 drop-shadow-lg">
                        {t(`slides.${slide.key}_title`)}
                      </h1>
                      <p className="text-white/85 text-base md:text-xl max-w-lg leading-relaxed mb-8 drop-shadow-md">
                        {t(`slides.${slide.key}_sub`)}
                      </p>
                      <Link
                        to={slide.link}
                        className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-gray-900 font-bold text-sm rounded-full hover:bg-white/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                      >
                        {t(`slides.${slide.key}_cta`)}
                        <ChevronRight size={18} />
                      </Link>
                    </motion.div>
                  </div>
                </div>
              </SwiperSlide>
            ))}
      </Swiper>

      <button
        type="button"
        aria-label="Previous"
        className="hero-nav-prev absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border border-white/25 bg-white/10 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/20 transition-all"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        aria-label="Next"
        className="hero-nav-next absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full border border-white/25 bg-white/10 backdrop-blur-xl text-white flex items-center justify-center hover:bg-white/20 transition-all"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#0a0e17] to-transparent pointer-events-none z-10" />
    </section>
  )
}
