import { useState, useEffect } from 'react'
import { usePersistedState } from '../hooks/usePersistedState'
import { motion } from 'framer-motion'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Heart, ShoppingCart, Zap, Maximize2, ChevronRight, Send, Star } from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../api/axios'
import SEO from '../components/common/SEO'
import { PRODUCTS } from '../data'
import { useApp } from '../context/AppContext'
import ProductCard from '../components/ProductCard'
import ImageLightbox from '../components/product/ImageLightbox'
import StarRating from '../components/product/StarRating'
import { FormInput, FormTextarea } from '../components/ui/FormField'
import { getImageUrl, getAllImageUrls } from '../utils/image'

export default function ProductDetail() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    addCart, toggleFav, isFav, getProductReviews, addReview,
    setProductRating, getUserRating, hasUserRating, user, isAuthenticated,
  } = useApp()

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [dbReviews, setDbReviews] = useState([])
  const [loading, setLoading] = useState(true)

  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('desc')
  const [imgIdx, setImgIdx] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [reviewText, setReviewText, clearReviewText] = usePersistedState(`iot_form_review_text_${id}`, '')
  const [reviewAuthor, setReviewAuthor, clearReviewAuthor] = usePersistedState(`iot_form_review_author_${id}`, '')

  useEffect(() => {
    setImgIdx(0)
    setQty(1)
    setTab('desc')
    setLoading(true)

    // Avval API dan olishga harakat qiladi
    api.get(`/products/${id}`)
      .then(res => {
        const p = res.data?.data || res.data
        if (p && p.id) {
          setProduct(p)
          // Related products - same category
          api.get(`/products?category=${p.category}&limit=5`)
            .then(r => {
              const related = (r.data?.data || r.data?.products || [])
                .filter(rp => rp.id !== p.id)
                .slice(0, 4)
              setRelatedProducts(related)
            })
            .catch(() => {
              setRelatedProducts(PRODUCTS.filter(rp => rp.cat === p.category && String(rp.id) !== String(id)).slice(0, 4))
            })
        } else {
          throw new Error('not found')
        }
      })
      .catch(() => {
        // Fallback: static data dan ID bo'yicha qidirish
        const staticProduct = PRODUCTS.find(p => String(p.id) === String(id))
        setProduct(staticProduct || null)
        if (staticProduct) {
          setRelatedProducts(PRODUCTS.filter(p => p.cat === staticProduct.cat && String(p.id) !== String(id)).slice(0, 4))
        }
      })
      .finally(() => setLoading(false))

    // Sharhlarni yuklash
    api.get(`/reviews/product/${id}`)
      .then(res => {
        setDbReviews(res.data || [])
      })
      .catch(() => {
        setDbReviews([])
      })

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
          <h2 className="text-2xl font-bold mb-4">{t('product.not_found')}</h2>
          <Link to="/" className="px-6 py-3 bg-primary text-white rounded-xl font-semibold">{t('common.home')}</Link>
        </div>
      </div>
    )
  }

  // Normalize product fields (backend: image/category, frontend: img/cat)
  const images = getAllImageUrls(product).filter(Boolean)
  const imgSrc = images[0] || getImageUrl(product)
  const catName = product.cat || product.category || ''

  const fav = isFav(product.id)
  const displayRating = hasUserRating(product.id) ? getUserRating(product.id) : Math.round(product.rating || 0)

  const specs = [
    [t('product.spec_category'), catName],
    [t('product.spec_rating'), `${displayRating}/5`],
    [t('product.spec_status'), product.inStock !== false ? t('product.instock') : t('product.outstock')],
    ['SKU', `IOT-${String(product.id).slice(-4).padStart(4, '0')}`],
  ]

  const handleAddCart = () => {
    const item = { ...product, img: imgSrc, cat: catName, qty }
    addCart(item, qty)
    toast.success(t('cart.added') || 'Savatga qo\'shildi!')
  }

  const handleBuyNow = () => {
    if (!isAuthenticated()) {
      toast.error(t('cart.login_required') || 'Iltimos, avval tizimga kiring!')
      navigate('/login')
      return
    }
    const item = { ...product, img: imgSrc, cat: catName, qty }
    addCart(item, qty)
    navigate('/checkout', { state: { product: item, price: product.price * qty } })
  }

  const handleReview = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isAuthenticated()) {
      toast.error('Sharh yozish uchun tizimga kiring!')
      navigate('/login')
      return
    }
    if (!reviewText.trim()) {
      toast.error('Iltimos, sharh matnini kiriting')
      return
    }

    try {
      const productId = product.id || id
      
      const response = await api.post('/reviews', { 
        productId, 
        rating: displayRating || 5, 
        comment: reviewText 
      })
      
      toast.success(t('product.review_added') || 'Sharh qo\'shildi!')
      clearReviewText()
      
      try {
        const res = await api.get(`/reviews/product/${id}`)
        setDbReviews(res.data || [])
      } catch {
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Xatolik yuz berdi'
      toast.error(errorMessage)
    }
  }

  const handleRating = (stars) => {
    setProductRating(product.id, stars)
    toast.success(`${stars} ⭐ baho berdingiz!`)
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 pt-28 md:pt-32 pb-20">
      <SEO 
        title={product.name}
        description={product.description?.substring(0, 160) || 'Elektronikachi mahsuloti'}
        image={images[0]}
        type="product"
        schemaData={{
          "@context": "https://schema.org",
          "@type": "Product",
          "name": product.name,
          "image": images,
          "description": product.description || 'Elektronikachi mahsuloti',
          "sku": product.id,
          "brand": {
            "@type": "Brand",
            "name": product.supplier || "Elektronikachi"
          },
          "offers": {
            "@type": "Offer",
            "url": typeof window !== 'undefined' ? `${window.location.origin}/products/${product.id}` : `/products/${product.id}`,
            "priceCurrency": "UZS",
            "price": product.price,
            "availability": product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            "itemCondition": "https://schema.org/NewCondition"
          }
        }}
      />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-white/40 mb-8 flex-wrap">
        <Link to="/" className="hover:text-teal transition-colors">{t('common.home')}</Link>
        <ChevronRight size={12} />
        <Link to="/products" className="hover:text-teal transition-colors">{t('nav.products')}</Link>
        <ChevronRight size={12} />
        <Link to={`/products?cat=${catName}`} className="hover:text-teal transition-colors">{catName}</Link>
        <ChevronRight size={12} />
        <span className="text-white/60 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-14 mb-16">
        {/* Images */}
        <div>
          <motion.div
            className="relative rounded-2xl overflow-hidden border border-white/12 bg-white/[0.04] cursor-zoom-in mb-3 aspect-square"
            onClick={() => setLightbox(true)}
            whileHover={{ scale: 1.01 }}
          >
            <img
              src={images[imgIdx]}
              alt={product.name}
              className="w-full h-full object-contain p-4"
              onError={e => { e.target.src = 'https://picsum.photos/400/400' }}
            />
            <button className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/60 hover:text-white transition-colors">
              <Maximize2 size={15} />
            </button>
            {product.badge && (
              <span className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-bold uppercase bg-gradient-to-r from-primary to-teal text-white rounded-lg">
                {product.badge}
              </span>
            )}
          </motion.div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImgIdx(i)}
                  className={`w-16 h-16 shrink-0 rounded-xl border overflow-hidden transition-all ${i === imgIdx ? 'border-teal/70 ring-2 ring-teal/30' : 'border-white/10 hover:border-white/25'}`}
                >
                  <img src={src} alt="" className="w-full h-full object-contain p-1" onError={e => { e.target.src = 'https://picsum.photos/100/100' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div>
            <span className="text-teal text-xs font-bold uppercase tracking-widest">{catName}</span>
            <h1 className="text-white font-display font-bold text-2xl md:text-3xl mt-1 leading-snug">{product.name}</h1>
          </div>

          <div className="flex items-center gap-3">
            <StarRating value={displayRating} onChange={handleRating} size={20} />
            <span className="text-white/40 text-sm">({product.reviews || 0} {t('product.reviews')})</span>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-white">{(product.price || 0).toLocaleString()} <span className="text-lg text-white/50">so'm</span></span>
            {product.oldPrice && (
              <span className="text-white/35 line-through text-lg">{product.oldPrice.toLocaleString()} so'm</span>
            )}
          </div>

          <div className={`inline-flex items-center gap-2 text-sm font-semibold ${product.inStock !== false ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${product.inStock !== false ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {product.inStock !== false ? t('product.instock') : t('product.outstock')}
          </div>

          {product.description && (
            <p className="text-white/55 text-sm leading-relaxed border-t border-white/10 pt-4">{product.description}</p>
          )}

          {/* Qty */}
          <div className="flex items-center gap-4">
            <span className="text-white/50 text-sm">{t('product.qty')}:</span>
            <div className="flex items-center gap-3 bg-white/[0.06] border border-white/12 rounded-xl px-1">
              <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 text-white/60 hover:text-white font-bold text-lg transition-colors">−</button>
              <span className="text-white font-bold w-6 text-center">{qty}</span>
              <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 text-white/60 hover:text-white font-bold text-lg transition-colors">+</button>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <motion.button
              onClick={handleAddCart}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-white/20 bg-white/[0.07] text-white font-semibold hover:bg-white/[0.12] transition-all"
            >
              <ShoppingCart size={18} /> {t('product.add_cart')}
            </motion.button>
            <motion.button
              onClick={handleBuyNow}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary to-teal text-white font-bold shadow-lg shadow-primary/25"
            >
              <Zap size={18} /> {t('product.buy_now')}
            </motion.button>
            <motion.button
              onClick={() => toggleFav({ ...product, img: imgSrc, cat: catName })}
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all ${fav ? 'border-rose-500/50 bg-rose-500/15 text-rose-400' : 'border-white/15 bg-white/[0.05] text-white/50 hover:text-rose-400 hover:border-rose-500/40'}`}
            >
              <Heart size={20} fill={fav ? 'currentColor' : 'none'} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-12">
        <div className="flex gap-1 mb-6 border-b border-white/10">
          {[
            ['desc', t('product.tab_desc')],
            ['specs', t('product.tab_specs')],
            ['reviews', `${t('product.tab_reviews')} (${dbReviews.length})`],
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
            <p className="text-white/60 leading-relaxed text-sm md:text-base">
              {product.description || t('product.no_desc')}
            </p>
          )}
          {tab === 'specs' && (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              {specs.map(([k, v], i) => (
                <div key={k} className={`flex justify-between px-5 py-3.5 text-sm ${i % 2 === 0 ? 'bg-white/[0.03]' : ''} ${i < specs.length - 1 ? 'border-b border-white/8' : ''}`}>
                  <span className="text-white/45">{k}</span>
                  <span className="text-white font-medium">{v}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'reviews' && (
            <div className="space-y-6 text-white" style={{ minHeight: '300px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Sharhlar ({dbReviews.length})</h3>
              </div>
              
              {dbReviews.length > 0 ? (
                <div className="space-y-4">
                  {dbReviews.map(r => (
                    <div key={r.id} className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                      <div className="flex justify-between mb-2">
                        <span className="text-white font-semibold text-sm">{r.user?.username || 'Foydalanuvchi'}</span>
                        <span className="text-white/35 text-xs">{new Date(r.createdAt).toLocaleDateString('uz-UZ')}</span>
                      </div>
                      <div className="flex text-teal mb-2">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star key={idx} size={12} fill={idx < r.rating ? 'currentColor' : 'none'} opacity={idx < r.rating ? 1 : 0.3} />
                        ))}
                      </div>
                      <p className="text-white/60 text-sm">{r.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm py-4">Hali sharhlar yo'q. Birinchi sharhni siz yozing!</p>
              )}
              
              <form onSubmit={handleReview} className="pt-4 border-t border-white/10 space-y-3">
                <h4 className="text-white font-semibold">Sharh yozish</h4>
                <textarea
                  placeholder="Mahsulot haqida fikringizni yozing..."
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
                  <Send size={15} /> Sharh yuborish
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-white font-display font-bold text-xl md:text-2xl flex items-center gap-3 mb-6">
            <span className="w-1 h-7 bg-gradient-to-b from-primary to-teal rounded-full" />
            {t('product.related')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
            {relatedProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} />
            ))}
          </div>
        </div>
      )}

      {lightbox && (
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
