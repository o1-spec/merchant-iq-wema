'use client';

import { useState, useEffect } from 'react';
import { Bell, CreditCard, AlertTriangle, ArrowRight, ShieldCheck, CheckCheck, Inbox, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  date: Date;
  type: 'payment' | 'alert' | 'system';
  read: boolean;
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'payment' | 'alert' | 'system'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    async function fetchNotifications() {
      try {
        setLoading(true);
        // Fetch transactions & insights concurrently
        const [txRes, insightRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/insights'),
        ]);

        const txJson = await txRes.json();
        const insightJson = await insightRes.json();

        const txs = txJson.success ? txJson.data.transactions || [] : [];
        const insights = insightJson.success ? insightJson.data.insights || [] : [];

        // Build notifications list
        const items: NotificationItem[] = [];

        // Map transactions
        txs.forEach((t: any) => {
          if (t.status === 'COMPLETED') {
            if (t.direction === 'INFLOW') {
              items.push({
                id: `tx-${t.id}`,
                title: 'Payment Received via ALATPay',
                description: `₦${t.amount.toLocaleString()} received from ${t.description || 'Customer'} successfully.`,
                date: new Date(t.date || t.createdAt),
                type: 'payment',
                read: true,
              });
            } else {
              items.push({
                id: `tx-${t.id}`,
                title: 'Expense Recorded',
                description: `₦${t.amount.toLocaleString()} paid out for ${t.category || 'operating supplies'}.`,
                date: new Date(t.date || t.createdAt),
                type: 'system',
                read: true,
              });
            }
          }
        });

        // Map AI Insights
        insights.forEach((i: any) => {
          items.push({
            id: `insight-${i.id}`,
            title: i.category === 'MORNING_BRIEF' ? 'Morning Business Brief Ready' : 'AI CFO Insight Generated',
            description: i.content ? i.content.replace(/[#*`]/g, '').substring(0, 140) + '...' : i.title,
            date: new Date(i.createdAt),
            type: 'alert',
            read: false,
          });
        });

        // Add base welcome notifications if empty
        if (items.length === 0) {
          items.push({
            id: 'welcome-1',
            title: 'Welcome to MerchantIQ!',
            description: 'Your AI Financial Operating System is ready. Connect your ALATPay account or upload transactions to get started.',
            date: new Date(),
            type: 'system',
            read: false,
          });
          items.push({
            id: 'welcome-2',
            title: 'Setup Completed',
            description: 'Database tables initialized and security credentials verified successfully.',
            date: new Date(Date.now() - 3600000), // 1 hour ago
            type: 'system',
            read: true,
          });
        }

        // Sort items by date desc
        items.sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(items);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchNotifications();
  }, []);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered = notifications.filter((n) => {
    const matchesFilter = filter === 'all' || n.type === filter;
    const matchesUnread = !unreadOnly || !n.read;
    return matchesFilter && matchesUnread;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="w-4 h-4 text-emerald-600" />;
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-primary" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'payment':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'alert':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      default:
        return 'bg-indigo-50 text-primary border-indigo-100';
    }
  };

  const fmtDate = (d: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-slate-500">Retrieving notification history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-500">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary shrink-0" />
            Notification Center
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Real-time feed of system webhooks, transactional collections, and AI alerts.
          </p>
        </div>
        
        <button
          onClick={handleMarkAllRead}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer active:scale-98"
        >
          <CheckCheck className="w-4 h-4 text-slate-500" />
          Mark all as read
        </button>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
        <div className="flex items-center gap-1">
          {(['all', 'payment', 'alert', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                filter === t
                  ? 'bg-primary text-white'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              {t === 'all' ? 'All Alerts' : t + 's'}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => setUnreadOnly(e.target.checked)}
            className="w-4 h-4 rounded text-primary border-slate-200 focus:ring-primary cursor-pointer shrink-0"
          />
          <span className="text-xs font-bold text-slate-655">Unread notifications</span>
        </label>
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100">
        {filtered.length > 0 ? (
          filtered.map((n) => (
            <div
              key={n.id}
              className={`p-5 flex items-start gap-4 transition-colors relative ${
                !n.read ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'
              }`}
            >
              {/* Unread indicator bar */}
              {!n.read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r" />
              )}

              {/* Icon Container */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${getBadgeStyle(n.type)}`}>
                {getIcon(n.type)}
              </div>

              {/* Text content */}
              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-4">
                  <h3 className={`text-sm tracking-tight leading-snug truncate ${!n.read ? 'font-extrabold text-slate-900' : 'font-bold text-slate-850'}`}>
                    {n.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                    {fmtDate(n.date)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {n.description}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="p-16 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100">
              <Inbox className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm mt-1">No notifications found</h3>
            <p className="text-xs text-slate-450 max-w-xs leading-relaxed">
              We couldn&apos;t find any alerts matching your current filter criteria.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
