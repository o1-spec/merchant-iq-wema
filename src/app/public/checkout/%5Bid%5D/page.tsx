'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CreditCard,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Wallet,
  Building,
  User,
  ShoppingBag
} from 'lucide-react';

interface PaymentLinkData {
  id: string;
  customerName: string;
  amount: number;
  purpose: string;
  reference: string;
  status: string;
  merchant: {
    businessName: string;
    location: string;
    currency: string;
  };
}

export default function MockCheckoutPage() {
  const params = useParams();
  const id = params.id as string;

  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'TRANSFER' | 'ALAT'>('CARD');
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    amount: number;
    customerName: string;
  } | null>(null);

  // Mocks for payment forms
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  async function fetchDetails() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/public/checkout/${id}`);
      if (!res.ok) {
        throw new Error('Payment link not found');
      }
      const json = await res.json();
      if (json.success) {
        setPaymentLink(json.data.paymentLink);
        if (json.data.paymentLink.status === 'PAID') {
          setPaid(true);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchDetails();
    }
  }, [id]);

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentLink || paying || paid) return;

    setPaying(true);
    try {
      const res = await fetch('/api/demo/simulate-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Value: {
            Status: true,
            Message: 'Success',
            Data: {
              Amount: paymentLink.amount,
              OrderId: paymentLink.reference,
              Id: `MOCK-TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
              Channel: paymentMethod === 'CARD' ? 'Card' : 'Bank Transfer',
              Status: 'completed',
              Customer: {
                Email: 'customer@merchantiq.app',
                FirstName: paymentLink.customerName.split(' ')[0],
                LastName: paymentLink.customerName.split(' ')[1] || 'Customer',
              }
            }
          }
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setPaid(true);
        setNotification({
          show: true,
          amount: paymentLink.amount,
          customerName: paymentLink.customerName,
        });
      } else {
        alert(json.error || 'Payment simulation failed.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred during payment simulation.');
    } finally {
      setPaying(false);
    }
  }

  function fmt(amount: number) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-rose-600 animate-spin" />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Securing ALATPay checkout channel...</p>
        </div>
      </div>
    );
  }

  if (error || !paymentLink) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-6 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Checkout Link Expired</h1>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed font-semibold">
              This payment checkout invoice link is no longer valid, or the reference record was deleted.
            </p>
          </div>
          <button
            onClick={fetchDetails}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors font-bold text-xs uppercase tracking-wider"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">

      {/* Visual ALAT Brand Header */}
      <div className="w-full max-w-[440px] flex items-center justify-between mb-4 px-1.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-rose-600 flex items-center justify-center shrink-0 shadow-sm shadow-rose-600/20">
            <span className="text-white font-extrabold text-xs">ALAT</span>
          </div>
          <span className="font-bold text-slate-800 text-sm tracking-tight">ALATPay Checkout</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider bg-white border border-slate-200 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          SECURE PAY
        </div>
      </div>

      <div className="w-full max-w-[440px] bg-white border border-slate-200 rounded-3xl shadow-lg shadow-slate-100 overflow-hidden relative">
        <div className="h-1 bg-rose-600 w-full" />

        {paid ? (
          /* Payment Success State */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">Payment Successful!</h2>
              <p className="text-slate-500 text-xs leading-relaxed font-semibold">
                Your payment to <span className="text-slate-800 font-bold">{paymentLink.merchant.businessName}</span> has been processed successfully via ALATPay.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4.5 rounded-2xl text-xs space-y-2.5 text-left font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant</span>
                <span className="text-slate-800 font-bold">{paymentLink.merchant.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Paid Amount</span>
                <span className="text-slate-800 font-bold text-sm">{fmt(paymentLink.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purpose</span>
                <span className="text-slate-800">{paymentLink.purpose}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Reference</span>
                <span className="text-slate-700 font-mono text-[10px] uppercase tracking-wider">{paymentLink.reference}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              You can safely close this checkout page.
            </p>
          </div>
        ) : (
          /* Invoice Form & Payment Methods */
          <form onSubmit={handlePayment} className="p-6 sm:p-7 space-y-6">

            {/* Invoice Summary Box */}
            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3 font-semibold text-xs relative">
              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                <Building className="w-4 h-4 text-slate-400" />
                <span className="text-slate-800 font-bold text-sm">{paymentLink.merchant.businessName}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-2.5 pt-1">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">For Customer</p>
                  <p className="text-slate-800 font-bold mt-0.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-455 shrink-0" />
                    {paymentLink.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Purpose</p>
                  <p className="text-slate-850 mt-0.5 flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-455 shrink-0" />
                    {paymentLink.purpose}
                  </p>
                </div>
              </div>
              <div className="border-t border-slate-200/60 pt-2.5 flex justify-between items-baseline mt-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Due</span>
                <span className="text-xl font-black text-rose-600">{fmt(paymentLink.amount)}</span>
              </div>
            </div>

            {/* Selector Tab for payment types */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Choose Payment Method</p>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CARD')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer
                    ${paymentMethod === 'CARD'
                      ? 'border-rose-600 bg-rose-50/20 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                    }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  <span>Card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('TRANSFER')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer
                    ${paymentMethod === 'TRANSFER'
                      ? 'border-rose-600 bg-rose-50/20 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                    }`}
                >
                  <Building className="w-4 h-4 shrink-0" />
                  <span>Transfer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('ALAT')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all cursor-pointer
                    ${paymentMethod === 'ALAT'
                      ? 'border-rose-600 bg-rose-50/20 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350'
                    }`}
                >
                  <Wallet className="w-4 h-4 shrink-0" />
                  <span>ALAT Pay</span>
                </button>
              </div>
            </div>

            {/* payment input content rendering */}
            <div className="border border-slate-100 bg-slate-50/50 rounded-2xl p-4.5 min-h-[140px] flex flex-col justify-center">
              {paymentMethod === 'CARD' && (
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Card Number</label>
                    <input
                      type="text"
                      placeholder="4012 3456 7890 1234"
                      value={cardNumber}
                      onChange={e => setCardNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-600 focus:border-transparent font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={e => setCardExpiry(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-600 focus:border-transparent font-mono"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        value={cardCvv}
                        onChange={e => setCardCvv(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg bg-white placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-600 focus:border-transparent font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'TRANSFER' && (
                <div className="text-center py-2 space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ALATPay Bank Transfer Details</p>
                  <div className="space-y-1">
                    <p className="text-base font-black text-slate-900 font-mono tracking-wider">801 234 5678</p>
                    <p className="text-xs font-extrabold text-rose-600">Wema / ALAT Bank</p>
                  </div>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                    Simulate making a transfer to the account number above by pressing the pay button below.
                  </p>
                </div>
              )}

              {paymentMethod === 'ALAT' && (
                <div className="text-center py-2 space-y-2.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pay directly with ALAT Profile</p>
                  <p className="text-xs text-slate-500 leading-normal font-semibold">
                    Authorize the charge of <span className="font-extrabold text-slate-800">{fmt(paymentLink.amount)}</span> directly using your connected ALAT digital banking app credentials.
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={paying}
              className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700
                disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed
                text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-rose-600/10 cursor-pointer"
            >
              {paying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Processing secure transaction...</span>
                </>
              ) : (
                <span>Pay {fmt(paymentLink.amount)} Securely</span>
              )}
            </button>

            <p className="text-[9px] text-slate-400 text-center font-bold uppercase tracking-wider">
              Protected by Wema Bank SME Trust network & SSL encryption.
            </p>
          </form>
        )}
      </div>

      {/* Real-time Payment Notification Overlay */}
      {notification?.show && (
        <div className="fixed bottom-5 right-5 z-100 bg-slate-900 border border-slate-800 p-5 rounded-2xl w-80 shadow-2xl flex flex-col gap-3.5 animate-in slide-in-from-bottom duration-300 ease-out text-white text-left">
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
