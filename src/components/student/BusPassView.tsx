import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { KKWaghLogo } from '../common/KKWaghLogo';
import { StudentAvatar } from '../common/StudentAvatar';
import {
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Bus,
  MapPin,
  QrCode,
  Share2,
  Sparkles,
  Clock,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  CreditCard,
  RefreshCw,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  computePassStatus,
  calculateDaysRemaining,
  formatDateReadable,
  openPassRenewalCheckout,
  fetchStudentRenewals,
} from '../../services/razorpayService';
import { PassRenewalRecord, PassExpiryStatus } from '../../types';

export const BusPassView: React.FC = () => {
  const { currentStudent, currentBus, currentRoute, activePass, showToast } = useApp();
  const [isCopied, setIsCopied] = useState(false);

  // Renewal & Payment State
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [processingRenewal, setProcessingRenewal] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [renewalSuccessData, setRenewalSuccessData] = useState<{
    paymentId: string;
    orderId: string;
    newExpiryDate?: string;
    receiptNumber?: string;
  } | null>(null);

  // Audit history
  const [renewals, setRenewals] = useState<PassRenewalRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Expiry calculation
  const expiryDate = currentStudent.passExpiryDate || activePass.validTill;
  const passStatus: PassExpiryStatus = useMemo(() => {
    return computePassStatus(currentStudent.passExpiryDate);
  }, [currentStudent.passExpiryDate]);

  const daysRemaining = useMemo(() => {
    return calculateDaysRemaining(currentStudent.passExpiryDate);
  }, [currentStudent.passExpiryDate]);

  // Load student renewal history
  const loadHistory = async () => {
    if (!currentStudent?.id) return;
    setLoadingHistory(true);
    try {
      const data = await fetchStudentRenewals(currentStudent.id);
      setRenewals(data);
    } catch (e) {
      console.warn('Error loading renewals:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [currentStudent.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    setIsCopied(true);
    showToast('Bus pass verification link copied!');
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Launch Razorpay Renewal
  const handleInitiatePayment = () => {
    setProcessingRenewal(true);
    setRenewalError(null);

    openPassRenewalCheckout({
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      studentEmail: currentStudent.email,
      studentPhone: currentStudent.phone,
      prn: currentStudent.prn,
      onSuccess: (result) => {
        setProcessingRenewal(false);
        setRenewalSuccessData(result);
        showToast('Bus pass renewed successfully! Expiry extended by 180 days.');
        loadHistory();
      },
      onFailure: (errMsg) => {
        setProcessingRenewal(false);
        setRenewalError(errMsg);
      },
      onDismiss: () => {
        setProcessingRenewal(false);
      },
    });
  };

  const isApproved =
    currentStudent.approvalStatus === 'approved' ||
    currentStudent.passStatus === 'ACTIVE' ||
    currentStudent.passStatus === 'EXPIRING_SOON' ||
    currentStudent.passStatus === 'EXPIRED';

  if (!isApproved) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 sm:p-10 text-center shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <Clock className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 uppercase">
            Pass Issuance Pending
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Digital Bus Pass Under Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            Your registration is currently being verified by the Transport Administration for PRN{' '}
            <strong className="text-slate-800">{currentStudent.prn}</strong>. Once approved, your authenticated digital QR pass with dean seal will be issued here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* EXPIRING SOON OR EXPIRED ALERT BANNER */}
      {passStatus === 'EXPIRING_SOON' && (
        <div className="bg-amber-500/10 border-2 border-amber-400 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                <span>Pass Expiring Soon – {daysRemaining} Day(s) Left</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                  Action Required
                </span>
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Your bus pass validity expires on <strong>{formatDateReadable(expiryDate)}</strong>. Renew today to prevent interruption in college transport access.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRenewalModal(true)}
            className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Renew Pass Now (₹1)</span>
          </button>
        </div>
      )}

      {passStatus === 'EXPIRED' && (
        <div className="bg-rose-500/10 border-2 border-rose-400 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-rose-950 flex items-center gap-2">
                <span>Bus Pass Expired</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                  Expired on {formatDateReadable(expiryDate)}
                </span>
              </p>
              <p className="text-xs text-rose-800 mt-0.5">
                Your bus pass validity has expired. Boarding privileges may be suspended by the driver. Renew now to extend by 180 days.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRenewalModal(true)}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Renew Pass Now (₹1)</span>
          </button>
        </div>
      )}

      {passStatus === 'MISSING_EXPIRY' && (
        <div className="bg-slate-100 border border-slate-300 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">
                Legacy Pass – Missing Expiry Date
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                No expiry date was specified during your original registration. You can renew your pass now to obtain an official 180-day digital pass with Razorpay verification.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRenewalModal(true)}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Set Validity / Renew (₹1)</span>
          </button>
        </div>
      )}

      {/* TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            {passStatus === 'ACTIVE' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Active & Valid ({daysRemaining} days left)
              </span>
            )}
            {passStatus === 'EXPIRING_SOON' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Expiring Soon ({daysRemaining} days left)
              </span>
            )}
            {passStatus === 'EXPIRED' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                Pass Expired
              </span>
            )}
            {passStatus === 'MISSING_EXPIRY' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                Missing Expiry Date
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium">
              Academic Year {activePass.academicYear}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
            Digital College Bus Pass
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Present this authenticated digital pass or QR code to the driver while boarding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowRenewalModal(true)}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Renew Pass (₹1)</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isCopied ? 'Copied' : 'Share Pass'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* OFFICIAL COLLEGE BUS PASS ID CARD */}
      <div
        id="printableBusPass"
        className="bg-white rounded-3xl border-2 border-sky-300 shadow-md overflow-hidden relative"
      >
        {/* Top College Header */}
        <div className="bg-linear-to-r from-sky-700 via-blue-700 to-sky-800 text-white p-6 relative">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="flex items-center gap-4">
              <KKWaghLogo size="lg" className="brightness-105" />
              <div>
                <p className="text-xs font-bold text-sky-200 tracking-wider uppercase">
                  Karmaveer Kakasaheb Wagh Education Society
                </p>
                <h2 className="text-base sm:text-lg font-extrabold text-white leading-tight">
                  K. K. Wagh Institute of Engineering Education & Research
                </h2>
                <p className="text-[11px] text-sky-100 font-medium">
                  Amrutdham, Panchavati, Nashik - 422003 · Autonomous Institute
                </p>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-center sm:text-right shrink-0">
              <p className="text-[10px] text-sky-200 font-bold uppercase tracking-wider">
                System Pass ID
              </p>
              <p className="font-mono text-sm font-extrabold text-white mt-0.5">
                {activePass.passNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Header Ribbon */}
        <div className="bg-amber-50 border-b border-amber-200/80 px-6 py-2 flex items-center justify-between text-xs font-bold text-amber-950">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-600" />
            <span>OFFICIAL STUDENT BUS CONCESSION PASS · VAAHAN TRANSIT</span>
          </div>
          <span className="font-mono text-amber-800">
            VALID TILL: {currentStudent.passExpiryDate ? formatDateReadable(currentStudent.passExpiryDate) : 'SEMESTER TERM'}
          </span>
        </div>

        {/* Pass Body */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Left Column: Student Avatar & Identity */}
          <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
            <StudentAvatar
              name={currentStudent.name}
              seed={currentStudent.avatarSeed}
              gender={currentStudent.gender}
              bgColor={currentStudent.avatarBg}
              size="2xl"
              showBadge={true}
              status="active"
            />

            <h3 className="mt-3 text-base font-extrabold text-slate-900 leading-tight">
              {currentStudent.name}
            </h3>
            <p className="text-xs font-bold text-sky-700 mt-0.5">
              {currentStudent.branch}
            </p>
            <p className="text-xs text-slate-500 font-medium">
              Year: {currentStudent.year} · Div: {currentStudent.division} · Roll: {currentStudent.rollNo}
            </p>

            <div className="mt-3 pt-3 border-t border-slate-200 w-full flex items-center justify-between text-[11px] text-slate-600">
              <span>PRN:</span>
              <span className="font-mono font-bold text-slate-900">{currentStudent.prn}</span>
            </div>
            <div className="w-full flex items-center justify-between text-[11px] text-slate-600 mt-1">
              <span>Blood Group:</span>
              <span className="font-bold text-rose-700">{currentStudent.bloodGroup}</span>
            </div>
          </div>

          {/* Center Column: Route & Transit Details */}
          <div className="space-y-3.5 md:col-span-1">
            <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                Assigned Bus & Vehicle
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Bus className="w-4 h-4 text-sky-600" />
                <span className="text-sm font-extrabold text-slate-900">
                  {currentBus?.busNumber || 'Assigned Bus'}
                </span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white text-slate-700 border border-sky-200">
                  {currentBus?.plateNumber || 'MH-15-2024'}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Designated Route
              </p>
              <p className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <span className="text-sky-700">{currentRoute?.routeNumber}:</span>
                <span>{currentRoute?.name}</span>
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Boarding / Pickup Stop
              </p>
              <p className="text-xs font-bold text-slate-900 mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                {currentStudent.stopName}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Morning Pickup Time: <strong className="text-slate-800">{currentStudent.stopPickupTime}</strong>
              </p>
            </div>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-medium">Valid Period:</span>
              <span className="font-bold text-slate-800">
                {formatDateReadable(currentStudent.passIssueDate || '2026-07-01')} – {formatDateReadable(currentStudent.passExpiryDate || activePass.validTill)}
              </span>
            </div>
          </div>

          {/* Right Column: Dynamic QR Code & College Stamp */}
          <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <QrCode className="w-4 h-4 text-sky-600" /> Driver Scan QR
            </p>

            <div className="p-3 bg-white rounded-xl border-2 border-slate-200 shadow-xs relative">
              <svg className="w-36 h-36" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
                <rect x="5" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="9" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="13" width="9" height="9" fill="#0f172a" />
                <rect x="70" y="5" width="25" height="25" fill="#0f172a" />
                <rect x="74" y="9" width="17" height="17" fill="#ffffff" />
                <rect x="78" y="13" width="9" height="9" fill="#0f172a" />
                <rect x="5" y="70" width="25" height="25" fill="#0f172a" />
                <rect x="9" y="74" width="17" height="17" fill="#ffffff" />
                <rect x="13" y="78" width="9" height="9" fill="#0f172a" />
                <rect x="35" y="8" width="4" height="4" fill="#0284c7" />
                <rect x="42" y="12" width="4" height="4" fill="#0f172a" />
                <rect x="50" y="8" width="4" height="4" fill="#0f172a" />
                <rect x="58" y="15" width="4" height="4" fill="#0284c7" />
                <rect x="35" y="22" width="4" height="4" fill="#0f172a" />
                <rect x="48" y="25" width="4" height="4" fill="#0284c7" />
                <rect x="8" y="36" width="4" height="4" fill="#0f172a" />
                <rect x="18" y="42" width="4" height="4" fill="#0284c7" />
                <rect x="25" y="38" width="4" height="4" fill="#0f172a" />
                <rect x="8" y="48" width="4" height="4" fill="#0284c7" />
                <circle cx="50" cy="50" r="12" fill="#ffffff" stroke="#0284c7" strokeWidth="2" />
                <text x="50" y="54" textAnchor="middle" fill="#0284c7" fontSize="8" fontWeight="bold">
                  KKW
                </text>
                <rect x="68" y="38" width="4" height="4" fill="#0f172a" />
                <rect x="78" y="45" width="4" height="4" fill="#0284c7" />
                <rect x="88" y="40" width="4" height="4" fill="#0f172a" />
                <rect x="65" y="52" width="4" height="4" fill="#0f172a" />
                <rect x="80" y="55" width="4" height="4" fill="#0284c7" />
                <rect x="38" y="68" width="4" height="4" fill="#0f172a" />
                <rect x="45" y="74" width="4" height="4" fill="#0284c7" />
                <rect x="52" y="82" width="4" height="4" fill="#0f172a" />
                <rect x="60" y="70" width="4" height="4" fill="#0f172a" />
                <rect x="75" y="78" width="4" height="4" fill="#0284c7" />
                <rect x="85" y="85" width="4" height="4" fill="#0f172a" />
              </svg>
            </div>

            <div className="text-center pt-2">
              <div className="inline-block border-b border-dashed border-slate-400 pb-1 px-4">
                <span className="font-serif italic font-bold text-sky-800 text-xs">
                  S. R. Gangurde
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">
                Prof. S. R. Gangurde
              </p>
              <p className="text-[9px] text-slate-400">Dean of Transport & Transit</p>
            </div>
          </div>
        </div>

        {/* Footer Bar */}
        <div className="bg-slate-100/80 px-6 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Annual Fee ₹{activePass.feePaid.toLocaleString()} paid via {activePass.paymentRef}</span>
          </div>
          <span className="font-mono text-slate-400">
            Generated via Vaahan · KKWIEER Nashik
          </span>
        </div>
      </div>

      {/* RAZORPAY RENEWAL & PAYMENT HISTORY TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Pass Renewal & Payment Receipts
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified transactions executed via Razorpay Checkout with server-side signature validation.
            </p>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {renewals.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="font-bold text-slate-600 text-xs">No online renewals recorded yet.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Click &quot;Renew Pass (₹1)&quot; above to simulate a renewal via Razorpay Test Mode.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="p-3 pl-4">Payment Reference</th>
                  <th className="p-3">Razorpay Order ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Extended Till</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 pr-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {renewals.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="p-3 pl-4 font-mono font-bold text-sky-800">
                      {r.razorpayPaymentId}
                    </td>
                    <td className="p-3 font-mono text-slate-500 text-[11px]">
                      {r.razorpayOrderId}
                    </td>
                    <td className="p-3 font-bold text-emerald-700">
                      ₹{r.amount.toFixed(2)}
                    </td>
                    <td className="p-3 font-bold text-slate-900">
                      {formatDateReadable(r.newExpiryDate)}
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3 pr-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RAZORPAY PASS RENEWAL MODAL */}
      {showRenewalModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-linear-to-r from-sky-700 to-blue-800 text-white p-6 relative">
              <button
                type="button"
                onClick={() => {
                  setShowRenewalModal(false);
                  setRenewalError(null);
                  setRenewalSuccessData(null);
                }}
                className="absolute right-4 top-4 p-2 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
                  Razorpay Standard Checkout · Test Mode
                </span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                Renew Student College Bus Pass
              </h2>
              <p className="text-xs text-sky-100 mt-1">
                Extend transit concession validity by 180 days (1 academic semester).
              </p>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {renewalSuccessData ? (
                /* Success Screen */
                <div className="space-y-4 text-center py-4">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">
                      Pass Successfully Renewed!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Your cryptographic payment receipt has been verified and recorded in the institutional database.
                    </p>
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-left space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Student Name:</span>
                      <span className="font-bold text-slate-900">{currentStudent.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">PRN / ID:</span>
                      <span className="font-mono font-bold text-slate-800">{currentStudent.prn}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Razorpay Payment ID:</span>
                      <span className="font-mono font-bold text-sky-700">
                        {renewalSuccessData.paymentId}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Amount Paid:</span>
                      <span className="font-bold text-emerald-700">₹1.00 (Test Mode)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">New Validity End Date:</span>
                      <span className="font-bold text-slate-900">
                        {formatDateReadable(renewalSuccessData.newExpiryDate)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowRenewalModal(false);
                      setRenewalSuccessData(null);
                      window.location.reload();
                    }}
                    className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                  >
                    Done & Refresh Pass View
                  </button>
                </div>
              ) : (
                /* Pre-payment Review Form */
                <>
                  <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Student:</span>
                      <span className="font-bold text-slate-900">{currentStudent.name}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">PRN:</span>
                      <span className="font-mono font-bold text-slate-800">{currentStudent.prn}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Current Route:</span>
                      <span className="font-semibold text-slate-800">
                        {currentRoute?.name || currentStudent.routeName || 'Assigned Route'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Current Expiry:</span>
                      <span className="font-bold text-slate-900">
                        {currentStudent.passExpiryDate ? formatDateReadable(currentStudent.passExpiryDate) : 'Not Specified'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Renewal Term:</span>
                      <span className="font-bold text-sky-700">+180 Days (1 Semester Term)</span>
                    </div>
                    <div className="flex justify-between py-1 pt-2 font-bold text-sm">
                      <span className="text-slate-900">Test Mode Fee:</span>
                      <span className="text-emerald-700 font-extrabold">₹1.00</span>
                    </div>
                  </div>

                  {/* Test Mode Notice */}
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Test Mode Simulated Transaction</p>
                      <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                        This checkout runs in Razorpay Test Mode with a ₹1.00 amount. You can complete the payment using Razorpay dummy UPI or mock card credentials.
                      </p>
                    </div>
                  </div>

                  {renewalError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{renewalError}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowRenewalModal(false)}
                      disabled={processingRenewal}
                      className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleInitiatePayment}
                      disabled={processingRenewal}
                      className="flex-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
                    >
                      {processingRenewal ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Initiating Razorpay...</span>
                        </>
                      ) : (
                        <>
                          <span>Pay ₹1.00 via Razorpay</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
