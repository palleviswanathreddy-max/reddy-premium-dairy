'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, @next/next/no-img-element */

import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, ShoppingCart } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  products?: any[];
}

export default function AIChatbot() {
  const { t, products, addToCart } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize messages on mount/reopen
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([
      {
        id: 'msg-welcome',
        sender: 'bot',
        text: t('chatWelcome')
      }
    ]);
  }, [isOpen, t]);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg: Message = {
      // eslint-disable-next-line react-hooks/purity
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: inputVal
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    // Simulate AI response logic
    setTimeout(() => {
      setIsTyping(false);
      const botResponse = generateAIResponse(userMsg.text);
      setMessages(prev => [...prev, botResponse]);
    }, 1200);
  };

  // Chatbot Local Response Logic
  const generateAIResponse = (query: string): Message => {
    const text = query.toLowerCase();
    let reply = "";
    let recommended: any[] = [];

    // Keywords matching
    if (text.includes('owner') || text.includes('viswanath') || text.includes('palle')) {
      reply = "REDDY PREMIUM DAIRY is founded and owned by Palle Viswanath Reddy. He is dedicated to supplying 100% pure and fresh dairy to Anantapur. You can contact him directly at +91 6300928511 or palleviswanathreddy11@gmail.com.";
    } 
    else if (text.includes('milk') || text.includes('a2') || text.includes('cow') || text.includes('buffalo')) {
      reply = "We offer premium A2 Cow Milk and thick Farm Fresh Buffalo Milk. Our milk is chilled under 4°C within 1 hour of milking to retain purity. Here are our top products:";
      recommended = products.filter(p => p.category === 'Fresh Milk').slice(0, 2);
    } 
    else if (text.includes('paneer') || text.includes('curd') || text.includes('ghee')) {
      reply = "Our Malai Paneer is incredibly soft, our curd is thick and probiotic, and our Vedic Cow Ghee has that rich danedar texture. Check these out:";
      recommended = products.filter(p => ['Paneer', 'Curd', 'Ghee'].includes(p.category)).slice(0, 2);
    } 
    else if (text.includes('address') || text.includes('location') || text.includes('where') || text.includes('farm')) {
      reply = "Our farm and processing facility is located in Chiyyedu Village, Anantapur District, Andhra Pradesh - 515721, India. You are welcome to visit our state-of-the-art farm to see our healthy cattle and automated milking systems!";
    } 
    else if (text.includes('delivery') || text.includes('time') || text.includes('ship')) {
      reply = "We offer same-day delivery within 3 hours for Curd, Paneer, Butter, and Ghee. Fresh milk is delivered in our early morning slot (6:00 AM - 9:00 AM) to ensure it reaches you cold and fresh.";
    } 
    else if (text.includes('coupon') || text.includes('discount') || text.includes('offer')) {
      reply = "You can use code 'REDDY50' to get Rs. 50 off on purchases above Rs. 300, or 'PURE10' to get 10% off. We also run flash sales on weekends!";
    } 
    else if (text.includes('hello') || text.includes('hi') || text.includes('hey')) {
      reply = "Hello there! Hope you are having a wonderful day. How can I assist you with your dairy orders today?";
    } 
    else if (text.includes('support') || text.includes('ticket') || text.includes('help') || text.includes('complain')) {
      reply = "If you need customer support, please drop us a message via the Contact page form, or email our support desk at palleviswanathreddy11@gmail.com. We typically resolve all inquiries within 24 hours.";
    } 
    else {
      reply = "I understand you are asking about our dairy services. We provide premium fresh milk, curd, paneer, and ghee. Let me recommend some of our hot-selling products for you:";
      recommended = products.slice(0, 2);
    }

    return {
      id: `msg-${Date.now()}`,
      sender: 'bot',
      text: reply,
      products: recommended.length > 0 ? recommended : undefined
    };
  };

  const handleRecommendClick = (prod: any) => {
    addToCart(prod, 1);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      
      {/* Floating Toggle Button */}
      <motion.button 
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="h-14 w-14 rounded-full bg-accent text-slate-900 shadow-2xl flex items-center justify-center cursor-pointer relative hover:bg-accent-light"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-secondary"></span>
          </span>
        )}
      </motion.button>

      {/* Floating Chat Container */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 100 }}
            className="absolute bottom-16 right-0 w-80 sm:w-96 h-[500px] bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col glass-premium"
          >
            {/* Header */}
            <div className="px-5 py-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-accent rounded-full text-slate-900">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold font-display tracking-wide">{t('chatTitle')}</h3>
                  <p className="text-[9px] font-semibold text-accent uppercase tracking-wider">Online • Ready to help</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 dark:bg-slate-900/10">
              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-xs leading-relaxed font-semibold shadow-sm ${
                      msg.sender === 'user' 
                        ? 'bg-primary text-white rounded-br-none' 
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-900'
                    }`}
                  >
                    <p className="whitespace-pre-line text-left">{msg.text}</p>
                    
                    {/* Bot Recommendations Widget */}
                    {msg.products && (
                      <div className="mt-3.5 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        {msg.products.map(prod => (
                          <div 
                            key={prod.id}
                            className="flex items-center justify-between gap-3 p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <img src={prod.images[0]} alt={prod.name} className="h-10 w-10 object-contain rounded-lg border border-slate-200/50 dark:border-slate-800 bg-white p-0.5" />
                              <div className="text-left min-w-0">
                                <p className="text-[10px] font-bold truncate text-slate-800 dark:text-white">{prod.name}</p>
                                <p className="text-[9px] font-semibold text-slate-400 mt-0.5">Rs. {prod.price}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRecommendClick(prod)}
                              className="p-1.5 bg-accent text-slate-900 rounded-lg hover:bg-accent-light"
                              title="Add to cart"
                            >
                              <ShoppingCart className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Simulated typing */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-100 dark:border-slate-800 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-950 flex gap-2">
              <input
                id="ai-chat-input"
                name="aiChatInput"
                autoComplete="off"
                type="text"
                placeholder={t('chatPlaceholder')}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="flex-1 bg-slate-100 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-200 px-4 py-3 rounded-xl outline-none focus:bg-white dark:focus:bg-slate-950 border border-transparent focus:border-slate-200 focus:ring-1 focus:ring-accent"
              />
              <button 
                type="submit" 
                className="p-3 bg-accent text-slate-900 hover:bg-accent-light rounded-xl shadow-md transition-all shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
