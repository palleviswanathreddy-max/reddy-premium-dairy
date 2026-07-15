'use client';

import React, { useState, useEffect } from 'react';
import PageWrapper from '@/components/PageWrapper';
import { useApp } from '@/context/AppContext';
import { Mail, Phone, Clock, CheckCircle, Trash2, ShieldAlert } from 'lucide-react';

interface Ticket {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'Pending' | 'Resolved';
  createdAt: string;
}

export default function AdminTicketsPage() {
  const { showToast, user } = useApp();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = React.useCallback(async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
      }
    } catch {
      showToast('Failed to fetch tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    fetchTickets();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [fetchTickets]);

  const handleUpdateStatus = async (id: string, status: 'Resolved' | 'Pending') => {
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Ticket marked as ${status}`, 'success');
        fetchTickets();
      } else {
        showToast(data.message || 'Update failed', 'error');
      }
    } catch {
      showToast('Failed to update ticket', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket?')) return;
    try {
      const res = await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Ticket deleted', 'success');
        fetchTickets();
      } else {
        showToast(data.message || 'Delete failed', 'error');
      }
    } catch {
      showToast('Failed to delete ticket', 'error');
    }
  };

  // KPIs
  const total = tickets.length;
  const pending = tickets.filter(t => t.status === 'Pending').length;
  const resolved = tickets.filter(t => t.status === 'Resolved').length;

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-white">
        <div className="space-y-4 max-w-sm text-center">
          <ShieldAlert className="h-14 w-14 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="text-xs text-slate-400">Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-bold font-display text-primary dark:text-white mb-8">Customer Support Tickets</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Total Tickets</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white font-display">{total}</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Pending</p>
            <p className="text-3xl font-black text-amber-500 font-display">{pending}</p>
          </div>
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Resolved</p>
            <p className="text-3xl font-black text-emerald-500 font-display">{resolved}</p>
          </div>
        </div>

        {/* Tickets List */}
        {loading ? (
          <p className="text-center text-xs font-semibold text-slate-400 py-20">Loading tickets...</p>
        ) : (
          <div className="space-y-6">
            {tickets.length === 0 ? (
              <p className="text-center text-xs font-semibold text-slate-400 py-20 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">No support tickets found.</p>
            ) : (
              tickets.map(ticket => (
                <div key={ticket.id} className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col md:flex-row gap-6 items-start">

                  {/* Info */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg ${ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {ticket.status}
                      </span>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{ticket.name}</p>
                      <span className="text-xs font-semibold text-slate-400 ml-auto flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleString()}</span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{ticket.subject}</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{ticket.message}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <a href={`mailto:${ticket.email}`} className="text-xs font-semibold text-slate-500 hover:text-accent flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {ticket.email}</a>
                      <a href={`tel:${ticket.phone}`} className="text-xs font-semibold text-slate-500 hover:text-accent flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {ticket.phone}</a>
                    </div>
                  </div>

                  {/* Actions sidebar */}
                  <div className="w-full md:w-48 shrink-0 flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Actions</p>
                    {ticket.status === 'Pending' ? (
                      <button onClick={() => handleUpdateStatus(ticket.id, 'Resolved')} className="w-full px-3 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors">
                        <CheckCircle className="h-4 w-4" /> Mark Resolved
                      </button>
                    ) : (
                      <button onClick={() => handleUpdateStatus(ticket.id, 'Pending')} className="w-full px-3 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                        <Clock className="h-4 w-4" /> Mark Pending
                      </button>
                    )}
                    <div className="h-px w-full bg-slate-200 dark:bg-slate-800 my-1" />
                    <button onClick={() => handleDelete(ticket.id)} className="w-full px-3 py-2 text-xs font-bold flex justify-center items-center gap-2 rounded-xl text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
