'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { X, Mail, MessageSquare, Phone, Bell, CheckCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsSidebar({ isOpen, onClose }: NotificationsSidebarProps) {
  const { notifications, markAllNotificationsRead } = useApp();

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'sms': return <Phone className="h-4 w-4 text-purple-500" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-amber-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'email': return 'Simulated Email';
      case 'sms': return 'Simulated SMS';
      case 'whatsapp': return 'Simulated WhatsApp';
      default: return 'In-App Notification';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <motion.div 
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="w-screen max-w-md bg-white dark:bg-slate-950 shadow-2xl flex flex-col h-full"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-900 flex items-center justify-between">
            <h2 className="text-lg font-bold text-primary dark:text-white font-display flex items-center gap-2">
              <span>Message Center</span>
              <span className="text-[10px] font-semibold bg-accent/20 text-primary dark:text-accent uppercase tracking-wider px-2 py-0.5 rounded-full">
                Simulated Logs
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleMarkAllRead}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Logs List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                <div className="h-16 w-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-700">
                  <Bell className="h-7 w-7" />
                </div>
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400">No active messages</p>
                <p className="text-xs text-slate-400 max-w-xs">
                  SMS alerts, login notices, invoices, and order status updates will be logged here in real-time.
                </p>
              </div>
            ) : (
              notifications.map((msg) => (
                <div 
                  key={msg.id}
                  className={`p-4 rounded-2xl border transition-all text-left ${
                    msg.read 
                      ? 'border-slate-100 dark:border-slate-900 bg-slate-50/30 dark:bg-slate-900/10 opacity-75' 
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      {getIcon(msg.type)}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {getTypeLabel(msg.type)}
                      </span>
                    </div>
                    <span className="text-[9px] font-semibold text-slate-400">{msg.time}</span>
                  </div>
                  
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white mb-1">
                    {msg.title}
                  </h4>
                  
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium whitespace-pre-line">
                    {msg.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
