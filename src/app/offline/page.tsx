'use client';

import React, { useState } from 'react';
import { WifiOff, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    // Simulate brief load for premium feel, then reload page
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full space-y-8 bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo and Icon */}
        <div className="space-y-4 relative">
          <div className="h-16 w-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/5">
            <WifiOff className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight">No Internet Connection</h1>
            <p className="text-xs font-semibold text-slate-400 leading-relaxed">
              We couldn&apos;t connect to the server. Please check your Wi-Fi or mobile data and try again.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-4 relative">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary hover:bg-primary-light text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Checking Connection...' : 'Retry Connection'}</span>
          </button>
          
          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-slate-700/50"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Go to Homepage</span>
          </Link>
        </div>

        {/* Footer Brand */}
        <div className="pt-6 border-t border-slate-800/60">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
            Reddy Premium Dairy
          </p>
        </div>

      </div>
    </div>
  );
}
