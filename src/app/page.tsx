'use client';

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Award, 
  Zap, 
  Star, 
  Truck,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { t, products, addToCart, wishlist, toggleWishlist } = useApp();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('reddy-splash-seen');
    if (hasSeenSplash) {
      setShowSplash(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('reddy-splash-seen', 'true');
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Get featured products (A2 Milk, Paneer, Ghee, Curd)
  const featuredProducts = products.slice(0, 4);

  const categoriesList = [
    { name: t('milk'), slug: 'Fresh Milk', icon: '🥛', color: 'from-blue-500/10 to-indigo-500/10' },
    { name: t('curd'), slug: 'Curd', icon: '🍧', color: 'from-sky-500/10 to-blue-500/10' },
    { name: t('paneer'), slug: 'Paneer', icon: '🧈', color: 'from-yellow-500/10 to-orange-500/10' },
    { name: t('ghee'), slug: 'Ghee', icon: '🏺', color: 'from-amber-500/10 to-yellow-500/10' },
    { name: t('butter'), slug: 'Butter', icon: '🧈', color: 'from-cream-200 to-cream-100' },
    { name: t('cheese'), slug: 'Cheese', icon: '🧀', color: 'from-yellow-600/10 to-yellow-500/10' }
  ];

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-tr from-emerald-950 via-emerald-800 to-green-900">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="flex flex-col items-center space-y-4"
        >
          {/* Glowing Ring around Logo */}
          <div className="relative h-32 w-32 md:h-40 md:w-40 bg-white/10 backdrop-blur-md rounded-full border border-white/20 p-4 shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/25 to-green-400/25 animate-pulse" />
            <img 
              src="/images/logo.png" 
              alt="Reddy Premium Dairy Logo" 
              className="h-24 w-24 md:h-32 md:w-32 object-contain relative z-10 filter drop-shadow-lg"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight text-white">
              REDDY PREMIUM DAIRY
            </h1>
            <p className="text-[10px] md:text-xs font-bold text-emerald-300 uppercase tracking-widest mt-1">
              Pure • Fresh • Healthy
            </p>
          </motion.div>
        </motion.div>

        {/* Premium Spinner/Progress Bar at bottom */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ left: "-100%" }}
            animate={{ left: "0%" }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className="absolute top-0 bottom-0 left-0 w-full bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]"
          />
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      {/* 1. Hero Banner with Simulated Farm Video Background */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-slate-950 text-white py-20">
        
        {/* Animated Background Gradients & Overlay */}
        <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay z-0" 
             style={{ backgroundImage: "url('/images/interface image.png')" }} />
        
        {/* Milk Splash Animation & Cow silhouette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent z-10" />
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-accent text-xs font-semibold uppercase tracking-wider"
          >
            <Sparkles className="h-4 w-4" />
            <span>100% Certified Organic & Farm Fresh</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold font-display tracking-tight leading-none"
          >
            Experience the Purity of <br />
            <span className="bg-gradient-to-r from-accent via-white to-secondary-light bg-clip-text text-transparent drop-shadow-sm">
              REDDY PREMIUM DAIRY
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-2xl mx-auto text-sm sm:text-lg text-slate-300 font-semibold tracking-wide"
          >
            {t('tagline')} • Straight from our high-tech cattle farm in Chiyyedu, Anantapur. Chilled within 1 hour to lock in health.
          </motion.p>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <Link 
              href="/products" 
              className="w-full sm:w-auto px-8 py-4 bg-accent text-slate-900 hover:bg-accent-light text-sm font-bold rounded-xl transition-all shadow-lg shadow-accent/20 flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>{t('shopNow')}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link 
              href="/about" 
              className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/15 text-white border border-white/20 text-sm font-bold rounded-xl transition-all backdrop-blur-md flex items-center justify-center gap-2 hover:scale-[1.02]"
            >
              <span>Explore Farm Story</span>
            </Link>
          </motion.div>

        </div>

        {/* Waves transition */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[60px] text-slate-50 dark:text-slate-950 fill-current">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"></path>
          </svg>
        </div>

      </section>

      {/* 2. Category Explorer */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-display">
              {t('categories')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
              Nourished by nature, packed with goodness
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {categoriesList.map((cat, idx) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <Link 
                  href={`/products?category=${encodeURIComponent(cat.slug)}`}
                  className="flex flex-col items-center justify-center p-6 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900/50 hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-800 transition-all text-center group cursor-pointer"
                >
                  <span className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-display">
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-secondary dark:text-accent font-bold mt-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    Shop <ArrowRight className="h-2.5 w-2.5" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 3. Featured Products */}
      <section className="py-20 bg-white dark:bg-slate-950/30 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-6">
            <div className="text-center sm:text-left space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-display">
                Featured Products
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
                Our fresh recommendation for you
              </p>
            </div>
            <Link 
              href="/products" 
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary dark:text-accent hover:underline"
            >
              <span>View All Products</span>
              <ArrowRight className="h-4.5 w-4.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featuredProducts.map((prod) => {
              const isStarred = wishlist.includes(prod.id);
              return (
                <div 
                  key={prod.id} 
                  className="flex flex-col rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-300 overflow-hidden group"
                >
                  {/* Image container */}
                  <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
                    <img 
                      src={prod.images[0]} 
                      alt={prod.name} 
                      className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Brand Logo overlay */}
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 pointer-events-none z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur border border-accent/40 pl-1 pr-2 py-1 rounded-full shadow-md">
                      <img 
                        src="/images/logo.png" 
                        alt="" 
                        className="h-5 w-5 rounded-full object-cover border border-accent/20 bg-white"
                      />
                      <span className="text-[7.5px] font-extrabold text-slate-800 dark:text-accent font-display tracking-tight leading-none">
                        REDDY PREMIUM DAIRY
                      </span>
                      {prod.discount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[7px] font-extrabold text-slate-900 bg-accent rounded-full leading-none">
                          -{prod.discount}%
                        </span>
                      )}
                    </div>

                    {/* Wishlist toggle */}
                    <button 
                      onClick={() => toggleWishlist(prod.id)}
                      className="absolute top-4 right-4 p-2 bg-white/80 dark:bg-slate-950/80 hover:bg-white dark:hover:bg-slate-950 text-slate-400 hover:text-red-500 rounded-full shadow-md transition-colors"
                    >
                      <Heart className={`h-4.5 w-4.5 ${isStarred ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>

                  {/* Body Info */}
                  <div className="p-5 flex-1 flex flex-col justify-between text-left">
                    <div>
                      <span className="text-[10px] font-bold text-secondary dark:text-accent uppercase tracking-wider">
                        {prod.category}
                      </span>
                      <Link href={`/products/${prod.id}`}>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-1 hover:text-primary dark:hover:text-accent truncate">
                          {prod.name}
                        </h3>
                      </Link>
                      <p className="text-[11px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">
                        {prod.weight} • {prod.brand}
                      </p>
                      
                      {/* Rating */}
                      <div className="flex items-center gap-1 mt-2.5">
                        <span className="flex items-center text-[10px] bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 font-bold px-1.5 py-0.5 rounded">
                          <Star className="h-3 w-3 fill-yellow-600 stroke-none mr-0.5" />
                          {prod.rating}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          ({prod.reviews.length || 3} reviews)
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                      {/* Price Block */}
                      <div className="flex flex-col">
                        <span className="text-sm font-extrabold text-primary dark:text-white">
                          Rs. {prod.price}
                        </span>
                        {prod.price < prod.mrp && (
                          <span className="text-[10px] text-slate-400 line-through">
                            Rs. {prod.mrp}
                          </span>
                        )}
                      </div>

                      {/* Add to Cart */}
                      <button 
                        onClick={() => addToCart(prod, 1)}
                        className="px-4 py-2 bg-primary hover:bg-primary-light dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                      >
                        {t('addToCart')}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* 4. Why Choose Us */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950 transition-colors relative overflow-hidden">
        
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-16 relative z-10">
          
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl font-bold tracking-tight text-primary dark:text-white font-display">
              Why Reddy Premium Dairy?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-widest">
              Purity at every drop, quality at every step
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: "100% Pure & Organic",
                desc: "No synthetic chemical residues, hormones, or water adulterants. Sourced only from pasture-fed indigenous cattle.",
                icon: <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              },
              {
                title: "Untouched by Hands",
                desc: "Automated milking pipelines and clean packaging processes maintain absolute hygiene and prevent contamination.",
                icon: <Award className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              },
              {
                title: "Chilled within 1 Hour",
                desc: "Quick temperature reduction to under 4°C immediately after milking stops bacterial growth and preserves taste.",
                icon: <Zap className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              },
              {
                title: "Same-Day Doorstep Delivery",
                desc: "Ensuring dairy products milked in the morning arrive at your door in Anantapur before breakfast.",
                icon: <Truck className="h-8 w-8 text-red-600 dark:text-red-400" />
              }
            ].map((value, idx) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="flex flex-col items-center p-8 rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 shadow-sm text-center space-y-4"
              >
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl">
                  {value.icon}
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display">
                  {value.title}
                </h3>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                  {value.desc}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 5. Achivements & Counter stats */}
      <section className="py-16 bg-primary text-white relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { label: "Happy Families", val: "10,000+" },
              { label: "Fresh Products", val: "25+" },
              { label: "Farm Acres", val: "500+" },
              { label: "Customer Trust", val: "100%" }
            ].map(stat => (
              <div key={stat.label} className="space-y-1">
                <p className="text-3xl sm:text-4xl font-extrabold text-accent font-display">{stat.val}</p>
                <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-300">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Partner Brands */}
      <section className="py-12 bg-white dark:bg-slate-950/20 border-y border-slate-100 dark:border-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Our Quality Standards & Certifications</p>
          <div className="flex flex-wrap items-center justify-center gap-12 grayscale opacity-45 dark:opacity-30">
            {['FSSAI Certified', 'India Organic', 'NPOP Standard', 'APEDA Accredited', 'ISO 22000'].map(cert => (
              <span key={cert} className="font-display font-bold text-sm sm:text-base tracking-tight text-primary dark:text-white">
                {cert}
              </span>
            ))}
          </div>
        </div>
      </section>
      
    </PageWrapper>
  );
}
