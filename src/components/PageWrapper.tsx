'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartSidebar from '@/components/CartSidebar';
import NotificationsSidebar from '@/components/NotificationsSidebar';
import AIChatbot from '@/components/AIChatbot';
import { AnimatePresence } from 'framer-motion';

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar 
        onCartToggle={() => setCartOpen(!cartOpen)} 
        onNotificationsToggle={() => setNotifOpen(!notifOpen)} 
      />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      
      {/* Sidebars & Chatbot */}
      <AnimatePresence>
        {cartOpen && <CartSidebar isOpen={cartOpen} onClose={() => setCartOpen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {notifOpen && <NotificationsSidebar isOpen={notifOpen} onClose={() => setNotifOpen(false)} />}
      </AnimatePresence>
      
      <AIChatbot />
    </div>
  );
}
