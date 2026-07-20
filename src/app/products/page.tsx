'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { Product } from '@/db/db';
import ProductImage from '@/components/ProductImage';
import { 
  Search, Star, SlidersHorizontal, Heart, 
  Eye, RefreshCw, X, Plus, Info, ShieldCheck, ShoppingCart, Check, Filter, SortDesc 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedWeights, setSelectedWeights] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  
  // Mobile drawer state
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  
  // Modals state
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  
  // Refs for auto-scroll
  const productsGridRef = useRef<HTMLDivElement>(null);

  // Initialize search or category from URL query parameters
  useEffect(() => {
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    /* eslint-disable react-hooks/set-state-in-effect */
    if (search) setSearchQuery(search);
    if (category) setSelectedCategories([category]);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [searchParams]);

  // Auto-scroll to products section when filters change
  useEffect(() => {
    if (productsGridRef.current && typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setTimeout(() => {
        productsGridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedCategories, selectedBrands, selectedWeights, minPrice, maxPrice, minRating, inStockOnly, searchQuery, sortBy]);

  // Unique Lists from products list
  const categories = Array.from(new Set(products.map(p => p.category)));
  const brands = Array.from(new Set(products.map(p => p.brand)));
  const weights = Array.from(new Set(products.map(p => p.weight)));

  // Filtering Logic
  const filteredProducts = products.filter(prod => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          prod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          prod.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(prod.category);
    const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(prod.brand);
    const matchesWeight = selectedWeights.length === 0 || selectedWeights.includes(prod.weight);
    const matchesPrice = prod.price >= minPrice && prod.price <= maxPrice;
    const matchesRating = prod.rating >= minRating;
    const matchesStock = !inStockOnly || prod.stock > 0;

    return matchesSearch && matchesCategory && matchesBrand && matchesWeight && matchesPrice && matchesRating && matchesStock;
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
    router.push('/checkout');
  };

  const toggleSelection = (setter: React.Dispatch<React.SetStateAction<string[]>>, current: string[], value: string) => {
    setter(current.includes(value) ? current.filter(item => item !== value) : [...current, value]);
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedWeights([]);
    setMinPrice(0);
    setMaxPrice(1000);
    setMinRating(0);
    setInStockOnly(false);
    setSortBy('popular');
  };

  const renderFilters = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          <SlidersHorizontal className="h-4.5 w-4.5 text-accent" />
          <span>Filters</span>
        </h3>
        <button 
          onClick={clearAllFilters}
          className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Text Search */}
      <div className="space-y-2">
        <label htmlFor="catalog-search" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="catalog-search"
            name="catalogSearch"
            autoComplete="off"
            type="text"
            placeholder="Search catalog..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categories</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {categories.map((cat) => {
            const catId = `category-${cat.toLowerCase().replace(/\s+/g, '-')}`;
            return (
              <label key={cat} htmlFor={catId} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    id={catId}
                    name="selectedCategories"
                    type="checkbox"
                    checked={selectedCategories.includes(cat)}
                    onChange={() => toggleSelection(setSelectedCategories, selectedCategories, cat)}
                    className="peer appearance-none h-4 w-4 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                    <Check className="h-3 w-3 text-white" strokeWidth={4} />
                  </div>
                </div>
                <span className={`text-xs font-semibold transition-colors ${selectedCategories.includes(cat) ? 'text-primary dark:text-accent font-bold' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                  {cat}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Brands */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Brands</h3>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
          {brands.map((brand) => {
            const brandId = `brand-${brand.toLowerCase().replace(/\s+/g, '-')}`;
            return (
              <label key={brand} htmlFor={brandId} className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input
                    id={brandId}
                    name="selectedBrands"
                    type="checkbox"
                    checked={selectedBrands.includes(brand)}
                    onChange={() => toggleSelection(setSelectedBrands, selectedBrands, brand)}
                    className="peer appearance-none h-4 w-4 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-primary checked:border-primary transition-colors cursor-pointer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                    <Check className="h-3 w-3 text-white" strokeWidth={4} />
                  </div>
                </div>
                <span className={`text-xs font-semibold transition-colors ${selectedBrands.includes(brand) ? 'text-primary dark:text-accent font-bold' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
                  {brand}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Weights */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Weight / Volume</h3>
        <div className="flex flex-wrap gap-1.5">
          {weights.map((w) => (
            <button
              key={w}
              onClick={() => toggleSelection(setSelectedWeights, selectedWeights, w)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors ${
                selectedWeights.includes(w) 
                  ? 'border-accent bg-accent/15 text-slate-900 dark:text-accent' 
                  : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Price Filter */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
        <label htmlFor="price-min" className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">Price Range (Rs)</label>
        <div className="flex items-center gap-2">
          <input
            id="price-min"
            name="minPrice"
            aria-label="Minimum price"
            type="number"
            min="0"
            value={minPrice}
            onChange={(e) => setMinPrice(Number(e.target.value))}
            className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-semibold text-center outline-none focus:border-accent transition-colors"
          />
          <span className="text-slate-400 font-bold">-</span>
          <input
            id="price-max"
            name="maxPrice"
            aria-label="Maximum price"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs font-semibold text-center outline-none focus:border-accent transition-colors"
          />
        </div>
      </div>

      {/* Rating Filter */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Minimum Rating</h3>
        <div className="flex gap-1">
          {[0, 3, 4, 4.5].map((rating) => (
            <button
              key={rating}
              onClick={() => setMinRating(rating)}
              className={`flex-1 py-1.5 border text-[10px] font-bold rounded-lg text-center transition-colors ${
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
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
        <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="stockToggle">
          In Stock Only
        </label>
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            id="stockToggle"
            name="inStockOnly"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="peer appearance-none h-4.5 w-4.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 checked:bg-primary checked:border-primary transition-colors cursor-pointer"
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
            <Check className="h-3 w-3 text-white" strokeWidth={4} />
          </div>
        </div>
      </div>
    </div>
  );

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
          
          {/* 1. Sidebar Filters (Desktop only) */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6 text-left">
            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-900 sticky top-24">
              {renderFilters()}
            </div>
          </aside>

          {/* 2. Products List Panel */}
          <div className="lg:col-span-9 space-y-6">
            {/* Active Filters Chips */}
            {(selectedCategories.length > 0 || selectedBrands.length > 0 || selectedWeights.length > 0 || minPrice > 0 || maxPrice < 1000 || minRating > 0 || inStockOnly) && (
              <div className="flex flex-wrap items-center gap-2 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Active Filters:</span>
                
                {selectedCategories.map(cat => (
                  <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:text-accent text-xs font-bold border border-primary/20">
                    {cat}
                    <button onClick={() => toggleSelection(setSelectedCategories, selectedCategories, cat)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                
                {selectedBrands.map(brand => (
                  <span key={brand} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:text-accent text-xs font-bold border border-primary/20">
                    {brand}
                    <button onClick={() => toggleSelection(setSelectedBrands, selectedBrands, brand)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                
                {selectedWeights.map(w => (
                  <span key={w} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:text-accent text-xs font-bold border border-primary/20">
                    {w}
                    <button onClick={() => toggleSelection(setSelectedWeights, selectedWeights, w)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                ))}
                
                {(minPrice > 0 || maxPrice < 1000) && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:text-accent text-xs font-bold border border-primary/20">
                    Rs. {minPrice} - {maxPrice}
                    <button onClick={() => { setMinPrice(0); setMaxPrice(1000); }} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                )}
                
                {minRating > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:text-accent text-xs font-bold border border-primary/20">
                    {minRating}★ +
                    <button onClick={() => setMinRating(0)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                )}
                
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 text-primary dark:text-accent text-xs font-bold border border-primary/20">
                    In Stock Only
                    <button onClick={() => setInStockOnly(false)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
                  </span>
                )}
                
                <button 
                  onClick={clearAllFilters}
                  className="ml-auto text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest underline decoration-dashed underline-offset-4"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Sorting bar (Desktop) */}
            <div className="hidden lg:flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-slate-100 dark:border-slate-900 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10">
              <p className="text-xs font-semibold text-slate-500">
                Showing <span className="font-bold text-slate-800 dark:text-white">{sortedProducts.length}</span> Products
              </p>
              
              <div className="flex items-center gap-2">
                <label htmlFor="catalog-sort" className="text-xs font-semibold text-slate-400">Sort By</label>
                <select
                  id="catalog-sort"
                  name="sortBy"
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
                <button 
                  onClick={clearAllFilters}
                  className="mt-4 px-6 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Clear All Filters
                </button>
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
                      className="flex flex-col h-full rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-300 overflow-hidden group text-left no-underline"
                    >
                      {/* Image */}
                      <div className="relative w-full h-[200px] sm:h-[240px] lg:h-[300px] overflow-hidden bg-white dark:bg-slate-950 flex items-center justify-center p-5">
                        <ProductImage 
                          src={prod.images[0] || '/images/placeholder.png'} 
                          alt={prod.name} 
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = '/images/butter.png';
                          }}
                          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
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
                              setSelectedVariantId(prod.variants?.[0]?.id || null);
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
                              ({prod.reviews?.length ?? prod.reviewCount ?? 0} reviews)
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
                <ProductImage src={prod.images[0]} alt={prod.name} className="max-h-full max-w-full object-contain rounded-lg" />
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
                      <div className="h-28 w-28 flex items-center justify-center border bg-white rounded-2xl mb-2 p-1">
                        <ProductImage src={prod.images[0]} alt={prod.name} className="max-h-full max-w-full object-contain" />
                      </div>
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
                  <ProductImage src={quickViewProduct.images[0]} alt={quickViewProduct.name} className="max-h-full max-w-full object-contain" />
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

                  {/* Variants Selector */}
                  {quickViewProduct.variants && quickViewProduct.variants.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Size</p>
                      <div className="flex gap-2">
                        {quickViewProduct.variants.map(v => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors ${
                              selectedVariantId === v.id 
                                ? 'border-accent bg-accent/10 text-slate-900 dark:text-accent' 
                                : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-1">
                    <span className="text-xs font-extrabold text-primary dark:text-white">
                      Rs. {quickViewProduct.variants?.find(v => v.id === selectedVariantId)?.price || quickViewProduct.price}
                    </span>
                    {(quickViewProduct.variants?.find(v => v.id === selectedVariantId)?.mrp || quickViewProduct.mrp) > (quickViewProduct.variants?.find(v => v.id === selectedVariantId)?.price || quickViewProduct.price) && (
                      <span className="text-[10px] text-slate-400 line-through">
                        Rs. {quickViewProduct.variants?.find(v => v.id === selectedVariantId)?.mrp || quickViewProduct.mrp}
                      </span>
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

      {/* 6. Mobile Action Bar & Drawers */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.5)] border border-slate-200/50 dark:border-slate-800/50">
        <button 
          onClick={() => setMobileSortOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
        >
          <SortDesc className="h-4 w-4" />
          <span>Sort</span>
        </button>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
        <button 
          onClick={() => setMobileFilterOpen(true)}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 relative"
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {(selectedCategories.length > 0 || selectedBrands.length > 0 || selectedWeights.length > 0 || minPrice > 0 || maxPrice < 1000 || minRating > 0 || inStockOnly) && (
            <span className="absolute top-1 right-1/4 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
          )}
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      <AnimatePresence>
        {mobileFilterOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileFilterOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white dark:bg-slate-950 rounded-t-3xl h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-900">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Filters</h3>
                <button onClick={() => setMobileFilterOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 text-left">
                {renderFilters()}
              </div>
              <div className="p-4 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950">
                <button 
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full py-3 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/30"
                >
                  Apply Filters ({sortedProducts.length} items)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sort Drawer */}
      <AnimatePresence>
        {mobileSortOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileSortOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative bg-white dark:bg-slate-950 rounded-t-3xl pb-8"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-900">
                <h3 className="text-base font-extrabold text-slate-800 dark:text-white">Sort By</h3>
                <button onClick={() => setMobileSortOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-900 rounded-full text-slate-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { value: 'popular', label: 'Popularity' },
                  { value: 'price-low', label: 'Price: Low to High' },
                  { value: 'price-high', label: 'Price: High to Low' },
                  { value: 'rating', label: 'Highest Rated' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setSortBy(option.value); setMobileSortOpen(false); }}
                    className={`w-full flex items-center justify-between p-4 rounded-xl text-left text-xs font-bold transition-colors ${
                      sortBy === option.value 
                        ? 'bg-primary/10 text-primary dark:text-accent border border-primary/20' 
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-transparent hover:border-slate-200 dark:hover:border-slate-800'
                    }`}
                  >
                    <span>{option.label}</span>
                    {sortBy === option.value && <Check className="h-4 w-4" strokeWidth={3} />}
                  </button>
                ))}
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
