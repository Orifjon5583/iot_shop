import { useState, useEffect } from 'react'
import { usePersistedState } from '../hooks/usePersistedState'
import { motion } from 'framer-motion'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShoppingCart, Zap, Maximize2, ChevronRight, Send, Star } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useApp } from '../context/AppContext'
import ImageLightbox from '../components/product/ImageLightbox'
import StarRating from '../components/product/StarRating'
import api from '../api/axios'
import { getImageUrl, getAllImageUrls } from '../utils/image'
import SEO from '../components/common/SEO'

const PLACEHOLDER_IMG = 'https://placehold.co/400x400/1a1a1a/cccccc?text=No+Image'

export default function ReadyProductDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { addCart, user, isAuthenticated } = useApp()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [dbReviews, setDbReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('desc')
  const [imgIdx, setImgIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [reviewText, setReviewText, clearReviewText] = usePersistedState(`iot_rpd_review_${id}`, '')
  const [reviewRating, setReviewRating] = useState(5)

  useEffect(() => {
    setImgIdx(0)
    setQty(1)
    setTab('desc')
    setLoading(true)

    api.get(`/ready-products/${id}`)
      .then(res => {
        const p = res.data?.data || res.data
        if (p && p.id) {
          setProduct(p)
          api.get(`/ready-products?limit=5&status=active`)
            .then(r => {
              const related = (r.data?.data || [])
                .filter(rp => rp.id !== p.id)
                .slice(0, 4)
              setRelatedProducts(related)
            })
            .catch(() => setRelatedProducts([]))
        } else {
          throw new Error('not found')
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false))

    api.get(`/reviews/product/${id}`)
      .then(res => setDbReviews(res.data || []))
      .catch(() => setDbReviews([]))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen pt-32 px-4">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid md:grid-cols-2 gap-10 animate-pulse">
            <div className="h-96 bg-white/10 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-white/10 rounded w-3/4" />
              <div className="h-6 bg-white/10 rounded w-1/2" />
              <div className="h-12 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-32">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Not found</h2>
          <Link to="/ready-products" className="px-6 py-3 bg-gradient-to-r from-primary to-teal text-white rounded-xl font-semibold">{t('readyProductDetail.backToList')}</Link>
        </div>
      </div>
    )
  }

  const images = getAllImageUrls(product).filter(Boolean)
  const imgSrc = images[0] || getImageUrl(product) || product.image || PLACEHOLDER_IMG
  const catName = product.category?.name || product.category || ''

  const handleAddCart = () => {
    const item = { ...product, img: imgSrc, cat: catName, qty }
    addCart(item, qty)
    toast.success(t('sections.add_to_cart'))
  }

  const handleReview = async (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated()) {
      toast.error(t('readyProductDetail.loginToReview'))
      navigate('/login')
      return
    }
    if (!reviewText.trim()) {
      toast.error('Iltimos, sharh matnini kiriting')
      return
    }

    try {
      const productId = product.id || id
      await api.post('/reviews', {
        productId,
        rating: reviewRating,
        comment: reviewText,
      })
      toast.success(t('readyProductDetail.reviewAdded'))
      clearReviewText()
      setReviewRating(5)
      const res = await api.get(`/reviews/product/${id}`)
      setDbReviews(res.data || [])
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Xatolik yuz berdi'
      toast.error(errorMessage)
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-20">
      <SEO 
        title={product.name}
        description={product.description?.substring(0, 160) || 'Tayyor loyiha va sxemalar'}
        image={images[0]}
        type="product"
        schemaData={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "image": images,
          "description": product.description || 'Tayyor loyiha va sxemalar',
          "sku": product.id,
          "brand": {
            "@type": "Brand",
            "name": product.supplier || "Elektronikachi"
          },
          "offers": {
            "@type": "Offer",
            "url": typeof window !== 'undefined' ? `${window.location.origin}/ready-products/${product.id}` : `/ready-products/${product.id}`,
            "priceCurrency": "UZS",
            "price": product.price,
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
          }
        }}
      />
      <nav className="flex items-center gap-2 text-xs text-white/40 mb-8 flex-wrap">
        <Link to="/" className="hover:text-teal transition-colors">{t('nav.home')}</Link>
        <ChevronRight size={12} />
        <Link to="/ready-products" className="hover:text-teal transition-colors">{t('nav.readyProducts')}</Link>
        <ChevronRight size={12} />
        <span className="text-white/60 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14 mb-16">
        <div>
          <motion.div
            className="relative rounded-2xl overflow-hidden border border-white/12 bg-white/[0.04] cursor-zoom-in mb-3 aspect-square"
            onClick={() => setLightbox(true)}
            whileHover={{ scale: 1.01 }}
          >
            <img
              src={images[imgIdx] || imgSrc}
              alt={product.name}
              className="w-full h-full object-contain p-4"
              onError={e => { e.target.src = PLACEHOLDER_IMG }}
            />
            <button className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors">
              <Maximize2 size={15} />
            </button>
          </motion.div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 shrink-0 rounded-xl border overflow-hidden transition-all ${i === imgIdx ? 'border-teal/70 ring-2 ring-teal/30' : 'border-white/10 hover:border-white/25'}`}
                >
                  <img src={src} alt="" className="w-full h-full object-contain p-1" onError={e => { e.target.src = PLACEHOLDER_IMG }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <span className="text-teal text-xs font-bold uppercase tracking-widest">{catName}</span>
            <h1 className="text-white font-display font-bold text-2xl md:text-3xl mt-1 leading-snug">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={18} fill={s <= Math.round(product.rating || 0) ? '#facc15' : 'none'} stroke={s <= Math.round(product.rating || 0) ? '#facc15' : 'rgba(255,255,255,0.2)'} />
              ))}
            </div>
            <span className="text-white/40 text-sm">({product.reviews || 0} {t('readyProductDetail.reviews')})</span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">
              {(product.price || 0).toLocaleString()} <span className="text-lg text-white/50">{t('common.currency')}</span>
            </span>
            {product.oldPrice > 0 && (
              <span className="text-white/35 line-through text-lg">{product.oldPrice.toLocaleString()} {t('common.currency')}</span>
            )}
          </div>

          <div className={`inline-flex items-center gap-2 text-sm font-semibold ${product.inStock !== false ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${product.inStock !== false ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {product.inStock !== false ? t('readyProductDetail.inStock') : t('readyProductDetail.outOfStock')}
          </div>

          {product.features && product.features.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <h3 className="text-white text-sm font-semibold mb-2">{t('readyProductDetail.features')}</h3>
              <div className="flex flex-wrap gap-2">
                {product.features.map((f, i) => (
                  <span key={i} className="px-3 py-1 rounded-lg bg-white/8 text-white/60 text-xs border border-white/10">{f}</span>
                ))}
              </div>
            </div>
          )}

          {product.description && (
            <p className="text-white/55 text-sm leading-relaxed border-t border-white/10 pt-4">{product.description}</p>
          )}

          <div className="flex items-center gap-4">
            <span className="text-white/50 text-sm">{t('product.qty')}:</span>
            <div className="flex items-center gap-3 bg-white/[0.06] border border-white/12 rounded-xl px-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 text-white/60 hover:text-white font-bold text-lg transition-colors">−</button>
              <span className="text-white font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 text-white/60 hover:text-white font-bold text-lg transition-colors">+</button>
            </div>
          </div>

          <div className="flex gap-3 flex-col sm:flex-row">
            <motion.button
              onClick={handleAddCart}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-teal text-white font-bold shadow-lg shadow-primary/25"
            >
              <ShoppingCart size={18} /> {t('readyProductDetail.addToCart')}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {[
            ['desc', t('readyProductDetail.description')],
            ['reviews', `${t('readyProductDetail.reviews')} (${dbReviews.length})`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-5 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px ${tab === key ? 'border-teal text-teal' : 'border-transparent text-white/45 hover:text-white/70'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'desc' && (
            <div className="space-y-4">
              {product.description && (
                <p className="text-white/60 leading-relaxed text-sm md:text-base">{product.description}</p>
              )}
              {product.features && product.features.length > 0 && (
                <div>
                  <h3 className="text-white font-semibold mb-2">{t('readyProductDetail.features')}</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.features.map((f, i) => (
                      <span key={i} className="px-3 py-1 rounded-lg bg-white/8 text-white/60 text-xs border border-white/10">{f}</span>
                    ))}
                  </div>
                </div>
              )}
              {catName && (
                <div className="text-white/50 text-sm">
                  <span className="text-white/40">{t('readyProductDetail.category')}: </span>
                  <span className="text-white font-medium">{catName}</span>
                </div>
              )}
            </div>
          )}
          {tab === 'reviews' && (
            <div className="space-y-6 text-white" style={{ minHeight: '300px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{t('readyProductDetail.reviews')} ({dbReviews.length})</h3>
              </div>

              {dbReviews.length > 0 ? (
                <div className="space-y-4">
                  {dbReviews.map(r => (
                    <div key={r.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                      <div className="flex justify-between mb-2">
                        <span className="text-white font-semibold text-sm">{r.user?.username || 'User'}</span>
                        <span className="text-white/35 text-xs">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex text-amber-400 mb-2">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star key={idx} size={12} fill={idx < r.rating ? 'currentColor' : 'none'} opacity={idx < r.rating ? 1 : 0.3} />
                        ))}
                      </div>
                      <p className="text-white/60 text-sm">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm py-4">{t('readyProductDetail.noReviews')}</p>
              )}

              <form onSubmit={handleReview} className="pt-4 border-t border-white/10 space-y-3">
                <h4 className="text-white font-semibold">{t('readyProductDetail.writeReview')}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-white/50 text-sm">{t('readyProductDetail.rating')}:</span>
                  <StarRating value={reviewRating} onChange={setReviewRating} size={20} />
                </div>
                <textarea
                  placeholder={t('readyProductDetail.reviewPlaceholder')}
                  rows={3}
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-teal/50 resize-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-primary to-teal text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
                >
                  <Send size={15} /> {t('readyProductDetail.submitReview')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-white font-display font-bold text-xl md:text-2xl flex items-center gap-3 mb-6">
            <span className="w-1 h-7 bg-gradient-to-b from-primary to-teal rounded-full" />
            {t('readyProductDetail.related')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {relatedProducts.map(rp => (
              <Link key={rp.id} to={`/ready-product/${rp.id}`} className="block">
                <div className="bg-white/[0.06] border border-white/12 rounded-[15px] overflow-hidden hover:border-white/22 transition-all hover:-translate-y-1">
                  <div className="aspect-[4/3] bg-white/5 overflow-hidden">
                    <img
                      src={rp.image || PLACEHOLDER_IMG}
                      alt={rp.name}
                      className="w-full h-full object-cover"
                      onError={e => { e.target.src = PLACEHOLDER_IMG }}
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-white/45 text-[10px] uppercase tracking-wider mb-1">{rp.category?.name || ''}</p>
                    <h3 className="text-white font-medium text-sm leading-snug line-clamp-2">{rp.name}</h3>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} fill={s <= Math.round(rp.rating || 0) ? '#facc15' : 'none'} stroke={s <= Math.round(rp.rating || 0) ? '#facc15' : 'rgba(255,255,255,0.2)'} />
                      ))}
                    </div>
                    <div className="text-white font-bold text-[15px] mt-2">
                      {(rp.price || 0).toLocaleString()} {t('common.currency')}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {lightbox && images.length > 0 && (
        <ImageLightbox
          images={images}
          index={imgIdx}
          onClose={() => setLightbox(false)}
          onChange={(i) => setImgIdx(i)}
        />
      )}
    </div>
  )
}
