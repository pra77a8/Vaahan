import React from 'react';
import { useApp } from '../../context/AppContext';
import { KKWaghLogo } from '../common/KKWaghLogo';
import {
  CreditCard,
  CheckCircle2,
  Download,
  Printer,
  ShieldCheck,
  Receipt,
  Clock,
  Sparkles,
} from 'lucide-react';

export const PaymentView: React.FC = () => {
  const { currentStudent, payments, activePass, showToast } = useApp();

  return (
    <div className="space-y-8">
      {/* Header - Spacious */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Fee Clear · No Dues
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Academic Year 2025-26
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Bus Facility Fees & Receipts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official fee records, verified digital payment vouchers, and college receipt downloads.
          </p>
        </div>

        <button
          onClick={() => {
            window.print();
          }}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors shrink-0"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print All Receipts</span>
        </button>
      </div>

      {/* Current Term Fee Status Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Current Academic Year Subscription</p>
              <h2 className="text-lg font-extrabold text-slate-900">
                Annual Campus Transit Fee (2025 - 2026)
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Amount Paid</p>
              <p className="text-base font-extrabold text-slate-900 mt-0.5">₹18,500</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> PAID
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Challan Ref</p>
              <p className="text-xs font-mono font-bold text-slate-700 mt-0.5">KKW/TR/2025/0842</p>
            </div>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authenticated by Finance & Accounts Section · K.K. Wagh Institute</span>
          </div>
        </div>

        {/* Right download receipt banner */}
        <div className="bg-sky-50/70 p-5 rounded-2xl border border-sky-200/80 text-center space-y-3">
          <p className="text-xs font-bold text-sky-900">Official Tax & Fee Voucher</p>
          <p className="text-[11px] text-sky-800">
            Includes GST breakdown, student PRN {currentStudent.prn}, and college transport pass authorization.
          </p>
          <button
            onClick={() => showToast('Downloading Official Fee Receipt PDF...')}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF Receipt</span>
          </button>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Payment & Receipt History</h3>
          <span className="text-xs text-slate-500">{payments.length} Records</span>
        </div>

        <div className="divide-y divide-slate-100">
          {payments.map((pay) => (
            <div
              key={pay.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                  <CreditCard className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{pay.term}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono text-slate-700">{pay.receiptNumber}</span>
                    <span>•</span>
                    <span>{pay.date}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-600">{pay.paymentMode}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:text-right">
                <div>
                  <p className="text-base font-extrabold text-slate-900">
                    ₹{pay.amount.toLocaleString()}
                  </p>
                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    SUCCESS
                  </span>
                </div>
                <button
                  onClick={() => showToast(`Downloading receipt ${pay.receiptNumber}`)}
                  className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Download receipt"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
