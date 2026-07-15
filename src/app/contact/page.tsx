'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { 
  Phone, Mail, MapPin, Clock, MessageSquare, 
  Send, ChevronDown
} from 'lucide-react';

export default function Contact() {
  const { showToast } = useApp();

  const [activeTab, setActiveTab] = useState('form'); // 'form' | 'franchise' | 'dealer'
  
  // Contact Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Franchise & Dealer Form state
  const [businessName, setBusinessName] = useState('');
  const [location, setLocation] = useState('');
  const [investment, setInvestment] = useState('Rs. 2 - 5 Lakhs');

  const [faqOpen, setFaqOpen] = useState<{ [key: number]: boolean }>({});

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    showToast("Submitting your message...", "info");

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject: subject || "Contact Form", message })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Inquiry submitted! Check notifications.", "success");
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFranchiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Franchise application recorded! Our team will contact you.", "success");
    setBusinessName('');
    setLocation('');
  };

  const toggleFaq = (idx: number) => {
    setFaqOpen(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const faqItems = [
    {
      q: "Where do you source your milk from?",
      a: "All our milk is 100% sourced from our single state-of-the-art cattle farm located in Chiyyedu Village, Anantapur District, Andhra Pradesh. We do not aggregate or collect milk from external unverified sources, securing complete traceability."
    },
    {
      q: "What is A2 milk and how is it different?",
      a: "A2 milk is dairy containing only A2 beta-casein proteins. Standard store milk contains A1 protein, which releases BCM-7 during digestion, often causing lactose bloating and discomfort. Our A2 milk is from tested indigenous Indian cows, making it gentle and digestible."
    },
    {
      q: "What are your delivery timings?",
      a: "Fresh Milk pouches are delivered cold in our early morning slot from 6:00 AM to 9:00 AM. Other products like ghee, paneer, curd, and cheese are eligible for same-day delivery within 3 hours when ordered before 6:00 PM."
    },
    {
      q: "Are there any preservatives added?",
      a: "Zero preservatives, stabilizers, starch binders, or coloring agents are added. We rely entirely on high-temperature pasteurization and quick chilling under 4°C to maintain shelf-life naturally."
    }
  ];

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-left">
        
        {/* Title */}
        <div className="border-b border-slate-100 dark:border-slate-900 pb-6 mb-10">
          <h1 className="text-3xl font-bold font-display text-primary dark:text-white tracking-tight">
            Connect With Our Farms
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">
            Support center, business hours, and franchise partnerships
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left panel: Info + Map */}
          <div className="lg:col-span-5 space-y-8">
            
            {/* Contacts lists */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display">Contact Details</h3>
              
              <div className="space-y-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <div className="flex items-start gap-3">
                  <MapPin className="h-4.5 w-4.5 text-accent shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>REDDY PREMIUM DAIRY</strong><br />
                    Chiyyedu Village, Anantapur District,<br />
                    Andhra Pradesh – 515721, India
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-4.5 w-4.5 text-accent shrink-0" />
                  <a href="tel:+916300928511" className="hover:text-primary dark:hover:text-accent font-bold text-slate-800 dark:text-slate-200">
                    +91 6300928511
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-4.5 w-4.5 text-accent shrink-0" />
                  <a href="mailto:palleviswanathreddy11@gmail.com" className="hover:text-primary dark:hover:text-accent font-bold text-slate-800 dark:text-slate-200 break-all">
                    palleviswanathreddy11@gmail.com
                  </a>
                </div>

                <div className="flex items-start gap-3 border-t pt-3">
                  <Clock className="h-4.5 w-4.5 text-accent shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Daily Operating Hours:</strong><br />
                    Monday – Sunday: 6:00 AM – 9:00 PM
                  </p>
                </div>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="grid grid-cols-2 gap-4">
              <a 
                href="tel:+916300928511"
                className="py-3.5 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md"
              >
                <Phone className="h-4 w-4" />
                <span>Call Us</span>
              </a>
              <a 
                href="https://wa.me/916300928511"
                target="_blank"
                rel="noreferrer"
                className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-md"
              >
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
            </div>

            {/* Live Google Map */}
            <div className="w-full h-[300px] md:h-[400px] rounded-[16px] overflow-hidden shadow-md">
              <iframe
                title="Reddy Dairy Farms Map Location"
                src="https://www.google.com/maps?q=14.6186,77.6358&z=16&output=embed"
                className="w-full h-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

          </div>

          {/* Right panel: Contact / Franchise Form Tabs */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm">
            
            {/* Form tabs */}
            <div className="flex bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border mb-6 text-xs font-bold">
              <button 
                onClick={() => setActiveTab('form')}
                className={`flex-1 py-2.5 rounded-lg ${activeTab === 'form' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Support Center
              </button>
              <button 
                onClick={() => setActiveTab('franchise')}
                className={`flex-1 py-2.5 rounded-lg ${activeTab === 'franchise' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Franchise Inquiry
              </button>
              <button 
                onClick={() => setActiveTab('dealer')}
                className={`flex-1 py-2.5 rounded-lg ${activeTab === 'dealer' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
              >
                Dealership
              </button>
            </div>

            {/* TAB 1: SUPPORT TICKET */}
            {activeTab === 'form' && (
              <form onSubmit={handleFormSubmit} className="space-y-4 text-xs font-semibold text-slate-500 animate-splash">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                    <input 
                      type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</label>
                    <input 
                      type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                  <input 
                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                  <input 
                    type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Message *</label>
                  <textarea 
                    rows={5} required value={message} onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-primary text-white dark:bg-slate-850 hover:bg-primary-light font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 hover:scale-[1.01] transition-transform"
                >
                  <Send className="h-4 w-4" />
                  <span>Send Inquiry Message</span>
                </button>
              </form>
            )}

            {/* TAB 2 & 3: FRANCHISE / DEALER FORMS */}
            {(activeTab === 'franchise' || activeTab === 'dealer') && (
              <form onSubmit={handleFranchiseSubmit} className="space-y-4 text-xs font-semibold text-slate-500 animate-splash">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Applicant Name *</label>
                  <input 
                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number *</label>
                    <input 
                      type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                    <input 
                      type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposed Business / Enterprise Name</label>
                  <input 
                    type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proposed Outlet Location / Area *</label>
                  <input 
                    type="text" required placeholder="e.g. Sai Nagar, Anantapur Town" value={location} onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investment Capability *</label>
                  <select 
                    value={investment} onChange={(e) => setInvestment(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-955 border rounded-xl px-3 py-3 outline-none focus:border-accent font-semibold"
                  >
                    <option value="Rs. 2 - 5 Lakhs">Rs. 2 - 5 Lakhs</option>
                    <option value="Rs. 5 - 10 Lakhs">Rs. 5 - 10 Lakhs</option>
                    <option value="Rs. 10 - 20 Lakhs">Rs. 10 - 20 Lakhs</option>
                    <option value="Above Rs. 20 Lakhs">Above Rs. 20 Lakhs</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-secondary text-white font-bold rounded-xl shadow-md"
                >
                  Submit Partnership Request
                </button>
              </form>
            )}

          </div>

        </div>

        {/* FAQs Accordions Bottom */}
        <section className="pt-20 border-t border-slate-100 dark:border-slate-900 text-left space-y-8">
          <div className="max-w-2xl mx-auto text-center space-y-2 mb-4">
            <h2 className="text-2xl font-bold font-display text-primary dark:text-white">Frequently Asked Questions</h2>
            <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Instantly find answers to common queries</p>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqItems.map((item, idx) => {
              const isOpen = !!faqOpen[idx];
              return (
                <div 
                  key={idx}
                  className="border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm"
                >
                  <button 
                    onClick={() => toggleFaq(idx)}
                    className="w-full px-6 py-4 flex items-center justify-between font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-200 transition-colors text-left"
                  >
                    <span>{item.q}</span>
                    <ChevronDown className={`h-4.5 w-4.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold border-t pt-3.5 bg-slate-50/20">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

      </div>
    </PageWrapper>
  );
}
