import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Menu, ArrowRight, Loader2 } from 'lucide-react';

interface TopbarProps {
  merchantName?: string;
  businessCategory?: string;
  onMobileMenuToggle: () => void;
}

export function Topbar({ merchantName, businessCategory, onMobileMenuToggle }: TopbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const initials = merchantName
    ? merchantName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'MQ';

  const fmtDate = (d: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  useEffect(() => {
    if (!isOpen) return;

    async function loadNotifications() {
      try {
        setLoading(true);
        const [txRes, insightRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/insights'),
        ]);

        const txJson = await txRes.json();
        const insightJson = await insightRes.json();

        const txs = txJson.success ? txJson.data.transactions || [] : [];
        const insights = insightJson.success ? insightJson.data.insights || [] : [];

        const items: any[] = [];

        // Map completed inflow transactions
        txs.forEach((t: any) => {
          if (t.status === 'COMPLETED' && t.direction === 'INFLOW') {
            items.push({
              id: `tx-${t.id}`,
              title: 'Payment Received',
              description: `${t.description || 'Customer'} paid ₦${t.amount.toLocaleString()} via ALATPay webhook.`,
              time: fmtDate(new Date(t.date || t.createdAt)),
              type: 'success',
              date: new Date(t.date || t.createdAt),
            });
          }
        });

        // Map AI insights/briefs
        insights.forEach((i: any) => {
          items.push({
            id: `insight-${i.id}`,
            title: i.category === 'MORNING_BRIEF' ? 'CFO Brief Ready' : 'AI CFO Insight',
            description: i.content ? i.content.replace(/[#*`]/g, '').substring(0, 80) + '...' : i.title,
            time: fmtDate(new Date(i.createdAt)),
            type: 'info',
            date: new Date(i.createdAt),
          });
        });

        // Sort items by date desc and take latest 3
        items.sort((a, b) => b.date.getTime() - a.date.getTime());
        setNotifications(items.slice(0, 3));
      } catch (err) {
        console.error('Failed to load topbar notifications:', err);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, [isOpen]);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 sticky top-0 z-10">
      
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        
        <div className="hidden md:block">
          <p className="text-sm font-semibold text-slate-800">{merchantName ?? 'Dashboard'}</p>
          {businessCategory && (
            <p className="text-xs text-slate-400">{businessCategory}</p>
          )}
        </div>
      </div>

      
      <div className="flex items-center gap-2">
        
        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ${
              isOpen ? 'bg-slate-100 text-slate-700' : ''
            }`}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          </button>

          {isOpen && (
            <>
              {/* Overlay backdrop to close */}
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              
              {/* Dropdown panel */}
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="font-extrabold text-xs text-slate-800 tracking-tight">Recent Alerts</span>
                  <button onClick={() => setIsOpen(false)} className="text-[10px] font-bold text-slate-400 hover:text-slate-655 tracking-wide">Close</button>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {loading ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      <span className="text-[10px] text-slate-450 font-bold">Checking for new alerts...</span>
                    </div>
                  ) : notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3.5 hover:bg-slate-50 transition-colors space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            n.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                            n.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            'bg-indigo-50 text-primary border border-indigo-100'
                          }`}>
                            {n.type}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold">{n.time}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 leading-snug">{n.title}</p>
                        <p className="text-[11px] text-slate-500 leading-normal truncate">{n.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center text-center gap-1.5">
                      <span className="text-slate-450 text-xs">🔔</span>
                      <p className="text-[11px] font-bold text-slate-850">No notifications yet</p>
                      <p className="text-[9px] text-slate-400 max-w-[180px] leading-relaxed">Transactions you record will trigger dynamic system updates here.</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 p-2 text-center bg-slate-50/50">
                  <Link
                    href="/notifications"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex items-center justify-center gap-1 w-full text-[10px] font-bold text-primary hover:text-primary-hover tracking-wide py-1"
                  >
                    View All Notifications
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        
        <Link
          href="/profile"
          className="flex items-center gap-2.5 pl-2 border-l border-slate-100 ml-1 hover:opacity-85 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-xs shrink-0 select-none">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-800 leading-none">{merchantName ?? 'Merchant'}</p>
            {businessCategory && (
              <p className="text-xs text-slate-400 mt-0.5 leading-none">{businessCategory}</p>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
