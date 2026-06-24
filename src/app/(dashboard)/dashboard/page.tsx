'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  Wallet,
  Receipt,
  CreditCard,
  Calendar,
  Tag,
  ShoppingBag,
  Hash,
  RefreshCw,
  AlertTriangle,
  Activity,
  Heart,
  Coins,
  Sparkles,
} from 'lucide-react';
import { getDashboard, type DashboardData } from '@/lib/dashboard-client';
import { MetricCard } from '@/components/dashboard/metric-card';
import { InsightCard, InsightsEmptyState } from '@/components/dashboard/insight-card';
import { TransactionTable } from '@/components/dashboard/transaction-table';
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton';
import { OnboardingModal } from '@/components/dashboard/OnboardingModal';

function fmt(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstName(name?: string) {
  return name?.split(' ')[0] ?? 'there';
}

const riskBadge: Record<string, string> = {
  LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
  HIGH: 'bg-red-50 text-red-700 border-red-200',
};

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <div className="text-center">
        <p className="font-semibold text-slate-800">We couldn&apos;t load your dashboard.</p>
        <p className="text-sm text-slate-500 mt-1">This may be a network issue. Please try again.</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
}

function SnapshotItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50/70 border border-card-border transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary shrink-0 border border-primary-light/50">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const result = await getDashboard();
      setData(result);
      if (result.merchant && !result.merchant.hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <DashboardSkeleton />;
  if (error || !data) return <DashboardError onRetry={load} />;

  const { merchant, summary, cashflow, businessHealth, forecast, recentTransactions, latestInsights, collections } = data;

  return (
    <div className="space-y-8 max-w-[1200px]">
      {showOnboarding && (
        <OnboardingModal onComplete={() => setShowOnboarding(false)} />
      )}

      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-card-border">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {greeting()}, <span className="text-primary">{firstName(merchant.businessName)}</span>.
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">
            Here&apos;s a quick snapshot of how your business is performing today.
          </p>
        </div>
        <div className="bg-white px-4 py-2.5 rounded-xl border border-card-border text-left sm:text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Account</p>
          <p className="text-sm font-bold text-slate-800 mt-0.5">{merchant.businessName}</p>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">{merchant.location}</p>
        </div>
      </div>

      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Revenue"
          value={fmt(summary.totalRevenue)}
          trend={summary.revenueTrendPercent}
          trendLabel="vs last 30d"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <MetricCard
          title="Total Expenses"
          value={fmt(summary.totalExpenses)}
          trend={summary.expenseTrendPercent}
          trendLabel="vs last 30d"
          icon={<Receipt className="w-4 h-4" />}
        />
        <MetricCard
          title="Net Profit"
          value={fmt(summary.netProfit)}
          subtitle="Revenue minus expenses"
          icon={<Wallet className="w-4 h-4" />}
        />
        <MetricCard
          title="ALATPay Collections"
          value={fmt(collections?.totalCollections ?? 0)}
          trend={18}
          trendLabel="vs last month"
          icon={<Coins className="w-4 h-4 text-rose-600" />}
        />
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Runway card */}
        <div className="bg-white border border-card-border rounded-2xl p-6 space-y-4 transition-all duration-300 flex flex-col justify-between group hover:shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Cash Runway
            </p>
            <div className="flex items-end gap-2 mt-3">
              <p className="text-4xl font-extrabold text-slate-900 tabular-nums">
                {cashflow.runwayDays === 999 ? '∞' : cashflow.runwayDays}
              </p>
              <p className="text-slate-400 text-sm font-semibold mb-1">days</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${riskBadge[cashflow.riskLevel]}`}>
                {cashflow.riskLevel} RISK
              </span>
            </div>
          </div>
          {cashflow.warning && (
            <p className="text-xs text-slate-500 leading-relaxed pt-3 border-t border-slate-100 font-medium">
              {cashflow.warning}
            </p>
          )}
        </div>

        {/* 30-Day Forecast Card */}
        <div className="bg-white border border-card-border rounded-2xl p-6 space-y-4 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group hover:shadow-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full pointer-events-none transition-transform duration-500 group-hover:scale-110" />
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              30-Day Forecast
            </p>
            <div className="flex items-end gap-1 mt-3">
              <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
                {fmt(forecast.netForecastedPosition)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-50">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projected In</p>
                <p className="text-xs font-bold text-emerald-600 mt-0.5 tabular-nums">+{fmt(forecast.forecastedMonthlyInflow)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projected Out</p>
                <p className="text-xs font-bold text-rose-600 mt-0.5 tabular-nums">-{fmt(forecast.forecastedMonthlyOutflow)}</p>
              </div>
            </div>
          </div>
          {forecast.warning && (
            <p className="text-xs text-slate-500 leading-relaxed pt-3 border-t border-slate-100 font-medium truncate">
              {forecast.warning}
            </p>
          )}
        </div>

        {/* Business Health Details Card */}
        <div className="bg-white border border-card-border rounded-2xl p-6 space-y-4 transition-all duration-300 flex flex-col justify-between group hover:shadow-sm">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              Business Health Score
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="relative flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#f1f5f9"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke={
                      businessHealth.score >= 75
                        ? '#10b981'
                        : businessHealth.score >= 50
                        ? '#f59e0b'
                        : '#ef4444'
                    }
                    strokeWidth="6"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 26}
                    strokeDashoffset={2 * Math.PI * 26 * (1 - businessHealth.score / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-slate-800">{businessHealth.score}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">/ 100</span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-extrabold border px-2 py-0.5 rounded-full uppercase tracking-wider ${riskBadge[businessHealth.riskLevel]}`}>
                    {businessHealth.riskLevel} RISK
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-tight">
                  {businessHealth.score >= 75
                    ? 'Strong credit capability & runway.'
                    : businessHealth.score >= 50
                    ? 'Stable health. Good standing.'
                    : 'High credit risk. Improve inflows.'}
                </p>
              </div>
            </div>
          </div>

          {businessHealth.strengths.length > 0 && (
            <div className="border-t border-slate-100 pt-3 space-y-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Key Drivers</p>
              {businessHealth.strengths.slice(0, 2).map((s) => (
                <p key={s} className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">{s}</span>
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2/3 width) - Transactions and AI Insights */}
        <div className="lg:col-span-2 space-y-8">
          {/* Recent Transactions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Recent Transactions</h2>
              <span className="text-xs font-semibold text-slate-400">{recentTransactions.length} shown</span>
            </div>
            <TransactionTable transactions={recentTransactions} />
          </div>

          {/* AI Insights */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">AI Insights</h2>
              <span className="text-xs font-semibold text-slate-400">{latestInsights.length} total</span>
            </div>
            {latestInsights.length === 0 ? (
              <InsightsEmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {latestInsights.map((insight) => (
                  <InsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width) - Today's Priority & Financial Event Timeline */}
        <div className="space-y-6">
          {/* Today's Priority AI Action */}
          <div className="bg-slate-900 border border-slate-950 rounded-2xl p-5 text-white relative overflow-hidden shadow-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 rounded-bl-full pointer-events-none" />
            <div className="flex items-center gap-2 mb-3.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span className="font-extrabold text-[10px] uppercase tracking-wider text-slate-200">Today&apos;s Priority AI Action</span>
            </div>
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-100 leading-normal">
                Follow up with {collections?.statusBreakdown.pending || 3} pending payment links worth {fmt(collections?.pendingAmount || 340000)}.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                Recovering these collections will increase your cash runway by approximately {Math.round((collections?.pendingAmount || 340000) / Math.max(1, cashflow.averageDailyOutflow || 8000)) || 9} days and boost your Business Trust Passport rating.
              </p>
              <div className="pt-1.5">
                <a
                  href="/collections"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Resolve Collections
                </a>
              </div>
            </div>
          </div>

          {/* Financial Event Timeline */}
          <div className="bg-white border border-card-border rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Financial Event Timeline</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Real-time operating system actions triggered by payments.</p>
            </div>
            
            <div className="relative pt-1 space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {recentTransactions.some(t => t.source === 'ALATPAY') ? (
                <>
                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-100 last:hidden" />
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Payment Ingested via Webhook</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">Just now</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        ALATPay Inflow of {fmt(recentTransactions.find(t => t.source === 'ALATPAY')?.amount || 45000)} completed
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-100 last:hidden" />
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Cash Runway Extended</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">1 min ago</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        Calculated runway increased by +{Math.round((recentTransactions.find(t => t.source === 'ALATPAY')?.amount || 45000) / 8000) || 2} days
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-100 last:hidden" />
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Business Health Recalculated</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">1 min ago</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">
                        Credit score re-weighted: {businessHealth.score - 2 || 72} → {businessHealth.score || 74}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-100 last:hidden" />
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Gemini CFO Brief Refreshed</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">2 mins ago</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">Stale advisory briefs evicted from cache</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Trust Passport Refreshed</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">2 mins ago</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">Business trust score stamp updated</p>
                      <span className="inline-block text-[8px] font-bold bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wider">
                        PASSPORT ACTIVE
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-100 last:hidden" />
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Demo Environment Provisioned</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">2 hours ago</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">Created 200 transaction history points</p>
                      <span className="inline-block text-[8px] font-bold bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded mt-1.5 uppercase tracking-wider">
                        DEMO ACTIVE
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="absolute left-2.5 top-6 bottom-0 w-0.5 bg-slate-100 last:hidden" />
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Cashflow Runway Calculated</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">2 hours ago</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">Average daily run-rates mapped to database</p>
                    </div>
                  </div>

                  <div className="flex gap-3.5 relative pb-3 last:pb-0">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-250 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-800 truncate">Credit Readiness Coach Synced</p>
                        <span className="text-[9px] text-slate-400 font-mono tracking-wider shrink-0">2 hours ago</span>
                      </div>
                      <p className="text-slate-500 font-semibold mt-0.5">Scored business credit health status</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Business Snapshot Static Metric Block */}
      <div className="bg-white border border-card-border rounded-2xl p-6 transition-all duration-300">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-5">Business Snapshot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SnapshotItem
            icon={Calendar}
            label="Best sales day"
            value={summary.bestSalesDay}
          />
          <SnapshotItem
            icon={Tag}
            label="Top revenue category"
            value={summary.topRevenueCategory}
          />
          <SnapshotItem
            icon={ShoppingBag}
            label="Top expense category"
            value={summary.topExpenseCategory}
          />
          <SnapshotItem
            icon={Hash}
            label="Total transactions"
            value={summary.transactionCount.toLocaleString()}
          />
        </div>
      </div>

    </div>
  );
}
