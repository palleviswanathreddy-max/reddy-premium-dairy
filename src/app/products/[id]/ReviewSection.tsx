'use client';

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Heart, AlertTriangle, ShieldCheck, Camera, X } from 'lucide-react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import { Review } from '@/db/db';

export default function ReviewSection({ productId }: { productId: string }) {
  const { user, showToast } = useApp();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(5);
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (images.length + files.length > 10) {
      showToast('Maximum 10 images allowed', 'error');
      return;
    }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      showToast('Please login to review', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          userId: user.id,
          userName: user.name,
          rating,
          title,
          description,
          images,
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Review submitted! Awaiting approval.', 'success');
        setTitle('');
        setDescription('');
        setRating(5);
        setImages([]);
        fetchReviews();
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Failed to submit review', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInteract = async (reviewId: string, actionType: 'like' | 'helpful' | 'report') => {
    if (!user) {
      showToast(`Please login to ${actionType} a review`, 'error');
      return;
    }
    let reason = '';
    if (actionType === 'report') {
      reason = prompt('Reason for reporting (spam, fake, abuse, wrong product):') || '';
      if (!reason) return;
    }
    try {
      const res = await fetch(`/api/reviews/${reviewId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, actionType, reason })
      });
      const data = await res.json();
      if (data.success) {
        showToast(actionType === 'report' ? 'Report submitted' : 'Vote registered', 'success');
        fetchReviews();
      } else {
        showToast(data.message, 'error');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  // Derived stats
  const approvedReviews = reviews.filter(r => r.status === 'approved' || r.userId === user?.id);
  const avgRating = approvedReviews.length > 0 
    ? (approvedReviews.reduce((a, b) => a + b.rating, 0) / approvedReviews.length).toFixed(1)
    : '0.0';
  const ratingCounts = [5, 4, 3, 2, 1].map(r => ({
    stars: r,
    count: approvedReviews.filter(rev => rev.rating === r).length
  }));

  if (loading) return <div className="py-10 text-center text-xs font-semibold text-slate-400">Loading reviews...</div>;

  return (
    <section className="py-10 border-t border-slate-100 dark:border-slate-900 text-left grid grid-cols-1 lg:grid-cols-12 gap-12">
      
      {/* Review Stats & List */}
      <div className="lg:col-span-8 space-y-8">
        
        {/* Summary Header */}
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
          <div className="text-center md:text-left">
            <h2 className="text-lg font-bold font-display text-primary dark:text-white mb-2">Customer Reviews</h2>
            <div className="text-5xl font-black text-slate-900 dark:text-white font-display flex items-center justify-center md:justify-start gap-2">
              {avgRating} <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
            </div>
            <p className="text-xs font-semibold text-slate-400 mt-2">Based on {approvedReviews.length} reviews</p>
          </div>

          {/* Progress Bars */}
          <div className="flex-1 w-full space-y-2">
            {ratingCounts.map(({ stars, count }) => {
              const pct = approvedReviews.length > 0 ? (count / approvedReviews.length) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span className="w-12">{stars} Stars</span>
                  <div className="flex-1 h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-slate-400">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Review List */}
        <div className="space-y-6 mt-8">
          {approvedReviews.length === 0 ? (
            <p className="text-xs text-slate-400 font-semibold p-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center">No reviews yet. Be the first to review!</p>
          ) : (
            approvedReviews.map((rev) => (
              <div key={rev.id} className="p-6 border border-slate-150 dark:border-slate-850 rounded-3xl bg-white dark:bg-slate-900/40 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold font-display text-sm">
                      {rev.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{rev.userName}</p>
                        {rev.isVerifiedPurchase && (
                          <span className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                            <ShieldCheck className="h-3 w-3" /> Verified
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-yellow-400">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star key={idx} className={`h-3 w-3 ${idx < rev.rating ? 'fill-current' : 'text-slate-200 dark:text-slate-800'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-semibold">
                    {new Date(rev.createdAt).toLocaleDateString()}
                    {rev.status === 'pending' && <span className="ml-2 text-orange-500">(Pending Approval)</span>}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{rev.title}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
                    {rev.description}
                  </p>
                </div>

                {rev.images && rev.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {rev.images.map((img: string, idx: number) => (
                      <div key={idx} className="relative h-16 w-16 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-pointer hover:opacity-80 transition-opacity">
                        <Image src={img} alt="" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-slate-500">
                  <button 
                    onClick={() => handleInteract(rev.id, 'helpful')}
                    className={`flex items-center gap-1.5 hover:text-primary transition-colors ${user?.id && rev.helpfulVotes?.includes(user.id) ? 'text-primary' : ''}`}
                  >
                    <ThumbsUp className="h-4 w-4" /> 
                    <span>Helpful ({rev.helpfulCount || 0})</span>
                  </button>
                  <button 
                    onClick={() => handleInteract(rev.id, 'like')}
                    className={`flex items-center gap-1.5 hover:text-red-500 transition-colors ${user?.id && rev.likes?.includes(user.id) ? 'text-red-500' : ''}`}
                  >
                    <Heart className="h-4 w-4" /> 
                    <span>Like ({rev.likeCount || 0})</span>
                  </button>
                  <button 
                    onClick={() => handleInteract(rev.id, 'report')}
                    className="flex items-center gap-1.5 hover:text-orange-500 transition-colors ml-auto"
                  >
                    <AlertTriangle className="h-4 w-4" /> 
                    <span>Report</span>
                  </button>
                </div>
                
                {rev.adminReply && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-primary dark:text-accent uppercase tracking-widest mb-1">Reddy Premium Dairy Reply</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{rev.adminReply}</p>
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      </div>

      {/* Submit Review */}
      <div className="lg:col-span-4">
        <div className="sticky top-24 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-900 space-y-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display border-b border-slate-200 dark:border-slate-800 pb-3">
            Write a Review
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold">
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Rating</h4>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`Rate ${star} out of 5 stars`}
                    onClick={() => setRating(star)}
                    className="focus:outline-none p-1 hover:scale-110 transition-transform"
                  >
                    <Star className={`h-6 w-6 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 dark:text-slate-700'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="review-title" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Title</label>
              <input
                id="review-title"
                name="reviewTitle"
                type="text"
                required
                placeholder="Brief summary of your review"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="review-description" className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</label>
              <textarea
                id="review-description"
                name="reviewDescription"
                rows={4}
                required
                placeholder="What did you like or dislike?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-accent"
              />
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Add Photos</span>
                <span className="text-slate-300">{images.length}/10</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative h-14 w-14 border border-slate-200 rounded-xl overflow-hidden">
                    <Image src={img} alt="" fill className="object-cover" />
                    <button type="button" aria-label="Remove image" onClick={() => handleRemoveImage(idx)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {images.length < 10 && (
                  <label htmlFor="review-images" className="h-14 w-14 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary cursor-pointer transition-colors">
                    <Camera className="h-5 w-5" />
                    <input id="review-images" name="reviewImages" aria-label="Upload photos" type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                  </label>
                )}
              </div>
            </div>

            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary hover:bg-primary-light text-white text-xs font-bold rounded-xl transition-all shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <p className="text-[10px] text-slate-400 text-center font-medium leading-relaxed">
              By submitting, you agree to our review guidelines. Verified purchases get a special badge!
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
