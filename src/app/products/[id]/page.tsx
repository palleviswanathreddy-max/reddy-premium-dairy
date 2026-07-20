'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { 
  Star, Heart, ShieldCheck, ShoppingCart, RefreshCw, 
  Share2, ArrowLeft, Truck, Clock, Calendar 
} from 'lucide-react';
import Link from 'next/link';
import ReviewSection from './ReviewSection';
import { useRouter } from 'next/navigation';


export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { 
    products, 
    addToCart, 
    wishlist, 
    toggleWishlist, 
    compareList, 
    toggleCompare, 
    showToast,
    t 
  } = useApp();

  // Derived state — avoids calling setState inside useEffect
  const product = useMemo(
    () => products.find(p => p.id === id) ?? null,
    [products, id]
  );

  const related = useMemo(
    () => product ? products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4) : [],
    [products, product]
  );

  const frequentlyBought = useMemo(
    () => product ? products.filter(p => p.id !== product.id).slice(0, 2) : [],
    [products, product]
  );



  // UI state
  // selectedImage = user's thumbnail click; falls back to first product image when empty
  const [selectedImage, setSelectedImage] = useState<string>('');
  const activeImage = selectedImage || product?.images[0] || '';
  const setActiveImage = setSelectedImage; // alias for readability in JSX
  const [zoomStyle, setZoomStyle] = useState({ display: 'none', backgroundPosition: '0% 0%' });
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const activeVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    if (selectedVariantId) {
      const found = product.variants.find(v => v.id === selectedVariantId);
      if (found) return found;
    }
    return product.variants[0];
  }, [product, selectedVariantId]);


  // Track product view — fire-and-forget, never blocks render
  useEffect(() => {
    if (!product) return;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('reddy-user') : null;
    const userId = storedUser ? JSON.parse(storedUser).id : `guest_${id}_${Date.now()}`;
    const fire = () => {
      fetch('/api/track/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, productId: product.id, productName: product.name })
      }).catch(() => {});
    };
    if ('requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(fire);
    } else {
      setTimeout(fire, 0);
    }
  }, [product, id]);



  if (!product) {
    return (
      <PageWrapper>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <p className="text-sm font-bold text-slate-500">Loading product details...</p>
        </div>
      </PageWrapper>
    );
  }

  // Zoom on Hover implementation
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      display: 'block',
      backgroundPosition: `${x}% ${y}%`
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none', backgroundPosition: '0% 0%' });
  };

  const handleAddToCartClick = () => {
    addToCart(product, quantity);
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product, quantity);
      router.push('/checkout');
    }
  };


  // Calculate dynamic Mfg & Exp Dates based on current date
  const now = new Date();
  const mfgDateStr = new Date(now.setDate(now.getDate() - 1)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const expDateStr = new Date(now.setDate(now.getDate() + product.expiryDays)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Share Simulation
  const triggerShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      showToast("Link copied to clipboard!", "success");
    }
  };

  const isStarred = wishlist.includes(product.id);
  const isCompared = compareList.some(p => p.id === product.id);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Breadcrumb / Back button */}
        <div className="mb-6 flex justify-start">
          <Link 
            href="/products"
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary dark:hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Market</span>
          </Link>
        </div>

        {/* Product core specs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left mb-16">
          
          {/* Magnified Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            
            {/* Active zoom box */}
            <div 
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="relative aspect-square bg-slate-50 dark:bg-slate-900 rounded-3xl border overflow-hidden p-6 flex items-center justify-center cursor-zoom-in"
            >
              <Image 
                src={activeImage} 
                alt={product.name} 
                fill
                className="object-contain rounded-2xl"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />

              {/* Brand Logo overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 pointer-events-none z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur border border-accent/40 pl-1 pr-2 py-1 rounded-full shadow-md">
                <Image 
                  src="/images/logo.png" 
                  alt="" 
                  width={24}
                  height={24}
                  className="rounded-full object-cover border border-accent/20 bg-white"
                />
                <span className="text-[8px] font-extrabold text-slate-800 dark:text-accent font-display tracking-tight leading-none">
                  REDDY PREMIUM DAIRY
                </span>
                {product.discount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[7px] font-extrabold text-slate-900 bg-accent rounded-full leading-none">
                    -{product.discount}%
                  </span>
                )}
              </div>
              
              {/* Magnified lens layer */}
              <div 
                className="absolute inset-0 pointer-events-none bg-no-repeat bg-slate-50 dark:bg-slate-900"
                style={{
                  ...zoomStyle,
                  backgroundImage: `url(${activeImage})`,
                  backgroundSize: '200%',
                }}
              />
            </div>

            {/* Thumbnail previews */}
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(img)}
                  className={`h-16 w-16 rounded-xl border-2 bg-white dark:bg-slate-900 p-1 overflow-hidden transition-all ${
                    activeImage === img ? 'border-accent shadow-md' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <Image src={img} alt="" width={64} height={64} className="h-full w-full object-contain rounded-lg" />
                </button>
              ))}
            </div>

          </div>

          {/* Details & Metadata Panel */}
          <div className="lg:col-span-6 space-y-6">
            
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold bg-accent/20 text-primary dark:text-accent px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {product.category}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-slate-400">SKU: {product.sku}</span>
                </div>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-primary dark:text-white mt-3 leading-snug">
                {product.name}
              </h1>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wide">
                Brand: <span className="text-slate-600 dark:text-slate-200">{product.brand}</span>
              </p>
            </div>

            {/* Rating count */}
            <div className="flex items-center gap-2">
              <div className="flex items-center text-yellow-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-4 w-4 ${i < Math.floor(product.rating) ? 'fill-current' : 'text-slate-200 dark:text-slate-800'}`} 
                  />
                ))}
              </div>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">{product.rating} ★</span>
              <span className="text-xs text-slate-400">({product.reviews?.length ?? product.reviewCount ?? 0} verified buyers)</span>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
              {product.description}
            </p>

            {/* Expiry / Manufacture calendar */}
            <div className="grid grid-cols-2 gap-4 p-4 border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl">
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <Calendar className="h-4 w-4 text-secondary dark:text-accent shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mfg Date</p>
                  <p className="text-slate-700 dark:text-slate-200 mt-0.5">{mfgDateStr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
                <Clock className="h-4 w-4 text-red-500 shrink-0" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Best Before</p>
                  <p className="text-slate-700 dark:text-slate-200 mt-0.5">{expDateStr} ({product.expiryDays} days)</p>
                </div>
              </div>
            </div>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Size / Volume</p>
                <div className="flex flex-wrap gap-3">
                  {product.variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-4 py-2 border rounded-xl text-sm font-bold transition-all duration-200 ${
                        selectedVariantId === v.id 
                          ? 'border-accent bg-accent/10 text-slate-900 dark:text-accent shadow-sm' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Prices, Discounts, Stock */}
            <div className="space-y-3 pt-2">
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-extrabold text-primary dark:text-white">
                    Rs. {activeVariant ? activeVariant.price : product.price}
                  </span>
                  {(activeVariant ? activeVariant.mrp : product.mrp) > (activeVariant ? activeVariant.price : product.price) && (
                    <>
                      <span className="text-sm text-slate-400 line-through">
                        Rs. {activeVariant ? activeVariant.mrp : product.mrp}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        {Math.round((( (activeVariant ? activeVariant.mrp : product.mrp) - (activeVariant ? activeVariant.price : product.price) ) / (activeVariant ? activeVariant.mrp : product.mrp)) * 100)}% Off
                      </span>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    GST: {product.gst}%
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-slate-600 dark:text-slate-300">
                    Stock status: {(activeVariant ? activeVariant.stock : product.stock) > 15 ? 'In Stock' : (activeVariant ? activeVariant.stock : product.stock) > 0 ? 'Low Stock' : 'Out of Stock'}
                  </span>
                  <span className="text-slate-400">({activeVariant ? activeVariant.stock : product.stock} items left)</span>
                </div>
                <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Incl. all taxes</span>
              </div>
            </div>

            {/* Add to Cart Actions */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                
                {/* Quantity box */}
                <div className="flex items-center border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl overflow-hidden shadow-sm h-12 w-32 shrink-0">
                  <button 
                    onClick={() => setQuantity((q: number) => Math.max(1, q - 1))}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 font-extrabold transition-colors flex-1"
                  >
                    -
                  </button>
                  <span className="px-3.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {quantity}
                  </span>
                  <button 
                    onClick={() => setQuantity((q: number) => Math.min((activeVariant ? activeVariant.stock : product.stock), q + 1))}
                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 font-extrabold transition-colors flex-1"
                  >
                    +
                  </button>
                </div>

                <button 
                  onClick={handleAddToCartClick}
                  className="w-full h-12 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>{t('addToCart')}</span>
                </button>
                <button 
                  onClick={handleBuyNow}
                  className="w-full h-12 bg-accent hover:bg-accent-light text-slate-900 text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  {t('buyNow')}
                </button>

              </div>

              {/* Share, Wishlist, Compare buttons */}
              <div className="flex items-center justify-start gap-6 text-xs font-bold text-slate-500 dark:text-slate-400">
                <button onClick={() => toggleWishlist(product.id)} className="flex items-center gap-1.5 hover:text-red-500">
                  <Heart className={`h-4 w-4 ${isStarred ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{isStarred ? 'Starred' : 'Add to Wishlist'}</span>
                </button>
                <button onClick={() => toggleCompare(product)} className={`flex items-center gap-1.5 ${isCompared ? 'text-secondary dark:text-accent' : 'hover:text-primary'}`}>
                  <RefreshCw className="h-4 w-4" />
                  <span>{isCompared ? 'Compared' : 'Compare Item'}</span>
                </button>
                <button onClick={triggerShare} className="flex items-center gap-1.5 hover:text-primary">
                  <Share2 className="h-4 w-4" />
                  <span>Share Product</span>
                </button>
              </div>

            </div>

            {/* Delivery banner */}
            <div className="p-4 border border-slate-100 dark:border-slate-900 bg-slate-50/20 dark:bg-slate-900/5 rounded-2xl flex items-start gap-3">
              <Truck className="h-5 w-5 text-secondary dark:text-accent shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Express Delivery Slots</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-semibold mt-0.5">
                  Order within 30 mins to secure <strong>{product.deliveryTime}</strong> slot delivery. Chilled containers ensure freshness.
                </p>
              </div>
            </div>

          </div>

        </div>

        {/* 7. Nutrition & Ingredients Accordion details */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left mb-16">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* Details tabs */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 mb-6">
              <h2 className="text-lg font-bold text-primary dark:text-white font-display">Product Information Details</h2>
            </div>

            {/* Description & Ingredients */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('ingredients')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border">
                  {product.ingredients}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('storageInstructions')}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-2xl border">
                  {product.storage}
                </p>
              </div>
            </div>

            {/* QA Checklist */}
            <div className="p-6 bg-secondary/5 border border-secondary/15 rounded-3xl space-y-3">
              <h3 className="text-xs font-extrabold text-secondary dark:text-accent uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5" />
                <span>REDDY Purity Guarantee</span>
              </h3>
              <ul className="text-xs text-slate-600 dark:text-slate-400 font-semibold space-y-1.5 list-disc pl-4 leading-relaxed">
                <li>Strict cold chain integrity (kept under 4°C at all stages).</li>
                <li>Hormone-free dairy (zero Oxytocin or chemical catalysts).</li>
                <li>100% trace-back to our Chiyyedu cattle farm.</li>
                <li>No artificial starch, thickeners, or color binders.</li>
              </ul>
            </div>

          </div>

          {/* Nutrition Panel */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-900 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display border-b pb-2.5">
                {t('nutritionFacts')}
              </h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Nutrients per 100ml / 100g serving</p>
              
              <div className="space-y-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                  <span>Energy Value</span>
                  <span className="font-bold text-slate-900 dark:text-white">{product.nutrition.calories}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                  <span>Total Milk Fat</span>
                  <span className="font-bold text-slate-900 dark:text-white">{product.nutrition.fat}</span>
                </div>
                {product.nutrition.saturatedFat && (
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5 pl-3 text-slate-400">
                    <span>Saturated Fat</span>
                    <span>{product.nutrition.saturatedFat}</span>
                  </div>
                )}
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                  <span>Proteins</span>
                  <span className="font-bold text-slate-900 dark:text-white">{product.nutrition.protein}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                  <span>Carbohydrates (Lactose)</span>
                  <span className="font-bold text-slate-900 dark:text-white">{product.nutrition.carbohydrates}</span>
                </div>
                {product.nutrition.calcium && (
                  <div className="flex justify-between border-b border-slate-100 dark:border-slate-850 pb-1.5">
                    <span>Natural Calcium</span>
                    <span className="font-bold text-slate-900 dark:text-white">{product.nutrition.calcium}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* 8. Frequently Bought Together (Bundling purchase) */}
        {frequentlyBought.length > 0 && (
          <section className="py-10 border-t border-slate-100 dark:border-slate-900 text-left space-y-6">
            <h2 className="text-xl font-bold font-display text-primary dark:text-white">Frequently Bought Together</h2>
            <div className="flex flex-col md:flex-row items-center gap-6 p-6 border border-slate-150 dark:border-slate-900 rounded-3xl bg-slate-50/30 dark:bg-slate-900/5">
              
              {/* Bundle list items */}
              <div className="flex flex-wrap items-center gap-4 flex-grow">
                
                {/* Main Product */}
                <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border max-w-xs flex-grow">
                  <Image src={product.images[0]} alt="" width={48} height={48} className="h-12 w-12 object-contain rounded-xl" />
                  <div className="text-left text-xs font-semibold min-w-0">
                    <p className="text-slate-800 dark:text-white truncate">{product.name}</p>
                    <p className="text-slate-400">Rs. {product.price}</p>
                  </div>
                </div>

                <span className="text-lg font-bold text-slate-400">+</span>

                {/* Bundle items */}
                {frequentlyBought.map(prod => (
                  <React.Fragment key={prod.id}>
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border max-w-xs flex-grow">
                      <Image src={prod.images[0]} alt="" width={48} height={48} className="h-12 w-12 object-contain rounded-xl" />
                      <div className="text-left text-xs font-semibold min-w-0">
                        <p className="text-slate-800 dark:text-white truncate">{prod.name}</p>
                        <p className="text-slate-400">Rs. {prod.price}</p>
                      </div>
                    </div>
                  </React.Fragment>
                ))}

              </div>

              {/* Bundle buy CTA */}
              <div className="w-full md:w-52 flex flex-col items-center md:items-start text-center md:text-left shrink-0 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-855 pt-4 md:pt-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bundle Price</p>
                <p className="text-lg font-extrabold text-primary dark:text-accent mt-0.5">
                  Rs. {(product.price + frequentlyBought.reduce((a, b) => a + b.price, 0)).toFixed(2)}
                </p>
                <button 
                  onClick={() => {
                    addToCart(product, 1);
                    frequentlyBought.forEach(p => addToCart(p, 1));
                    showToast("Bundle added to cart!", "success");
                  }}
                  className="w-full mt-3 py-2.5 bg-accent text-slate-900 hover:bg-accent-light text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Buy Bundle Pack
                </button>
              </div>

            </div>
          </section>
        )}

        {/* 9. Reviews & Submission Section */}
        <ReviewSection productId={product.id} />

        {/* 10. Related Products Slider */}
        {related.length > 0 && (
          <section className="py-10 border-t border-slate-100 dark:border-slate-900 text-left space-y-6">
            <h2 className="text-xl font-bold font-display text-primary dark:text-white">{t('relatedProducts')}</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map(prod => (
                <div key={prod.id} className="border rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <Image src={prod.images[0]} alt="" width={200} height={200} className="aspect-square object-contain rounded-xl border bg-slate-50 w-full mb-3 p-2" />
                  <Link href={`/products/${prod.id}`}>
                    <p className="text-xs font-bold text-slate-800 dark:text-white hover:text-primary truncate">{prod.name}</p>
                  </Link>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{prod.weight}</p>
                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-accent">Rs. {prod.price}</span>
                    <button 
                      onClick={() => addToCart(prod, 1)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-accent text-slate-700 dark:bg-slate-800 dark:text-white dark:hover:text-slate-950 text-[10px] font-bold rounded-lg transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </PageWrapper>
  );
}
