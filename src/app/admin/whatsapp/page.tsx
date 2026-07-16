'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { MessageSquare, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Search, AlertTriangle } from 'lucide-react';

interface WhatsAppLog {
  id: string;
  orderId: string;
  recipient: string;
  event: string;
  message: string;
  status: 'Sent' | 'Failed';
  attempts: number;
  error?: string | null;
  createdAt: string;
}

export default function WhatsAppManagerPage() {
  const router = useRouter();
  const { user, showToast } = useApp();

  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [retryingAll, setRetryingAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/whatsapp/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setIsEnabled(data.settings.whatsappNotificationsEnabled);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load WhatsApp settings', 'error');
    }
  }, [showToast]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/whatsapp/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load message logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (user) {
      if (user.role !== 'admin') {
        router.push('/profile');
      } else {
        fetchSettings();
        fetchLogs();
      }
    }
  }, [user, router, fetchSettings, fetchLogs]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleToggleNotifications = async () => {
    const nextVal = !isEnabled;
    try {
      const res = await fetch('/api/admin/whatsapp/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappNotificationsEnabled: nextVal })
      });
      const data = await res.json();
      if (data.success) {
        setIsEnabled(nextVal);
        showToast(nextVal ? 'WhatsApp notifications enabled!' : 'WhatsApp notifications disabled!', 'success');
      } else {
        showToast(data.message || 'Failed to update settings', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error updating configuration', 'error');
    }
  };

  const handleRetryAll = async () => {
    setRetryingAll(true);
    try {
      const res = await fetch('/api/admin/whatsapp/retry', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Triggered failed messages retry successfully', 'success');
        fetchLogs();
      } else {
        showToast(data.message || 'Retry process failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error retrying messages', 'error');
    } finally {
      setRetryingAll(false);
    }
  };

  const handleRetrySingle = async (logId: string) => {
    showToast('Retrying message...', 'info');
    try {
      // For simple single retry, trigger the global retry which processes all failed, including this one
      const res = await fetch('/api/admin/whatsapp/retry', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Retry executed', 'success');
        fetchLogs();
      }
    } catch (err) {
      showToast('Error retrying message', 'error');
    }
  };

  // Filter logs based on search query
  const filteredLogs = logs.filter(l => 
    l.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.event.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSent = logs.filter(l => l.status === 'Sent').length;
  const totalFailed = logs.filter(l => l.status === 'Failed').length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/admin')}
              className="p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all border border-slate-200 dark:border-slate-800"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="text-left">
              <h1 className="text-2xl font-black font-display text-slate-950 dark:text-white">WhatsApp Business Integration</h1>
              <p className="text-xs text-slate-500 mt-0.5">Manage automated notification dispatches, logs, and resends</p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              onClick={fetchLogs}
              className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
              title="Refresh logs list"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={handleRetryAll}
              disabled={retryingAll || totalFailed === 0}
              className="px-5 py-2.5 bg-primary hover:bg-primary-light text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${retryingAll ? 'animate-spin' : ''}`} />
              <span>Retry All Failed ({totalFailed})</span>
            </button>
          </div>
        </div>

        {/* Configuration settings & statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Notification Switch toggle */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Notifications Service</h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                Toggle WhatsApp Business messages globally. Dispatches automatically trigger on placed, confirmed, packed, out for delivery, and completed states.
              </p>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-extrabold text-slate-800 dark:text-slate-300">
                {isEnabled ? '🟢 ACTIVE & RUNNING' : '🔴 DISABLED'}
              </span>
              <button 
                onClick={handleToggleNotifications}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Metric sent */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Sent Messages</h4>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalSent}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <span>Delivered successfully</span>
            </div>
          </div>

          {/* Metric failed */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col justify-between">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Failed / Pending Transmissions</h4>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{totalFailed}</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-extrabold uppercase mt-4">
              <XCircle className="h-4 w-4" />
              <span>Requires attention / retry</span>
            </div>
          </div>
        </div>

        {/* Credentials Environment variables list */}
        <div className="p-4 border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2.5 items-start">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">API Credentials Context</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">API requests require valid setting parameters inside project environment variables configuration.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-[9px] font-bold font-mono text-slate-600 dark:text-slate-400">WHATSAPP_PHONE_NUMBER_ID</span>
            <span className="bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-[9px] font-bold font-mono text-slate-600 dark:text-slate-400">WHATSAPP_ACCESS_TOKEN</span>
          </div>
        </div>

        {/* Logs Table Section */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-wider">Transmission logs</h3>
            
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone or Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white rounded-xl outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs font-semibold">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 border-b border-slate-200 dark:border-slate-800 font-bold">
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Order ID</th>
                  <th className="p-4">Event Trigger</th>
                  <th className="p-4">Message payload</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Attempts</th>
                  <th className="p-4">Created At</th>
                  <th className="p-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      Loading transmission logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                      No logs found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                      <td className="p-4 font-bold font-mono text-slate-900 dark:text-white">+{log.recipient}</td>
                      <td className="p-4 font-bold font-mono text-primary">{log.orderId}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded text-[10px]">
                          {log.event}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs truncate" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-4">
                        {log.status === 'Sent' ? (
                          <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black rounded uppercase text-[9px]">
                            Sent
                          </span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="px-2 py-1 bg-red-500/10 text-red-500 font-black rounded uppercase text-[9px] w-fit">
                              Failed
                            </span>
                            {log.error && (
                              <span className="text-[9px] text-red-400 max-w-[150px] truncate" title={log.error}>
                                {log.error}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 font-bold font-mono">{log.attempts}/3</td>
                      <td className="p-4 text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {log.status === 'Failed' && log.attempts < 3 ? (
                          <button
                            onClick={() => handleRetrySingle(log.id)}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] transition-colors"
                          >
                            Retry
                          </button>
                        ) : (
                          <span className="text-slate-400 font-bold text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
