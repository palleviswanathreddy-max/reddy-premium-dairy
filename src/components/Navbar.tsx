'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { 
  ShoppingBag, 
  Heart, 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Globe, 
  User, 
  Search, 
  Mic, 
  Camera, 
  ChevronDown, 
  Bell, 
  LogOut, 
  LayoutDashboard 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  onCartToggle: () => void;
  onNotificationsToggle: () => void;
}

export default function Navbar({ onCartToggle, onNotificationsToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    theme, 
    toggleTheme, 
    language, 
    setLanguage, 
    t, 
    user, 
    logout, 
    cart, 
    wishlist, 
    notifications,
    showToast
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [langDropdown, setLangDropdown] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Hydration fix
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Monitor Scroll for Glass styling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Total cart item quantity
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchVal)}`);
      setSearchVal('');
    }
  };

  // Real Voice Search using Web Speech API
  const startVoiceSearch = () => {
    // If already listening, stop it manually
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      showToast('Microphone not supported on this browser.', 'error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language === 'te' ? 'te-IN' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      showToast('Listening... Speak a product name', 'info');
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setSearchVal(transcript);
      showToast(`Searching for "${transcript}"`, 'success');
      router.push(`/products?search=${encodeURIComponent(transcript)}`);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        showToast('Permission Denied. Please allow microphone access.', 'error');
      } else if (event.error === 'no-speech') {
        showToast("Didn't catch that. Try again.", 'error');
      } else {
        showToast(`Microphone error: ${event.error}`, 'error');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Image Search Simulation
  const triggerImageSearch = () => {
    showToast("Opening camera... select a product label to identify.", "info");
    setTimeout(() => {
      const match = "Vedic Cow Ghee";
      showToast(`AI Match Identified: "${match}"`, 'success');
      router.push(`/products?search=${encodeURIComponent(match)}`);
    }, 1800);
  };

  const navLinks = [
    { name: t('home'), path: '/' },
    { name: t('about'), path: '/about' },
    { name: t('products'), path: '/products' },
    { name: t('blog'), path: '/blog' },
    { name: t('contact'), path: '/contact' }
  ];

  return (
    <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${
      isScrolled 
        ? 'glass-premium shadow-md py-3' 
        : 'bg-white/80 dark:bg-slate-950/80 border-b border-slate-200/50 dark:border-slate-800/50 py-4'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img 
              src="/images/logo.png" 
              alt="Reddy Premium Dairy Logo" 
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full object-cover border-2 border-accent"
              onError={(e) => {
                // Fail-safe SVG if image fails
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="flex flex-col">
              <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-primary dark:text-white leading-none">
                REDDY
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-secondary dark:text-accent leading-none mt-0.5">
                PREMIUM DAIRY
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-3">
            {navLinks.map((link) => {
              const isActive = pathname === link.path;
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`px-3 py-2 text-sm font-medium tracking-wide rounded-lg transition-colors ${
                    isActive 
                      ? 'text-primary dark:text-accent bg-slate-100 dark:bg-slate-800' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-accent hover:bg-slate-50 dark:hover:bg-slate-900'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-72">
            <input
              id="navbar-search-desktop"
              name="searchValDesktop"
              autoComplete="off"
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 pl-4 pr-16 py-2 rounded-full text-xs border border-transparent focus:border-slate-300 dark:focus:border-slate-700 outline-none focus:bg-white dark:focus:bg-slate-950 transition-all font-medium"
            />
            <div className="absolute right-2 flex items-center gap-1.5 text-slate-400">
              <button 
                type="button" 
                onClick={startVoiceSearch} 
                className={`hover:text-primary dark:hover:text-accent p-1 rounded-full transition-colors ${isListening ? 'text-red-500 animate-pulse' : ''}`}
                title="Voice Search"
              >
                <Mic className="h-3.5 w-3.5" />
              </button>
              <button 
                type="button" 
                onClick={triggerImageSearch}
                className="hover:text-primary dark:hover:text-accent p-1 rounded-full transition-colors"
                title="AI Product Match"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <button type="submit" className="hover:text-primary dark:hover:text-accent p-1">
                <Search className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>

          {/* Right Toolbar Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            
            {/* Search Toggle for Mobile/Tablet */}
            <button 
              onClick={() => router.push('/products')}
              className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Language Switcher Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setLangDropdown(!langDropdown)}
                onBlur={() => setTimeout(() => setLangDropdown(false), 200)}
                className="flex items-center gap-1 p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors text-xs font-semibold uppercase tracking-wider"
              >
                <Globe className="h-4.5 w-4.5" />
                <span className="hidden sm:inline">{language}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <AnimatePresence>
                {langDropdown && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-32 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-1.5 shadow-xl glass-premium"
                  >
                    <button 
                      onClick={() => setLanguage('en')}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs font-medium rounded-lg ${language === 'en' ? 'bg-primary/10 text-primary dark:text-accent' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                    >
                      {t('english')}
                    </button>
                    <button 
                      onClick={() => setLanguage('te')}
                      className={`flex w-full items-center justify-between px-3 py-2 text-xs font-medium rounded-lg ${language === 'te' ? 'bg-primary/10 text-primary dark:text-accent' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                    >
                      {t('telugu')}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>

            {/* Notifications Button */}
            <button 
              onClick={onNotificationsToggle}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
            >
              <Bell className="h-4.5 w-4.5" />
              {mounted && unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* Wishlist Link */}
            <Link 
              href="/profile?tab=wishlist" 
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
            >
              <Heart className="h-4.5 w-4.5" />
              {mounted && wishlist.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
                  {wishlist.length}
                </span>
              )}
            </Link>

            {/* Shopping Cart Button */}
            <button 
              onClick={onCartToggle}
              className="relative p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {mounted && cartCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-slate-900 ring-2 ring-white dark:ring-slate-950">
                  {cartCount}
                </span>
              )}
            </button>

            {/* User Profile / Dropdown */}
            <div className="relative">
              {!mounted ? (
                <div className="h-9 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse"></div>
              ) : user ? (
                <>
                  <button 
                    onClick={() => setUserDropdown(!userDropdown)}
                    onBlur={() => setTimeout(() => setUserDropdown(false), 200)}
                    className="flex items-center gap-1.5 p-1 rounded-full border border-slate-200 dark:border-slate-800 hover:shadow-sm"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white uppercase">
                        {user.name.charAt(0)}
                      </span>
                    )}
                    <span className="hidden md:inline text-xs font-semibold text-slate-700 dark:text-slate-200 pr-1.5">
                      {user.name.split(' ')[0]}
                    </span>
                  </button>
                  <AnimatePresence>
                    {userDropdown && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 mt-2 w-52 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-2 shadow-2xl glass-premium"
                      >
                        <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-900 mb-1.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 truncate">{user.email}</p>
                        </div>
                        {user.role === 'admin' && (
                          <Link 
                            href="/admin" 
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-primary dark:text-accent hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            {t('admin')}
                          </Link>
                        )}
                        <Link 
                          href="/profile" 
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                        >
                          <User className="h-4 w-4" />
                          {t('profile')}
                        </Link>
                        <Link 
                          href="/profile?tab=orders" 
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                        >
                          <ShoppingBag className="h-4 w-4" />
                          {t('orderHistory')}
                        </Link>
                        <button 
                          onClick={logout}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-950/20 rounded-lg"
                        >
                          <LogOut className="h-4 w-4" />
                          {t('logout')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link 
                  href="/login" 
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary dark:bg-slate-900 text-white hover:bg-primary-light dark:hover:bg-slate-800 rounded-full text-xs font-bold transition-all shadow-sm"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>{t('login')}</span>
                </Link>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-colors"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Sliding Drawer Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 overflow-hidden shadow-inner"
          >
            <div className="px-4 py-4 space-y-2.5">
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setIsOpen(false)}
                    className={`block px-4 py-2.5 rounded-xl text-sm font-semibold ${
                      isActive 
                        ? 'bg-primary/5 text-primary dark:text-accent border-l-4 border-accent' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    {link.name}
                  </Link>
                );
              })}
              
              {/* Mobile Search */}
              <form onSubmit={handleSearchSubmit} className="pt-2 flex gap-2">
                <input
                  id="navbar-search-mobile"
                  name="searchValMobile"
                  autoComplete="off"
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs outline-none focus:bg-white dark:focus:bg-slate-950 border border-transparent focus:border-slate-300"
                />
                <button type="submit" className="p-2.5 bg-primary text-white rounded-xl">
                  <Search className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
