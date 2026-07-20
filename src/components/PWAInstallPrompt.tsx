'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Single global variable to store the deferred prompt, surviving React re-renders and component remounts
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Listen once globally for the install event as early as possible
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar or automatic install prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e as BeforeInstallPromptEvent;
    // Dispatch a custom event to notify mounted components that the prompt is ready
    window.dispatchEvent(new CustomEvent('pwa-prompt-saved'));
  });
}

export default function PWAInstallPrompt() {
  const [hasPrompt, setHasPrompt] = useState(!!deferredPrompt);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // If prompt is already cached at module load, schedule the banner delay
    if (deferredPrompt) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    const handlePromptSaved = () => {
      setHasPrompt(true);
      setTimeout(() => {
        setIsVisible(true);
      }, 5000);
    };

    window.addEventListener('pwa-prompt-saved', handlePromptSaved);

    const handleAppInstalled = () => {
      deferredPrompt = null;
      setHasPrompt(false);
      setIsVisible(false);
      console.log('PWA was installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-saved', handlePromptSaved);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Trigger Chrome's install prompt inside a user click gesture
    await deferredPrompt.prompt();
    
    // Wait for the user response choice
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // Discard the used prompt
    deferredPrompt = null;
    setHasPrompt(false);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && hasPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[999]"
        >
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-2xl flex items-center justify-between gap-4 glass-premium">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192.png" alt="App Logo" className="h-8 w-8 object-contain rounded-xl" />
              </div>
              <div className="space-y-0.5 text-left">
                <p className="text-sm font-black text-white">Install Reddy Premium Dairy</p>
                <p className="text-[10px] font-semibold text-slate-400 leading-normal">Get fast access, offline mode & direct ordering!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 shrink-0"
              >
                <Download className="h-3.5 w-3.5" /> Install
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
