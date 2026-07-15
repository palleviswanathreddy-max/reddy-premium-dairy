/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  Send 
} from 'lucide-react';

export default function Footer() {
  const { t, showToast } = useApp();
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      showToast("Thank you for subscribing to our newsletter!", "success");
      setEmail('');
    }
  };

  return (
    <footer className="bg-primary text-slate-300 pt-16 pb-8 border-t-4 border-accent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          
          {/* Logo & Company Bio */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-3">
              <img 
                src="/images/logo.png" 
                alt="Reddy Premium Dairy Logo" 
                className="h-12 w-12 rounded-full object-cover border-2 border-accent"
              />
              <div className="flex flex-col">
                <span className="font-display text-lg font-bold tracking-tight text-white leading-none">
                  REDDY
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-accent leading-none mt-0.5">
                  PREMIUM DAIRY
                </span>
              </div>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400 font-medium mt-2">
              {t('aboutShort')}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-full transition-colors"
                title="Facebook"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-full transition-colors"
                title="Instagram"
              >
                <svg className="h-4 w-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noreferrer" 
                className="p-2 bg-slate-800 hover:bg-slate-700 hover:text-white rounded-full transition-colors"
                title="Twitter/X"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links & Policies */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-bold tracking-wider uppercase text-white border-b border-slate-800 pb-2">
              {t('quickLinks')}
            </h3>
            <ul className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-accent transition-colors">
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-accent transition-colors">
                  {t('products')}
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-accent transition-colors">
                  {t('blog')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-accent transition-colors">
                  {t('contact')}
                </Link>
              </li>
              <li>
                <Link href="/contact?tab=faq" className="hover:text-accent transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact?tab=careers" className="hover:text-accent transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/contact?tab=franchise" className="hover:text-accent transition-colors">
                  Franchise
                </Link>
              </li>
              <li>
                <Link href="/contact?tab=dealer" className="hover:text-accent transition-colors">
                  Dealer Info
                </Link>
              </li>
            </ul>
          </div>

          {/* Address & Hours */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-bold tracking-wider uppercase text-white border-b border-slate-800 pb-2">
              {t('contactUs')}
            </h3>
            <div className="flex flex-col gap-3.5 text-xs font-semibold text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>REDDY PREMIUM DAIRY</strong><br />
                  Chiyyedu Village, Anantapur District,<br />
                  Andhra Pradesh – 515721, India
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-accent shrink-0" />
                <a href="tel:+916300928511" className="hover:text-white transition-colors">
                  +91 6300928511
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                <a href="mailto:palleviswanathreddy11@gmail.com" className="hover:text-white transition-colors break-all">
                  palleviswanathreddy11@gmail.com
                </a>
              </div>
              <div className="flex items-start gap-2.5 border-t border-slate-800 pt-2.5">
                <Clock className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Business Hours:</strong><br />
                  Mon – Sun: 6:00 AM – 9:00 PM
                </p>
              </div>
            </div>
          </div>

          {/* Newsletter Subscribe */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-bold tracking-wider uppercase text-white border-b border-slate-800 pb-2">
              {t('newsletterTitle')}
            </h3>
            <p className="text-xs leading-relaxed text-slate-400 font-semibold">
              Subscribe to get latest updates, fresh arrivals, and festival discounts.
            </p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input
                type="email"
                placeholder={t('newsletterPlaceholder')}
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 text-white border border-slate-700 focus:border-accent text-xs rounded-xl px-4 py-3 outline-none font-medium"
              />
              <button 
                type="submit" 
                className="p-3 bg-accent text-slate-900 hover:bg-accent-light rounded-xl transition-all shadow-md"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>

        </div>

        {/* Policies & Copyrights */}
        <div className="border-t border-slate-800 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
            <Link href="/policy/privacy" className="hover:text-slate-300 transition-colors">
              {t('privacy')}
            </Link>
            <span>•</span>
            <Link href="/policy/terms" className="hover:text-slate-300 transition-colors">
              {t('terms')}
            </Link>
            <span>•</span>
            <Link href="/policy/refund" className="hover:text-slate-300 transition-colors">
              {t('refundPolicy')}
            </Link>
            <span>•</span>
            <Link href="/policy/shipping" className="hover:text-slate-300 transition-colors">
              {t('shippingPolicy')}
            </Link>
          </div>
          <p className="text-center sm:text-right">
            © {new Date().getFullYear()} REDDY PREMIUM DAIRY. All Rights Reserved. Owned by Palle Viswanath Reddy.
          </p>
        </div>
      </div>
    </footer>
  );
}
