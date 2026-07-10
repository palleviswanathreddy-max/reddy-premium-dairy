'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { Product } from '@/db/db';
import { 
  Search, Star, SlidersHorizontal, Heart, 
  Eye, RefreshCw, X, Plus, Info, ShieldCheck, ShoppingCart 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ProductsContent() {
  const searchParams = useSearchParams();
  const { 
    products, 
    addToCart, 
    wishlist, 
    toggleWishlist, 
    compareList, 
    toggleCompare, 
    clearCompare, 
    t 
  } = useApp();

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [priceRange, setPriceRange] = useState(500);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  
  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  
  // Refs for auto-scroll
  const productsGridRef = useRef<HTMLDivElement>(null);

  // Initialize search or category from URL query parameters
  useEffect(() => {
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    /* eslint-disable react-hooks/set-state-in-effect */
    if (search) setSearchQuery(search);
    if (category) setSelectedCategory(category);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  // Auto-scroll to products section when filters change
  useEffect(() => {
    if (productsGridRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        productsGridRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }, 100);
    }
  }, [selectedCategory, priceRange, minRating, inStockOnly, searchQuery, sortBy]);

  // Unique Categories from products list
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filtering Logic
  const filteredProducts = products.filter(prod => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prod.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || prod.category === selectedCategory;
    const matchesPrice = prod.price <= priceRange;
    const matchesRating = prod.rating >= minRating;
    const matchesStock = !inStockOnly || prod.stock > 0;

    return matchesSearch && matchesCategory && matchesPrice && matchesRating && matchesStock;
  });

  // Sorting Logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-low') return a.price - b.price;
    if (sortBy === 'price-high') return b.price - a.price;
    if (sortBy === 'rating') return b.rating - a.rating;
    return 0; // Default popularity
  });

  const handleBuyNow = (prod: Product) => {
    addToCart(prod, 1);
    window.location.href = '/checkout';
  };

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Title */}
        <div className="text-left border-b border-slate-100 dark:border-slate-900 pb-6 mb-8">
          <h1 className="text-3xl font-bold font-display text-primary dark:text-white tracking-tight">
            Premium Dairy Market
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">
            Choose from our 100% natural, farm-fresh collection
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* 1. Sidebar Filters */}
          <aside className="lg:col-span-3 space-y-6 text-left">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-900 space-y-6">
              
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-4.5 w-4.5 text-accent" />
                  <span>Filters</span>
                </h3>
                <button 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setPriceRange(500);
                    setMinRating(0);
                    setInStockOnly(false);
                    setSortBy('popular');
                  }}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500"
                >
                  Clear All
                </button>
              </div>

              {/* Text Search */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search catalog..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category</label>
                <div className="flex flex-col gap-1.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                        selectedCategory === cat 
                          ? 'bg-primary/10 text-primary dark:text-accent font-bold' 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {cat === 'All' ? 'All Products' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Max Price</label>
                  <span className="font-bold text-slate-600 dark:text-slate-300">Rs. {priceRange}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="500"
                  value={priceRange}
                  onChange={(e) => setPriceRange(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              {/* Rating Filter */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Minimum Rating</label>
                <div className="flex gap-1">
                  {[0, 3, 4, 4.5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`flex-1 py-1.5 border text-[10px] font-bold rounded-lg text-center ${
                        minRating === rating 
                          ? 'border-accent bg-accent/15 text-slate-900 dark:text-accent' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {rating === 0 ? 'All' : `${rating} ★`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock status toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="stockToggle">
                  In Stock Only
                </label>
                <input
                  type="checkbox"
                  id="stockToggle"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 dark:border-slate-800 text-primary focus:ring-accent cursor-pointer"
                />
              </div>

            </div>
          </aside>

          {/* 2. Products List Panel */}
          <div className="lg:col-span-9 space-y-6">
            
            {/* Sorting bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-slate-100 dark:border-slate-900 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10">
              <p className="text-xs font-semibold text-slate-500">
                Showing <span className="font-bold text-slate-800 dark:text-white">{sortedProducts.length}</span> Products
              </p>
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Sort By</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-xl px-3 py-2 outline-none font-semibold focus:border-accent"
                >
                  <option value="popular">Popularity</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Products grid */}
            {sortedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Info className="h-12 w-12 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No products found matching filters</p>
                <p className="text-xs text-slate-400 max-w-sm">Try broadening your search term or clearing filters to locate our fresh arrivals.</p>
              </div>
            ) : (
              <div ref={productsGridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {sortedProducts.map((prod) => {
                  const isStarred = wishlist.includes(prod.id);
                  const isCompared = compareList.some(p => p.id === prod.id);
                  return (
                    <Link 
                      key={prod.id}
                      href={`/products/${prod.id}`}
                      className="flex flex-col rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-300 overflow-hidden group text-left no-underline"
                    >
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
                        <img 
                          src={prod.images[0]} 
                          alt={prod.name} 
                          className="object-contain h-full w-full group-hover:scale-105 transition-transform duration-500"
                        />
                        
                        {/* Small Brand Logo at Top */}
                        <div className="absolute top-2 left-2 z-20">
                          <img 
                            src="/images/logo.png" 
                            alt="REDDY PREMIUM DAIRY" 
                            className="h-6 w-6 rounded-full object-cover border border-accent/30 bg-white shadow-md"
                            title="REDDY PREMIUM DAIRY"
                          />
                        </div>

                        {/* Discount Badge */}
                        {prod.discount > 0 && (
                          <div className="absolute top-2 right-2 z-20">
                            <span className="px-2 py-1 text-[10px] font-extrabold text-white bg-red-500 rounded-lg shadow-md">
                              -{prod.discount}%
                            </span>
                          </div>
                        )}

                        {/* Product Images Thumbnails */}
                        {prod.images.length > 1 && (
                          <div className="absolute bottom-2 left-2 right-2 flex gap-1 z-10">
                            {prod.images.slice(0, 3).map((img, idx) => (
                              <img 
                                key={idx}
                                src={img} 
                                alt="" 
                                className="h-6 w-6 rounded object-cover border border-white/50 bg-white cursor-pointer hover:border-white transition-all"
                              />
                            ))}
                          </div>
                        )}

                        {/* Top corner actions */}
                        <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleWishlist(prod.id);
                            }}
                            className="p-2 bg-white/95 dark:bg-slate-950/95 hover:bg-white text-slate-400 hover:text-red-500 rounded-full shadow-md transition-colors"
                            title="Add to wishlist"
                          >
                            <Heart className={`h-4 w-4 ${isStarred ? 'fill-red-500 text-red-500' : ''}`} />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setQuickViewProduct(prod);
                            }}
                            className="p-2 bg-white/95 dark:bg-slate-950/95 hover:bg-white text-slate-400 hover:text-primary rounded-full shadow-md transition-colors"
                            title="Quick View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleCompare(prod);
                            }}
                            className={`p-2 bg-white/95 dark:bg-slate-950/95 hover:bg-white rounded-full shadow-md transition-colors ${
                              isCompared ? 'text-secondary dark:text-accent font-bold' : 'text-slate-400 hover:text-secondary'
                            }`}
                            title="Compare"
                          >
                            <RefreshCw className={`h-4 w-4 ${isCompared ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-grow flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-secondary dark:text-accent uppercase tracking-wider">
                              {prod.category}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">SKU: {prod.sku.split('-')[1]}</span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white mt-1 group-hover:text-primary dark:group-hover:text-accent truncate">
                            {prod.name}
                          </h3>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">
                            {prod.weight} • {prod.brand}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-2 leading-relaxed font-semibold">
                            {prod.description}
                          </p>
                          
                          {/* Rating */}
                          <div className="flex items-center gap-1 mt-3">
                            <span className="flex items-center text-[10px] bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400 font-bold px-1.5 py-0.5 rounded">
                              <Star className="h-3 w-3 fill-yellow-600 stroke-none mr-0.5" />
                              {prod.rating}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400">
                              ({prod.reviews.length || 3} reviews)
                            </span>
                          </div>
                        </div>

                        <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-3">
                          
                          {/* Prices */}
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-extrabold text-primary dark:text-white">
                                Rs. {prod.price}
                              </span>
                              {prod.price < prod.mrp && (
                                <span className="text-xs text-slate-400 line-through">
                                  Rs. {prod.mrp}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              {t('gstInclude')}
                            </span>
                          </div>

                          {/* Quick add actions */}
                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                addToCart(prod, 1);
                              }}
                              className="py-2.5 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                            >
                              <ShoppingCart className="h-3.5 w-3.5" />
                              <span>{t('addToCart')}</span>
                            </button>
                            <button 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBuyNow(prod);
                              }}
                              className="py-2.5 bg-accent hover:bg-accent-light text-slate-900 text-xs font-bold rounded-xl transition-all shadow-md"
                            >
                              {t('buyNow')}
                            </button>
                          </div>

                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* 3. Floating Compare Tray */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 left-6 z-40 bg-white/95 dark:bg-slate-950/95 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 p-4 w-72 sm:w-80 glass-premium animate-splash">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-3 text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-white">Compare Products ({compareList.length}/3)</p>
            <button onClick={clearCompare} className="text-[10px] font-semibold text-red-500 hover:underline">Clear</button>
          </div>
          <div className="flex gap-2">
            {compareList.map(prod => (
              <div key={prod.id} className="relative flex-1 aspect-square bg-slate-50 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800 p-2 flex items-center justify-center">
                <img src={prod.images[0]} alt={prod.name} className="h-full w-full object-contain rounded-lg" />
                <button 
                  onClick={() => toggleCompare(prod)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:scale-105"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
            {compareList.length < 3 && (
              <div className="flex-1 aspect-square bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400">
                <Plus className="h-4 w-4" />
              </div>
            )}
          </div>
          <button 
            disabled={compareList.length < 2}
            onClick={() => setCompareModalOpen(true)}
            className="w-full mt-3 py-2 bg-secondary text-white disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-xl transition-all shadow-md"
          >
            Compare Now
          </button>
        </div>
      )}

      {/* 4. Compare Modal */}
      <AnimatePresence>
        {compareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-900 mb-6 text-left">
                <h3 className="text-lg font-bold font-display text-primary dark:text-white">Product Comparison</h3>
                <button onClick={() => setCompareModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4 text-left text-xs font-semibold text-slate-500">
                {/* Column Headers */}
                <div className="space-y-4 pt-44 font-bold text-slate-400 uppercase tracking-wider border-r border-slate-100 dark:border-slate-900 pr-3">
                  <div>Price</div>
                  <div className="pt-2">Weight / Vol</div>
                  <div className="pt-2">SKU Code</div>
                  <div className="pt-2">Category</div>
                  <div className="pt-2">Nutrition</div>
                  <div className="pt-32">Ingredients</div>
                  <div className="pt-10">Storage</div>
                </div>

                {/* Compare items */}
                {compareList.map(prod => (
                  <div key={prod.id} className="space-y-4 col-span-1">
                    <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100 dark:border-slate-900">
                      <img src={prod.images[0]} alt={prod.name} className="h-28 w-28 object-contain rounded-2xl border bg-white mb-2 p-1" />
                      <p className="text-xs font-bold text-slate-800 dark:text-white line-clamp-1">{prod.name}</p>
                      <button 
                        onClick={() => { addToCart(prod, 1); setCompareModalOpen(false); }}
                        className="mt-2.5 px-3 py-1.5 bg-accent text-slate-900 rounded-lg text-[10px] font-bold"
                      >
                        Add to Cart
                      </button>
                    </div>

                    <div className="pt-2 font-bold text-slate-800 dark:text-white">Rs. {prod.price} <span className="text-[10px] text-slate-400 font-semibold line-through">Rs. {prod.mrp}</span></div>
                    <div className="pt-2 text-slate-600 dark:text-slate-300 font-bold">{prod.weight}</div>
                    <div className="pt-2 font-mono text-[10px] text-slate-400">{prod.sku}</div>
                    <div className="pt-2 text-slate-600 dark:text-slate-300 font-bold">{prod.category}</div>
                    <div className="pt-2 text-[10px] leading-relaxed text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border space-y-1 font-medium">
                      <div>Calories: {prod.nutrition.calories}</div>
                      <div>Fat: {prod.nutrition.fat}</div>
                      <div>Protein: {prod.nutrition.protein}</div>
                      <div>Carbs: {prod.nutrition.carbohydrates}</div>
                    </div>
                    <div className="pt-2 text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium line-clamp-3" title={prod.ingredients}>{prod.ingredients}</div>
                    <div className="pt-2 text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">{prod.storage}</div>
                  </div>
                ))}
                
                {/* Empty columns slots */}
                {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                  <div key={i} className="col-span-1 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-12 text-slate-300 dark:text-slate-800">
                    <Plus className="h-6 w-6 mb-2" />
                    <p className="text-[10px] font-bold">Add item</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Quick View Modal */}
      <AnimatePresence>
        {quickViewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex justify-end mb-2">
                <button onClick={() => setQuickViewProduct(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                
                {/* Image */}
                <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-2xl overflow-hidden p-6 flex items-center justify-center border">
                  <img src={quickViewProduct.images[0]} alt={quickViewProduct.name} className="object-contain h-full w-full" />
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold bg-accent/20 text-primary dark:text-accent px-2 py-0.5 rounded uppercase tracking-wider">
                      {quickViewProduct.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white font-display mt-2 leading-snug">
                      {quickViewProduct.name}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">
                      {quickViewProduct.weight} • {quickViewProduct.brand} • SKU: {quickViewProduct.sku}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {quickViewProduct.description}
                  </p>

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-extrabold text-primary dark:text-white">Rs. {quickViewProduct.price}</span>
                    {quickViewProduct.price < quickViewProduct.mrp && (
                      <span className="text-[10px] text-slate-400 line-through">Rs. {quickViewProduct.mrp}</span>
                    )}
                  </div>

                  {/* Delivery time */}
                  <div className="flex items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 border">
                    <ShieldCheck className="h-4 w-4 text-secondary dark:text-accent" />
                    <span>Est. Delivery: {quickViewProduct.deliveryTime}</span>
                  </div>

                  {/* Cart operations */}
                  <div className="pt-2.5 flex gap-2">
                    <button 
                      onClick={() => { addToCart(quickViewProduct, 1); setQuickViewProduct(null); }}
                      className="flex-1 py-3 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl shadow-md transition-colors"
                    >
                      {t('addToCart')}
                    </button>
                    <button 
                      onClick={() => { handleBuyNow(quickViewProduct); setQuickViewProduct(null); }}
                      className="flex-1 py-3 bg-accent hover:bg-accent-light text-slate-900 text-xs font-bold rounded-xl transition-all shadow-md"
                    >
                      {t('buyNow')}
                    </button>
                  </div>

                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </PageWrapper>
  );
}

export default function Products() {
  return (
    <React.Suspense fallback={<div className="text-center py-20 text-xs font-semibold text-slate-400">Loading catalog...</div>}>
      <ProductsContent />
    </React.Suspense>
  );
}
