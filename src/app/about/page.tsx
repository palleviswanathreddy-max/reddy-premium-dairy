'use client';

import React from 'react';
import PageWrapper from '@/components/PageWrapper';
import { Award, Compass, Heart, ShieldAlert, Sparkles, Building, Milk } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
  return (
    <PageWrapper>
      {/* Header Banner */}
      <section className="relative py-20 bg-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/interface image.png')" }} />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-4">
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            About REDDY PREMIUM DAIRY
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold font-display tracking-tight leading-none text-white">
            Pure Milk for Pure Hearts
          </h1>
          <p className="max-w-xl text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
            Discover our journey of supplying untouched, fresh, organic dairy directly from the green pastures of Chiyyedu to the dining tables of Anantapur.
          </p>
        </div>
      </section>

      {/* Owner Profile & Story */}
      <section className="py-20 bg-white dark:bg-slate-950 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Owner Image Block */}
            <div className="lg:col-span-5 relative group">
              <div className="absolute inset-0 bg-accent/20 rounded-3xl blur-2xl group-hover:scale-105 transition-transform pointer-events-none" />
              <img 
                src="/images/owner pic.png" 
                alt="Palle Viswanath Reddy" 
                className="relative z-10 w-full rounded-3xl object-cover shadow-2xl border-4 border-slate-100 dark:border-slate-800"
              />
              {/* Overlay card */}
              <div className="absolute bottom-6 left-6 right-6 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-5 py-4 rounded-2xl shadow-xl text-left border border-white/20">
                <p className="text-sm font-extrabold text-primary dark:text-white">Palle Viswanath Reddy</p>
                <p className="text-[10px] font-bold text-secondary dark:text-accent uppercase tracking-wider mt-0.5">Founder & Director</p>
              </div>
            </div>

            {/* Story Details */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <span className="text-[10px] font-bold text-secondary dark:text-accent uppercase tracking-wider font-semibold">
                Our Story
              </span>
              <h2 className="text-3xl font-bold text-primary dark:text-white font-display leading-tight">
                Rooted in Chiyyedu, Serving Anantapur
              </h2>
              <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed space-y-4">
                <p>
                  Founded by <strong>Palle Viswanath Reddy</strong>, REDDY PREMIUM DAIRY was born out of a simple vision: to bridge the gap between rural agricultural purity and urban lifestyle health. Seeing the rising adulteration, preservative additions, and synthetic hormones in commercial milk, Viswanath decided to build a state-of-the-art cattle farm right in his ancestral village of Chiyyedu, Anantapur District.
                </p>
                <p>
                  Today, our farm stretches across lush acreage, housing premium breeds of indigenous and high-yielding cattle. We combine ancient Vedic dairy concepts with modern European automation, ensuring our cows live stress-free, graze on organic green fodder, and are milked under absolute untouched conditions.
                </p>
                <p>
                  Our promise is simple: <strong>Pure, Fresh, Healthy</strong>. No chemicals. No preservatives. No human contact. Only pure, nature-engineered dairy delivered directly from milking pipelines to your home within hours.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Mission, Vision, and Values */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-primary dark:text-white">Core Pillars & Beliefs</h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">What guides our daily actions at Chiyyedu farm</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-4 shadow-sm">
              <div className="p-3 bg-secondary/15 rounded-2xl w-fit text-secondary dark:text-accent">
                <Compass className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display">Our Mission</h3>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                To nurture communities by supplying premium-grade, organic, A2, and farm-fresh dairy products, fostering health, vitality, and digestive well-being.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-4 shadow-sm">
              <div className="p-3 bg-blue-500/15 rounded-2xl w-fit text-blue-600 dark:text-blue-400">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display">Our Vision</h3>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                To become India's most trusted luxury organic dairy brand, representing sustainable farming practices, animal welfare, and pure farm-to-table integrity.
              </p>
            </div>

            <div className="p-8 rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-left space-y-4 shadow-sm">
              <div className="p-3 bg-yellow-500/15 rounded-2xl w-fit text-yellow-600 dark:text-yellow-400">
                <Award className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display">Core Values</h3>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                <strong>Integrity:</strong> Honesty in labeling, pricing, and testing. <br />
                <strong>Quality:</strong> Strict sanitation from herd feeds to packaging. <br />
                <strong>Community:</strong> Empowering local Chiyyedu village farmers.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* Farm & Plant Specifications */}
      <section className="py-20 bg-white dark:bg-slate-950 transition-colors text-left">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Chiyyedu Farm Info */}
            <div className="p-8 rounded-3xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Milk className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-primary dark:text-white font-display">
                  State-of-the-Art Dairy Farm
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                Our farm at Chiyyedu village utilizes smart ventilation, automated feeding systems, and dynamic sanitization chambers to maintain cow comfort. Cattle undergo routine checkups, graze freely in pesticide-free pasture lands, and are fed a nutrition-dense mix of grain cereals, dry hay, and green grass silage. Healthy, stress-free cows produce the sweetest, most nutrition-rich milk!
              </p>
            </div>

            {/* Processing Plant */}
            <div className="p-8 rounded-3xl border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-400">
                  <Building className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-primary dark:text-white font-display">
                  Modern Processing Plant
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
                Located adjacent to the farm to eliminate transit time, our processing facility is equipped with automated flash pasteurizers, high-speed centrifugal separators, vacuum pouch packing lines, and heavy-duty blast chillers. The entire sequence is closed-circuit, protecting the dairy products from air exposure and external contact, securing pure taste.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Certificates & Quality Awards */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-12">
          
          <div className="max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-primary dark:text-white">Certifications & Awards</h2>
            <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Verified premium dairy credentials</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { title: "FSSAI Certified", body: "Food safety authority registration" },
              { title: "NPOP Organic", body: "National organic standard compliant" },
              { title: "ISO 22000:2018", body: "Food safety management system certified" },
              { title: "Best Dairy Farm 2025", body: "Awarded by AP Cattle Breeders Assoc." }
            ].map(award => (
              <div 
                key={award.title} 
                className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-2"
              >
                <div className="flex justify-center text-accent">
                  <Sparkles className="h-6 w-6 fill-accent/10" />
                </div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-white font-display mt-2">{award.title}</h4>
                <p className="text-[10px] text-slate-400 font-semibold">{award.body}</p>
              </div>
            ))}
          </div>

        </div>
      </section>
      
    </PageWrapper>
  );
}
