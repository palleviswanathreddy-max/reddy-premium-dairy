'use client';

import React, { useState, useEffect } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { Star, ShieldCheck, CheckCircle, XCircle, AlertTriangle, Trash2, MessageSquare } from 'lucide-react';
import Image from 'next/image';

export default function AdminReviewsPage() {
  const { showToast } = useApp();
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [id: string]: string }>({});

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const res = await fetch('/api/reviews');
      const data = await res.json();
      if (data.success) {
        setReviews(data.reviews);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Review marked as ${status}`, 'success');
        fetchReviews();
      } else {
        showToast(data.message, 'error');
      }
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleReply = async (id: string) => {
    const text = replyText[id];
    if (!text) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: text })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Reply added successfully', 'success');
        setReplyText(prev => ({ ...prev, [id]: '' }));
        fetchReviews();
      }
    } catch (e) {
      showToast('Failed to add reply', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Review deleted', 'success');
        fetchReviews();
      }
    } catch (e) {
      showToast('Failed to delete review', 'error');
    }
  };

  // KPIs
  const total = reviews.length;
  const pending = reviews.filter(r => r.status === 'pending').length;
  const rejected = reviews.filter(r => r.status === 'rejected' || r.status === 'spam').length;
  const avgRating = total > 0 ? (reviews.reduce((a, b) => a + b.rating, 0) / total).toFixed(1) : '0.0';

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold font-display text-primary dark:text-white mb-8">Review Moderation Panel</h1>
        
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Reviews</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white font-display">{total}</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pending</p>
            <p className="text-3xl font-black text-amber-500 font-display">{pending}</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rejected/Spam</p>
            <p className="text-3xl font-black text-red-500 font-display">{rejected}</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Rating</p>
            <p className="text-3xl font-black text-yellow-500 font-display">{avgRating}</p>
          </div>
        </div>

        {/* Reviews List */}
        {loading ? (
          <p className="text-center text-xs font-semibold text-slate-400 py-20">Loading reviews...</p>
        ) : (
          <div className="space-y-6">
            {reviews.map(rev => (
              <div key={rev.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row gap-6 items-start">
                
                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${
                      rev.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      rev.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      rev.status === 'spam' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {rev.status}
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{rev.userName}</p>
                    {rev.isVerifiedPurchase && <ShieldCheck className="h-4 w-4 text-emerald-500" />}
                    <span className="text-xs font-semibold text-slate-400 ml-auto">{new Date(rev.createdAt).toLocaleString()}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1 text-yellow-400 mb-2">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className={`h-3.5 w-3.5 ${idx < rev.rating ? 'fill-current' : 'text-slate-200'}`} />
                      ))}
                    </div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{rev.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{rev.description}</p>
                  </div>

                  {rev.reports?.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                      <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="h-3.5 w-3.5"/> Reports ({rev.reports.length})</p>
                      <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc pl-4">
                        {rev.reports.map((r: any, idx: number) => <li key={idx}>{r.reason} (by {r.userId})</li>)}
                      </ul>
                    </div>
                  )}

                  {rev.images && rev.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {rev.images.map((img: string, idx: number) => (
                        <div key={idx} className="relative h-16 w-16 border rounded-xl overflow-hidden">
                          <Image src={img} alt="" fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Input */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <input 
                      type="text" 
                      placeholder="Add official reply..." 
                      className="flex-1 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none focus:border-accent"
                      value={replyText[rev.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                    />
                    <button 
                      onClick={() => handleReply(rev.id)}
                      className="px-4 py-2.5 bg-accent hover:bg-accent-light text-slate-900 text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" /> Reply
                    </button>
                  </div>
                </div>

                {/* Actions sidebar */}
                <div className="w-full md:w-48 shrink-0 flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Actions</p>
                  <button onClick={() => handleUpdateStatus(rev.id, 'approved')} className="w-full px-3 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                    <CheckCircle className="h-4 w-4"/> Approve
                  </button>
                  <button onClick={() => handleUpdateStatus(rev.id, 'rejected')} className="w-full px-3 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                    <XCircle className="h-4 w-4"/> Reject
                  </button>
                  <button onClick={() => handleUpdateStatus(rev.id, 'spam')} className="w-full px-3 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors">
                    <AlertTriangle className="h-4 w-4"/> Mark Spam
                  </button>
                  <div className="h-px w-full bg-slate-200 dark:bg-slate-800 my-1" />
                  <button onClick={() => handleDelete(rev.id)} className="w-full px-3 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                    <Trash2 className="h-4 w-4"/> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
