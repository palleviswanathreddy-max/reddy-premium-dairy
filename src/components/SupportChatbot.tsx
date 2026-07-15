'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { MessageSquare, X, Send, Bot, User as UserIcon, Globe, Sparkles } from 'lucide-react';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export default function SupportChatbot() {
  const { user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState<'en' | 'te'>('en');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when language changes
  useEffect(() => {
    const welcomeText = lang === 'te'
      ? 'నమస్కారం! నేను రెడ్డి డెయిరీ AI సహాయకుడిని. నేను మీకు ఎలా సహాయం చేయగలను? తాజా పాలు, పెరుగు, ఆర్డర్ల స్థితి గురించి అడగండి.'
      : 'Hello! I am your Reddy Dairy AI Support assistant. How can I help you today? Ask me about products, pricing, or track your orders.';
    
    setMessages([
      {
        sender: 'bot',
        text: welcomeText,
        timestamp: new Date()
      }
    ]);
  }, [lang]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          lang,
          userId: user?.id || null
        })
      });
      const data = await res.json();
      
      const botMsg: Message = {
        sender: 'bot',
        text: data.reply || (lang === 'te' ? 'క్షమించండి, మళ్లీ ప్రయత్నించండి.' : 'Sorry, please try again.'),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error(err);
      const errorMsg: Message = {
        sender: 'bot',
        text: lang === 'te' ? 'నెట్‌వర్క్ లోపం సంభవించింది.' : 'A network error occurred. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = lang === 'te'
    ? [
        { text: 'పాలు మరియు నెయ్యి ధర ఎంత?', label: '🥛 ఉత్పత్తులు' },
        { text: 'నా చివరి ఆర్డర్‌ను ట్రాక్ చేయండి', label: '📦 ఆర్డర్ ట్రాక్' },
        { text: 'డెలివరీ సమయం ఎంత?', label: '⚡ డెలివరీ వేగం' },
        { text: 'సంప్రదింపు వివరాలు', label: '📞 ఫోన్ నెంబర్' }
      ]
    : [
        { text: 'Milk & Ghee pricing', label: '🥛 Products' },
        { text: 'Track my last order', label: '📦 Track Order' },
        { text: 'Delivery timings', label: '⚡ Delivery time' },
        { text: 'Contact details', label: '📞 Contact Us' }
      ];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="w-[340px] sm:w-[380px] h-[500px] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden mb-4 animate-splash glass-premium">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-primary to-emerald-600 flex items-center justify-between text-white border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                <Bot className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold font-display">Reddy Dairy Assistant</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-[9px] text-emerald-200 font-bold uppercase tracking-wider">Online Support</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <button
                onClick={() => setLang(prev => prev === 'en' ? 'te' : 'en')}
                className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[9px] font-extrabold flex items-center gap-1 border border-white/15 transition-all"
                title={lang === 'en' ? 'Switch to Telugu' : 'Switch to English'}
              >
                <Globe className="h-3 w-3 text-accent" />
                <span>{lang === 'en' ? 'తెలుగు' : 'English'}</span>
              </button>

              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-lg transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-950/40">
            {messages.map((msg, i) => (
              <div 
                key={i} 
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender !== 'user' && (
                  <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-accent" />
                  </div>
                )}
                <div 
                  className={`max-w-[75%] rounded-2xl p-3 text-xs font-semibold leading-relaxed whitespace-pre-line text-left ${
                    msg.sender === 'user'
                      ? 'bg-accent text-slate-950 font-bold rounded-tr-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-white/5'
                  }`}
                >
                  {msg.text}
                  <span className={`block text-[8px] mt-1.5 text-right ${msg.sender === 'user' ? 'text-slate-900/60' : 'text-slate-400'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {msg.sender === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4 text-accent" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-accent animate-spin" />
                </div>
                <div className="bg-slate-800 border border-white/5 text-slate-400 rounded-2xl rounded-tl-none p-3 text-xs flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="px-4 py-2 bg-slate-900/70 border-t border-white/5 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(s.text)}
                className="bg-slate-800 hover:bg-slate-700 text-[10px] text-accent font-bold py-1.5 px-3 rounded-full border border-white/10 transition-all flex items-center gap-1.5 flex-shrink-0 active:scale-95"
              >
                <Sparkles className="h-3 w-3 text-accent" />
                {s.label}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputText); }}
            className="p-3 bg-slate-900 border-t border-white/10 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={lang === 'te' ? 'మీ ప్రశ్నను ఇక్కడ టైప్ చేయండి...' : 'Type your message here...'}
              className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="bg-accent text-slate-950 p-2.5 rounded-xl hover:bg-accent-light transition-all flex items-center justify-center disabled:opacity-40 disabled:hover:bg-accent"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Launcher Bubble Button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="h-14 w-14 rounded-full bg-gradient-to-tr from-primary to-emerald-500 text-white shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300 relative border border-white/15 cursor-pointer hover:shadow-primary/30"
      >
        {isOpen ? (
          <X className="h-6 w-6 animate-splash" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-6 w-6" />
            <div className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-accent rounded-full border-2 border-slate-900 flex items-center justify-center animate-pulse" />
          </div>
        )}
      </button>
    </div>
  );
}
