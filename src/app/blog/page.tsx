'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import PageWrapper from '@/components/PageWrapper';
import { Calendar, Clock, BookOpen, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function Blog() {
  const { t } = useApp();
  const [blogs, setBlogs] = useState<any[]>([]);

  useEffect(() => {
    // Load initial blogs
    const initialBlogs = [
      {
        id: "blog-1",
        title: "Why A2 Cow Milk is Better for Your Digestive System",
        summary: "Discover the health differences between A1 and A2 proteins and how switching to A2 milk can alleviate bloating and discomfort.",
        category: "Health Articles",
        image: "/images/cow_milk.png",
        readTime: "4 min read",
        date: "2026-07-01"
      },
      {
        id: "blog-2",
        title: "Perfect Soft Paneer Tikka Recipe for Family Evenings",
        summary: "An easy step-by-step recipe to get restaurant-style soft Paneer Tikka using Reddy Fresh Malai Paneer at home.",
        category: "Recipes",
        image: "/images/paneer.png",
        readTime: "5 min read",
        date: "2026-06-28"
      },
      {
        id: "blog-3",
        title: "How to Store Butter & Ghee to Retain Fresh Aroma",
        summary: "Important tips on maximizing the shelf life and sensory quality of dairy fats in hot summer months.",
        category: "Nutrition Tips",
        image: "/images/ghee.png",
        readTime: "3 min read",
        date: "2026-06-25"
      }
    ];
    setBlogs(initialBlogs);
  }, []);

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-left">
        
        {/* Title */}
        <div className="border-b border-slate-100 dark:border-slate-900 pb-6 mb-10">
          <h1 className="text-3xl font-bold font-display text-primary dark:text-white tracking-tight">
            Wellness & Dairy Blog
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-1">
            Health articles, organic recipes, and news from Chiyyedu farm
          </p>
        </div>

        {/* Blog grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map(blog => (
            <article 
              key={blog.id} 
              className="flex flex-col rounded-3xl border border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-xl transition-shadow group cursor-pointer"
            >
              {/* Image preview */}
              <div className="aspect-video bg-slate-50 dark:bg-slate-950 overflow-hidden relative border-b">
                <img 
                  src={blog.image} 
                  alt="" 
                  className="object-cover h-full w-full group-hover:scale-102 transition-transform duration-500" 
                />
                <span className="absolute top-4 left-4 bg-primary text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/15">
                  {blog.category}
                </span>
              </div>

              {/* Info content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {blog.date}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {blog.readTime}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display leading-snug line-clamp-2 group-hover:text-primary dark:group-hover:text-accent">
                    {blog.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-semibold line-clamp-3">
                    {blog.summary}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-1 text-xs font-bold text-secondary dark:text-accent group-hover:gap-2 transition-all">
                  <span>Read Article</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </article>
          ))}
        </div>

      </div>
    </PageWrapper>
  );
}
