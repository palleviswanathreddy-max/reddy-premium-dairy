'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Ticket, Plus, ArrowLeft, Trash2, ShieldAlert, Check } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount?: number;
  isActive: boolean;
  validUntil: string;
  createdAt: string;
}

export default function CouponManagerPage() {
  const router = useRouter();
  const { user, showToast } = useApp();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('percentage');
  const [value, setValue] = useState('');
  const [minPurchase, setMinPurchase] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [usageLimit, setUsageLimit] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coupons');
      const data = await res.json();
      if (data.success) {
        setCoupons(data.coupons || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch coupons', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (user?.role === 'admin') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCoupons();
    }
  }, [user, fetchCoupons]);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !description || !value) return;

    try {
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 30);

      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          description,
          type,
          value: Number(value),
          minPurchase: minPurchase ? Number(minPurchase) : 0,
          maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : fallbackDate.toISOString(),
          usageLimit: usageLimit ? Number(usageLimit) : undefined,
          isActive
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('Coupon created successfully!', 'success');
        setIsAdding(false);
        resetForm();
        fetchCoupons();
      } else {
        showToast(data.message || 'Failed to create coupon', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred', 'error');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      const res = await fetch(`/api/coupons?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Coupon deleted', 'success');
        fetchCoupons();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete coupon', 'error');
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    try {
      const res = await fetch('/api/coupons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: coupon.id,
          isActive: !coupon.isActive
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Coupon marked as ${!coupon.isActive ? 'Active' : 'Inactive'}`, 'success');
        fetchCoupons();
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  const resetForm = () => {
    setCode('');
    setDescription('');
    setType('percentage');
    setValue('');
    setMinPurchase('');
    setMaxDiscount('');
    setValidUntil('');
    setUsageLimit('');
    setIsActive(true);
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
        <div className="space-y-4 max-w-sm text-center">
          <ShieldAlert className="h-14 w-14 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-6 sm:p-10">
      
      <div className="max-w-5xl mx-auto space-y-8 animate-splash">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin')}
              className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold font-display text-primary dark:text-white leading-none">Coupon Manager</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1.5">Marketing & Promotions</p>
            </div>
          </div>
          <button 
            onClick={() => { setIsAdding(!isAdding); resetForm(); }}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-md text-xs font-bold transition-all ${
              isAdding 
                ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-white' 
                : 'bg-accent text-slate-900 hover:bg-accent-light hover:scale-105'
            }`}
          >
            {isAdding ? <ArrowLeft className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{isAdding ? 'Cancel' : 'Create New Coupon'}</span>
          </button>
        </div>

        {/* Add Form */}
        {isAdding && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h2 className="text-base font-bold font-display mb-6 text-primary dark:text-white flex items-center gap-2">
              <Ticket className="h-5 w-5 text-accent" /> Create Promotion Code
            </h2>
            <form onSubmit={handleCreateCoupon} className="space-y-6 text-xs font-semibold text-slate-500 dark:text-slate-450">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Coupon Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SUMMER50"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent font-bold text-slate-800 dark:text-slate-100 uppercase"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 50% off on all summer products"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Discount Type *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-100"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Discount Value * {type === 'percentage' && '(%)'} {type === 'flat' && '(₹)'}
                  </label>
                  <input
                    type="number"
                    required={type !== 'free_shipping'}
                    disabled={type === 'free_shipping'}
                    min="0"
                    placeholder={type === 'free_shipping' ? "N/A" : "e.g. 20"}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minimum Purchase (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 500"
                    value={minPurchase}
                    onChange={(e) => setMinPurchase(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Max Discount Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional limit"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valid Until</label>
                  <input
                    type="datetime-local"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-100"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usage Limit</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Total allowed uses (Optional)"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 outline-none focus:border-accent text-slate-800 dark:text-slate-100"
                  />
                </div>

              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isActive" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-accent focus:ring-accent/20 cursor-pointer"
                />
                <label htmlFor="isActive" className="cursor-pointer">Active and ready to use</label>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="submit" 
                  className="px-8 py-3.5 bg-accent text-slate-900 font-bold rounded-xl shadow-md hover:bg-accent-light transition-all flex items-center gap-2"
                >
                  <Check className="h-4 w-4" /> Save Coupon
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Coupons List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <h2 className="text-sm font-bold font-display text-slate-800 dark:text-white mb-6">Existing Coupons</h2>
          
          {loading ? (
            <div className="text-center p-10">
              <div className="w-8 h-8 border-4 border-slate-200 dark:border-slate-800 border-t-accent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-xs text-slate-500 font-bold">Loading coupons...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center p-12 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <Ticket className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400">No coupons created yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs font-semibold">
                <thead className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 uppercase tracking-wider rounded-t-xl">
                  <tr>
                    <th className="px-4 py-4 rounded-tl-xl">Code</th>
                    <th className="px-4 py-4">Details</th>
                    <th className="px-4 py-4">Value</th>
                    <th className="px-4 py-4">Valid Until</th>
                    <th className="px-4 py-4">Stats</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 text-right rounded-tr-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-350">
                  {coupons.map((c: Coupon) => {
                    const isExpired = new Date(c.validUntil) < new Date();
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/30 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800 dark:text-white uppercase text-sm">{c.code}</div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-slate-700 dark:text-slate-300 truncate max-w-xs">{c.description}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1">Min: ₹{c.minPurchase} {c.maxDiscount ? `| Max Disc: ₹${c.maxDiscount}` : ''}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg font-bold">
                            {c.type === 'percentage' ? `${c.value}% OFF` : c.type === 'flat' ? `₹${c.value} OFF` : 'FREE SHIP'}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className={`${isExpired ? 'text-red-500' : 'text-slate-500'}`}>
                            {new Date(c.validUntil).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p>{c.usedCount} used</p>
                          {c.usageLimit && <p className="text-[9px] text-slate-400">of {c.usageLimit} max</p>}
                        </td>
                        <td className="px-4 py-4">
                          <button 
                            onClick={() => toggleStatus(c)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                              c.isActive ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {c.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button 
                            onClick={() => handleDeleteCoupon(c.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Delete Coupon"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
