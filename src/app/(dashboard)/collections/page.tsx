'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Building,
  UploadCloud,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  Loader2,
  HelpCircle,
  Info,
  AlertCircle,
  Copy,
  Plus,
  Send,
  ExternalLink,
  DollarSign,
  TrendingUp,
  RefreshCw,
  MessageSquare,
  Sparkles,
  PhoneCall,
  Mail,
  User,
  ShieldCheck,
  Coins,
  Search
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import {
  uploadTransactions,
  downloadSampleCsv,
  type UploadResponse
} from '@/lib/upload-client';

interface PaymentLink {
  id: string;
  customerName: string;
  amount: number;
  purpose: string;
  reference: string;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED';
  createdAt: string;
}

interface VirtualAccount {
  id: string;
  customerName: string;
  accountNumber: string;
  bankName: string;
  createdAt: string;
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  category: string;
  description: string | null;
  date: string;
  paymentMethod: string;
  source: string;
  direction: 'INFLOW' | 'OUTFLOW';
  status: string;
}

interface CollectionsData {
  totalCollections: number;
  pendingAmount: number;
  averagePaymentSize: number;
  paymentSuccessRate: number;
  statusBreakdown: {
    successful: number;
    pending: number;
    failed: number;
  };
  topPayingCustomers: { customerName: string; amount: number }[];
}

export default function CollectionsPage() {
  const { success, error: toastError, warning } = useToast();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'links' | 'accounts' | 'csv'>('dashboard');
  const [loadingData, setLoadingData] = useState(true);

  // Dashboard / Payments state
  const [collectionsSummary, setCollectionsSummary] = useState<CollectionsData | null>(null);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [virtualAccounts, setVirtualAccounts] = useState<VirtualAccount[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<Transaction[]>([]);

  // Form states
  const [linkCustomerName, setLinkCustomerName] = useState('');
  const [linkAmount, setLinkAmount] = useState('');
  const [linkPurpose, setLinkPurpose] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);

  const [accountCustomerName, setAccountCustomerName] = useState('');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Transfer simulation states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<VirtualAccount | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferMethod, setTransferMethod] = useState<'TRANSFER' | 'CARD' | 'ALAT'>('TRANSFER');
  const [simulatingTransfer, setSimulatingTransfer] = useState(false);

  // AI Reminder states
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedReminderLink, setSelectedReminderLink] = useState<PaymentLink | null>(null);
  const [reminderDraft, setReminderDraft] = useState('');
  const [generatingReminder, setGeneratingReminder] = useState(false);
  const [activeReminderTab, setActiveReminderTab] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');

  // CSV Fallback states
  const [file, setFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResponse, setCsvResponse] = useState<UploadResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notification, setNotification] = useState<{
    show: boolean;
    amount: number;
    customerName: string;
  } | null>(null);

  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  async function loadData() {
    setLoadingData(true);
    try {
      // 1. Fetch dashboard data (which aggregates collections & payment transactions)
      const dashRes = await fetch('/api/dashboard');
      if (!dashRes.ok) throw new Error('Failed to load dashboard data');
      const dashJson = await dashRes.json();
      if (dashJson.success) {
        setCollectionsSummary(dashJson.data.collections);
        // Extract payment inflows
        const txs = (dashJson.data.recentTransactions || []) as Transaction[];
        setPaymentTransactions(txs.filter(t => t.source === 'ALATPAY'));
      }

      // 2. Fetch payment links
      const plRes = await fetch('/api/collections/payment-links');
      if (plRes.ok) {
        const plJson = await plRes.json();
        if (plJson.success) setPaymentLinks(plJson.data.paymentLinks);
      }

      // 3. Fetch virtual accounts
      const vaRes = await fetch('/api/collections/virtual-accounts');
      if (vaRes.ok) {
        const vaJson = await vaRes.json();
        if (vaJson.success) setVirtualAccounts(vaJson.data.virtualAccounts);
      }
    } catch (err) {
      console.error(err);
      toastError('Could not sync workspace with payment networks.');
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Creation handlers
  async function handleCreateLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkCustomerName || !linkAmount || creatingLink) return;

    setCreatingLink(true);
    try {
      const res = await fetch('/api/collections/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: linkCustomerName,
          amount: parseFloat(linkAmount),
          purpose: linkPurpose || 'Goods & Services',
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success('ALATPay invoice payment link generated.');
        setLinkCustomerName('');
        setLinkAmount('');
        setLinkPurpose('');
        loadData(); // reload
      } else {
        toastError(json.error || 'Failed to create payment link.');
      }
    } catch (err) {
      toastError('Connection error creating payment link.');
    } finally {
      setCreatingLink(false);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountCustomerName || creatingAccount) return;

    setCreatingAccount(true);
    try {
      const res = await fetch('/api/collections/virtual-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName: accountCustomerName }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        success(`Virtual Account provisioned for ${accountCustomerName}.`);
        setAccountCustomerName('');
        loadData();
      } else {
        toastError(json.error || 'Failed to provision virtual account.');
      }
    } catch (err) {
      toastError('Connection error provisioning virtual account.');
    } finally {
      setCreatingAccount(false);
    }
  }

  // Simulation handlers
  async function handleSimulateTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccount || !transferAmount || simulatingTransfer) return;

    setSimulatingTransfer(true);
    try {
      const ref = `MOCK-TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      const res = await fetch('/api/demo/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Value: {
            Status: true,
            Message: 'Success',
            Data: {
              Amount: parseFloat(transferAmount),
              OrderId: selectedAccount.accountNumber,
              Id: ref,
              Channel: 'Bank Transfer',
              Status: 'completed',
              NgnVirtualBankAccountNumber: selectedAccount.accountNumber,
              Customer: {
                Email: 'customer@merchantiq.app',
                FirstName: selectedAccount.customerName.split(' ')[0],
                LastName: selectedAccount.customerName.split(' ')[1] || 'Customer',
              }
            }
          }
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        success(`Inbound transfer of ${fmt(parseFloat(transferAmount))} processed successfully!`);
        setShowTransferModal(false);
        setNotification({
          show: true,
          amount: parseFloat(transferAmount),
          customerName: selectedAccount.customerName || 'Customer',
        });
        setTransferAmount('');
        setSelectedAccount(null);
        loadData();
      } else {
        toastError(json.error || 'Simulation failed.');
      }
    } catch (err) {
      toastError('Simulation network error.');
    } finally {
      setSimulatingTransfer(false);
    }
  }

  // AI Reminder Draft handlers
  async function handleGenerateReminder(link: PaymentLink) {
    setSelectedReminderLink(link);
    setReminderDraft('');
    setActiveReminderTab('whatsapp');
    setShowReminderModal(true);
    setGeneratingReminder(true);

    try {
      const res = await fetch('/api/ai/collections-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentLinkId: link.id }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setReminderDraft(json.data.draft);
      } else {
        toastError('Failed to generate collection templates.');
        setShowReminderModal(false);
      }
    } catch (err) {
      toastError('Reminder generator connection error.');
      setShowReminderModal(false);
    } finally {
      setGeneratingReminder(false);
    }
  }

  const copyReminder = () => {
    navigator.clipboard.writeText(reminderDraft);
    success('AI reminder draft copied to clipboard!');
  };

  const copyPaymentLink = (linkId: string) => {
    const checkoutUrl = `${window.location.origin}/public/checkout/${linkId}`;
    navigator.clipboard.writeText(checkoutUrl);
    setCopiedLinkId(linkId);
    success('Payment checkout link copied to clipboard.');
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  // CSV drag/drop fallback handlers
  const triggerFileInput = () => {
    if (!uploadingCsv) fileInputRef.current?.click();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragActive(true);
    else if (e.type === 'dragleave') setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    setCsvError(null);
    if (!selectedFile.name.toLowerCase().endsWith('.csv') &&
      !selectedFile.name.toLowerCase().endsWith('.xls') &&
      !selectedFile.name.toLowerCase().endsWith('.xlsx')) {
      const msg = 'Invalid file format. Only .csv, .xls, and .xlsx files are accepted.';
      setCsvError(msg);
      toastError(msg);
      setFile(null);
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      const msg = 'File size exceeds the 5MB limit.';
      setCsvError(msg);
      toastError(msg);
      setFile(null);
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploadingCsv(true);
    setCsvError(null);
    setCsvResponse(null);

    try {
      const res = await uploadTransactions(file);
      setCsvResponse(res);
      if (res.failedCount === 0) {
        success(`${res.insertedCount} transactions successfully imported.`);
      } else if (res.insertedCount > 0) {
        warning(`Imported ${res.insertedCount} transactions, but ${res.failedCount} rows failed validation.`);
      } else {
        warning(`All ${res.failedCount} rows failed validation. Check error details below.`);
      }
      setFile(null);
      loadData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload and parse file.';
      setCsvError(msg);
      toastError(msg);
    } finally {
      setUploadingCsv(false);
    }
  };

  const handleDownloadSample = async () => {
    setDownloadingCsv(true);
    try {
      await downloadSampleCsv();
      success('Sample CSV template downloaded successfully.');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to download sample CSV.');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const resetCsv = () => {
    setFile(null);
    setCsvError(null);
    setCsvResponse(null);
  };

  function fmt(amount: number) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function fmtDate(dateStr: string) {
    try {
      return new Date(dateStr).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="space-y-6 max-w-[1200px]">

      {/* Page Header */}
      <div className="pb-4 border-b border-card-border flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">ALATPay Collections Center</h1>
          <p className="text-slate-500 text-sm mt-1.5 font-medium flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            Manage real-time payments, customer virtual accounts, and checkout interfaces.
          </p>
        </div>
        {loadingData && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Syncing payments...
          </div>
        )}
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-card-border gap-1.5 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${activeTab === 'dashboard' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Collections Dashboard
        </button>
        <button
          onClick={() => setActiveTab('links')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${activeTab === 'links' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Payment Links
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${activeTab === 'accounts' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Virtual Accounts
        </button>
        <button
          onClick={() => setActiveTab('csv')}
          className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${activeTab === 'csv' ? 'border-primary text-primary font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
        >
          Manual Import (CSV)
        </button>
      </div>

      {/* Tab 1: Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Dashboard Stats */}
          {collectionsSummary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-card-border rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Received (ALATPay)</p>
                <p className="text-xl font-black text-slate-900 mt-2">{fmt(collectionsSummary.totalCollections)}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-emerald-100">
                    <TrendingUp className="w-2.5 h-2.5" />
                    +18% vs last month
                  </span>
                </div>
              </div>
              <div className="bg-white border border-card-border rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Unpaid Dues (Links)</p>
                <p className="text-xl font-black text-slate-900 mt-2">{fmt(collectionsSummary.pendingAmount)}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                  {collectionsSummary.statusBreakdown.pending} pending links
                </p>
              </div>
              <div className="bg-white border border-card-border rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Average Ticket Size</p>
                <p className="text-xl font-black text-slate-900 mt-2">{fmt(collectionsSummary.averagePaymentSize)}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">Per Successful Checkout</p>
              </div>
              <div className="bg-white border border-card-border rounded-2xl p-5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Collection Success Rate</p>
                <p className="text-xl font-black text-slate-900 mt-2">{collectionsSummary.paymentSuccessRate}%</p>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2 border border-slate-200/50">
                  <div className="h-full bg-rose-600 transition-all duration-500" style={{ width: `${collectionsSummary.paymentSuccessRate}%` }} />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Payment Transactions Table */}
            <div className="lg:col-span-2 bg-white border border-card-border rounded-2xl p-5 space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Inbound ALATPay Collections</h2>
                <p className="text-xs text-slate-450 mt-0.5">Real-time ledger updates synchronizing from checkout webhooks.</p>
              </div>

              {paymentTransactions.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-2">
                  <Coins className="w-8 h-8 text-slate-350 mx-auto" />
                  <p className="text-slate-600 font-bold text-sm">No collections processed yet</p>
                  <p className="text-xs text-slate-400 leading-normal max-w-xs mx-auto">
                    Generate a Payment Link or transfer to a Virtual Account to test real-time ingestion.
                  </p>
                </div>
              ) : (
                <div className="border border-card-border rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-card-border text-slate-550 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Customer Reference / Account</th>
                        <th className="px-4 py-3">Method</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {paymentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-450 whitespace-nowrap">{fmtDate(tx.date)}</td>
                          <td className="px-4 py-3 text-slate-800 font-bold">
                            <span className="line-clamp-1">{tx.description}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 text-[9px] bg-rose-50 border border-rose-100 text-rose-600 font-bold px-1.5 py-0.5 rounded-full uppercase">
                              {tx.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-900 font-black tabular-nums whitespace-nowrap">
                            +{fmt(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Smart Collections - AI Cash Collection Assistant */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-950 rounded-2xl p-5 space-y-4 text-white relative overflow-hidden shadow-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-600/10 rounded-bl-full pointer-events-none" />
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-rose-400 shrink-0" />
                  <span className="font-extrabold text-sm uppercase tracking-wider text-slate-200">AI Collections Assistant</span>
                </div>

                {paymentLinks.filter(p => p.status === 'PENDING').length === 0 ? (
                  <div className="space-y-1.5 text-xs text-slate-400">
                    <p className="font-bold text-slate-100">Zero outstanding invoices!</p>
                    <p className="leading-relaxed font-semibold">Your business profile shows 100% completed receivables. Outstanding payments will be flagged here.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="space-y-1.5 text-xs">
                      <p className="font-bold text-slate-100">Overdue Payments Detected</p>
                      <p className="text-slate-400 leading-relaxed font-semibold">
                        You have <span className="font-black text-rose-400">{paymentLinks.filter(p => p.status === 'PENDING').length}</span> outstanding payment invoices. Following up with customers immediately can safeguard your runway.
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Recovery</span>
                      <span className="text-sm font-black text-emerald-400">{fmt(collectionsSummary?.pendingAmount || 0)}</span>
                    </div>

                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {paymentLinks.filter(p => p.status === 'PENDING').map(link => (
                        <div key={link.id} className="bg-slate-800/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-200 truncate">{link.customerName}</p>
                            <p className="text-[10px] text-slate-450 font-bold mt-0.5">{fmt(link.amount)} • {link.purpose}</p>
                          </div>
                          <button
                            onClick={() => handleGenerateReminder(link)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors font-bold text-[10px] uppercase tracking-wider shrink-0 cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3 shrink-0" />
                            Remind
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Payment Links */}
      {activeTab === 'links' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Creator Form */}
          <div className="bg-white border border-card-border rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Generate Payment Link</h2>
              <p className="text-xs text-slate-450 mt-0.5">Generate an invoice link to share via WhatsApp, SMS, or Email.</p>
            </div>

            <form onSubmit={handleCreateLink} className="space-y-4 text-xs font-semibold">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tunde Lawal"
                  value={linkCustomerName}
                  onChange={e => setLinkCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount (₦)</label>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={linkAmount}
                  onChange={e => setLinkAmount(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Purpose / Description</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery of stock electronics"
                  value={linkPurpose}
                  onChange={e => setLinkPurpose(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={creatingLink}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-extrabold bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {creatingLink ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 shrink-0" />
                    Generate ALATPay Link
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Links list */}
          <div className="lg:col-span-2 bg-white border border-card-border rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Active Payment Links</h2>

            {paymentLinks.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-350 mx-auto" />
                <p className="text-slate-600 font-bold text-sm">No payment links created</p>
                <p className="text-xs text-slate-400">Your generated links will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {paymentLinks.map(link => (
                  <div key={link.id} className="border border-card-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs hover:border-slate-300 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-800 text-sm">{link.customerName}</span>
                        <span className={`text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase tracking-wider
                          ${link.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : link.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border-amber-100'
                              : 'bg-red-50 text-red-600 border-red-100'
                          }`}
                        >
                          {link.status}
                        </span>
                      </div>
                      <p className="text-slate-450 font-semibold">{link.purpose} • Created on {fmtDate(link.createdAt)}</p>
                      <p className="text-[10px] text-slate-400 font-mono tracking-wider">Ref: {link.reference}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:self-center">
                      <div className="text-right sm:mr-3 mr-auto self-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount</p>
                        <p className="text-base font-black text-rose-600 mt-0.5">{fmt(link.amount)}</p>
                      </div>

                      <div className="flex items-center gap-1.5 self-center">
                        <button
                          onClick={() => copyPaymentLink(link.id)}
                          className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-550 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Copy Checkout Link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {link.status === 'PENDING' && (
                          <>
                            <a
                              href={`/public/checkout/${link.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-550 hover:text-slate-800 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                              title="Open simulated ALATPay checkout"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleGenerateReminder(link)}
                              className="flex items-center gap-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors font-bold text-[10px] uppercase tracking-wider cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              AI Nudge
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Virtual Accounts */}
      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Account Creator Form */}
          <div className="bg-white border border-card-border rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Provision Virtual Account</h2>
              <p className="text-xs text-slate-450 mt-0.5">Provision a unique Wema Bank transfer virtual account for your regular customer.</p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs font-semibold">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Okoye"
                  value={accountCustomerName}
                  onChange={e => setAccountCustomerName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={creatingAccount}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-extrabold bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                {creatingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 shrink-0" />
                    Generate Virtual Account
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Virtual Accounts Listing */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">Customer Virtual Accounts</h2>
              
              {virtualAccounts.length > 0 && (
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search customer or account..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary rounded-xl pl-8.5 pr-3 py-1.5 text-xs text-slate-800 outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            {virtualAccounts.length === 0 ? (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-2">
                <Building className="w-8 h-8 text-slate-350 mx-auto" />
                <p className="text-slate-600 font-bold text-sm">No virtual accounts provisioned</p>
                <p className="text-xs text-slate-400">Customer account listings will appear here.</p>
              </div>
            ) : (() => {
              const filtered = virtualAccounts.filter(account =>
                account.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                account.accountNumber.includes(searchQuery)
              );

              if (filtered.length === 0) {
                return (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-2 bg-slate-50/50">
                    <p className="text-slate-600 font-bold text-sm">No results match your search</p>
                    <p className="text-xs text-slate-400">Try searching for a different customer name or account number.</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                  {filtered.map(account => (
                    <div key={account.id} className="border border-card-border rounded-2xl p-4 bg-slate-50/40 space-y-3.5 flex flex-col justify-between hover:border-slate-300 transition-colors">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">{account.customerName}</span>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Account Details</p>
                          <p className="text-base font-black text-slate-900 font-mono tracking-wider mt-0.5">{account.accountNumber}</p>
                          <p className="text-[10px] text-rose-600 font-extrabold uppercase">{account.bankName}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAccount(account);
                          setShowTransferModal(true);
                        }}
                        className="w-full py-2 border border-rose-600 hover:bg-rose-50/20 text-rose-600 rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-colors"
                      >
                        Simulate Inbound Payment
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tab 4: Manual Import CSV (Fallback) */}
      {activeTab === 'csv' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            {!csvResponse ? (
              <div className="bg-white border border-card-border rounded-2xl p-6 space-y-5">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center
                    ${isDragActive
                      ? 'border-primary bg-primary-light/40'
                      : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                    } ${uploadingCsv ? 'pointer-events-none opacity-60' : ''}`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingCsv}
                  />
                  <div className="w-12 h-12 rounded-full bg-primary-light/60 border border-primary-light/50 flex items-center justify-center mb-3">
                    <UploadCloud className={`w-6 h-6 ${isDragActive ? 'text-primary' : 'text-slate-400'}`} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    Drag and drop statement here, or <span className="text-primary hover:underline">browse</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">
                    CSV, XLS, or XLSX statement • Maximum size: 5MB
                  </p>
                </div>

                {file && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-card-border rounded-xl text-xs font-semibold text-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    <button onClick={e => { e.stopPropagation(); setFile(null); }} className="text-slate-450 hover:text-slate-700 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {csvError && (
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs font-semibold leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <div>
                      <p className="font-bold text-red-950">Verification Failure</p>
                      <p className="text-red-600/90">{csvError}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || uploadingCsv}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-extrabold bg-primary hover:bg-primary-hover text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  {uploadingCsv ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Parsing statement schema...
                    </>
                  ) : (
                    <span>Upload and Import Ledger</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-card-border rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center shrink-0 border border-primary-light/50">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">Statement ledger imported</h3>
                    <p className="text-xs text-slate-450 mt-0.5">Imported {csvResponse.insertedCount} rows from {csvResponse.detectedBank}.</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={resetCsv}
                    className="px-4 py-2 text-xs font-extrabold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                  >
                    Upload Another Statement
                  </button>
                  <Link
                    href="/dashboard"
                    className="px-4 py-2 text-xs font-extrabold bg-primary hover:bg-primary-hover text-white rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    View Dashboard
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-card-border rounded-2xl p-5 space-y-4">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h3 className="font-bold text-slate-900 uppercase tracking-wider">Import Inflows as Fallback</h3>
                  <p className="text-slate-450 font-medium leading-relaxed mt-1">
                    If you accept transactions through channels other than ALATPay (cash, physical cheques, or other bank transfers), you can upload standard bank CSV statements here to sync your business runway.
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadSample}
                disabled={downloadingCsv}
                className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-xl transition-all bg-white cursor-pointer"
              >
                {downloadingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Sample Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Simulation Modal Overlay */}
      {showTransferModal && selectedAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-100">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Simulate Transfer to Virtual Account</h3>
                <p className="text-xs text-slate-500 mt-0.5">Mock Wema/ALAT virtual credit webhook for {selectedAccount.customerName}.</p>
              </div>
            </div>

            <form onSubmit={handleSimulateTransfer} className="space-y-3.5 text-xs font-semibold">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transfer Amount (₦)</label>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-600"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Simulated Payment Method</label>
                <select
                  value={transferMethod}
                  onChange={e => setTransferMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                >
                  <option value="TRANSFER">Direct Bank Transfer</option>
                  <option value="CARD">ALAT Checkout Card</option>
                  <option value="ALAT">ALAT Digital Wallet</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowTransferModal(false); setTransferAmount(''); }}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={simulatingTransfer}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {simulatingTransfer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Execute Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Reminder Modal Ov      {/* AI Reminder Modal Overlay */}
      {showReminderModal && selectedReminderLink && (() => {
        const parsed = (() => {
          const result = { whatsapp: '', sms: '', email: '' };
          if (!reminderDraft) return result;

          const waIndex = reminderDraft.search(/\*\*1\.\s+WhatsApp\s+Draft\*\*/i);
          const smsIndex = reminderDraft.search(/\*\*2\.\s+SMS\s+Draft\*\*/i);
          const emailIndex = reminderDraft.search(/\*\*3\.\s+Email\s+Draft\*\*/i);

          if (waIndex !== -1 && smsIndex !== -1 && emailIndex !== -1) {
            result.whatsapp = reminderDraft.substring(waIndex + 21, smsIndex).trim();
            result.sms = reminderDraft.substring(smsIndex + 14, emailIndex).trim();
            result.email = reminderDraft.substring(emailIndex + 16).trim();
          } else {
            result.whatsapp = reminderDraft;
            result.sms = reminderDraft.substring(0, 160);
            result.email = reminderDraft;
          }
          return result;
        })();

        const activeText = parsed[activeReminderTab];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95 duration-200">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-100">
                    <Sparkles className="w-5 h-5 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm">AI Cash Recovery Nudge</h3>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">Collection Follow-Up draft for {selectedReminderLink.customerName}.</p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowReminderModal(false); setReminderDraft(''); }}
                  className="text-slate-450 hover:text-slate-700 font-bold text-sm cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {generatingReminder ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Drafting personalized reminder...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Styled Tabs Selector */}
                  <div className="flex border-b border-slate-200 gap-2">
                    <button
                      onClick={() => setActiveReminderTab('whatsapp')}
                      className={`px-3.5 py-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5
                        ${activeReminderTab === 'whatsapp'
                          ? 'border-emerald-600 text-emerald-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                    <button
                      onClick={() => setActiveReminderTab('sms')}
                      className={`px-3.5 py-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5
                        ${activeReminderTab === 'sms'
                          ? 'border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      SMS
                    </button>
                    <button
                      onClick={() => setActiveReminderTab('email')}
                      className={`px-3.5 py-2 text-xs font-bold border-b-2 -mb-px transition-colors cursor-pointer flex items-center gap-1.5
                        ${activeReminderTab === 'email'
                          ? 'border-purple-600 text-purple-700'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>
                  </div>

                  {/* Draft Box */}
                  <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-xl max-h-[220px] overflow-y-auto">
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans font-medium leading-relaxed">{activeText}</pre>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs font-bold pt-1.5 border-t border-slate-100">
                    <div className="flex gap-2.5">
                      {activeReminderTab === 'whatsapp' && (
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(activeText)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Open WhatsApp
                        </a>
                      )}
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(activeText);
                          success(`${activeReminderTab.toUpperCase()} draft copied to clipboard!`);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Draft
                      </button>
                    </div>
                    <button
                      onClick={() => { setShowReminderModal(false); setReminderDraft(''); }}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-550 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Real-time Payment Notification Overlay */}
      {notification?.show && (
        <div className="fixed bottom-5 right-5 z-100 bg-slate-900 border border-slate-800 p-5 rounded-2xl w-80 shadow-2xl flex flex-col gap-3.5 animate-in slide-in-from-bottom duration-300 ease-out text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
              </div>
              <div>
                <h4 className="text-[10px] font-bold tracking-wider uppercase text-emerald-400">Payment Received</h4>
                <p className="text-base font-black mt-0.5 tabular-nums">{fmt(notification.amount)}</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">from {notification.customerName}</p>
              </div>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-slate-200 cursor-pointer font-bold text-xs"
            >
              ✕
            </button>
          </div>

          <div className="text-[11px] text-slate-250 font-semibold border-t border-slate-800/80 pt-3 space-y-2">
            <p className="text-slate-500 uppercase tracking-widest text-[9px] font-extrabold mb-1">Downstream Event Logs</p>
            <div className="space-y-2 font-medium">
              <div className="flex items-center gap-2 text-emerald-350">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Cash runway increased by 3 days</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-350">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Business Trust Score +4</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-350">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>Forecast updated</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-350">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>AI Brief refreshed</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
