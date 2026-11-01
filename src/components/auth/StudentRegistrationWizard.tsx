import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Mail,
  Phone,
  Lock,
  GraduationCap,
  Bus,
  MapPin,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Building2,
  Upload,
  FileText,
  X,
  ShieldCheck,
  Eye,
  ExternalLink,
  Calendar,
  Loader2,
} from 'lucide-react';
import { StudentRegistrationData, Shift, OfficialRoute, OfficialRouteStop } from '../../types';
import { validateCollegeEmail, registerStudent } from '../../services/authService';
import {
  fetchShifts,
  fetchRoutesByShift,
  fetchStopsForRoute,
  formatRouteDisplay,
} from '../../services/routeService';

interface StudentRegistrationWizardProps {
  onSuccess: (email: string) => void;
  onCancel: () => void;
}

const DEPARTMENTS = [
  'Computer Engineering',
  'Information Technology',
  'Artificial Intelligence & Data Science',
  'Electronics & Telecommunication',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Electrical Engineering',
  'Robotics & Automation',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

export const StudentRegistrationWizard: React.FC<StudentRegistrationWizardProps> = ({
  onSuccess,
  onCancel,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState<StudentRegistrationData>({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    prn: '',
    department: 'Computer Engineering',
    academicYear: 'TE',
    division: 'A',
    shiftId: '',
    routeId: '',
    pickupStopId: '',
    passExpiryDate: '',
    feeReceiptFile: null,
    feeReceiptName: '',
    feeReceiptSize: 0,
    feeReceiptType: '',
    feeReceiptDataUrl: '',
  });

  // Dynamic Route Options
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [routes, setRoutes] = useState<OfficialRoute[]>([]);
  const [pickupStops, setPickupStops] = useState<OfficialRouteStop[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);

  // Validation & Error states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);
  const isSubmittingRef = useRef(false);

  // Load shifts on mount (do NOT auto-select shift so student explicitly chooses)
  useEffect(() => {
    fetchShifts().then((data) => {
      setShifts(data);
    });
  }, []);

  // When shift changes -> reset route & stop, fetch routes for that shift
  useEffect(() => {
    if (!formData.shiftId) {
      setRoutes([]);
      setPickupStops([]);
      setFormData((prev) => ({ ...prev, routeId: '', pickupStopId: '' }));
      return;
    }
    setLoadingRoutes(true);
    fetchRoutesByShift(formData.shiftId).then((data) => {
      setRoutes(data);
      setLoadingRoutes(false);
      // Reset selected route & stop
      setFormData((prev) => ({
        ...prev,
        routeId: '',
        pickupStopId: '',
      }));
    });
  }, [formData.shiftId]);

  // When route changes -> reset pickup stop, fetch eligible pickup stops
  useEffect(() => {
    if (!formData.routeId) {
      setPickupStops([]);
      setFormData((prev) => ({ ...prev, pickupStopId: '' }));
      return;
    }
    setLoadingStops(true);
    fetchStopsForRoute(formData.routeId, true).then((stops) => {
      setPickupStops(stops);
      setLoadingStops(false);
      setFormData((prev) => ({
        ...prev,
        pickupStopId: '',
      }));
    });
  }, [formData.routeId]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full legal name is required.';
    }

    const emailCheck = validateCollegeEmail(formData.email);
    if (!emailCheck.isValid) {
      newErrors.email = emailCheck.error || 'Invalid email address';
    }

    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      newErrors.phone = 'Please provide a valid 10-digit mobile number.';
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.prn.trim()) {
      newErrors.prn = 'PRN / University Enrollment Number is required.';
    } else if (formData.prn.trim().length < 6) {
      newErrors.prn = 'Please enter a valid PRN number.';
    }

    if (!formData.division.trim()) {
      newErrors.division = 'Class division is required (e.g. A, B, C).';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Step 3 Validation (Transportation selection)
  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.shiftId) {
      newErrors.shiftId = 'Please select your college shift.';
    }

    if (!formData.routeId) {
      newErrors.routeId = 'Please select your bus route.';
    }

    if (!formData.pickupStopId) {
      newErrors.pickupStopId = 'Please select your designated boarding/pickup stop.';
    }

    if (!formData.passExpiryDate) {
      newErrors.passExpiryDate = 'Pass Expiry Date is required. Please select the validity date.';
    } else {
      const selectedDate = new Date(formData.passExpiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.passExpiryDate = 'Pass expiry date cannot be in the past.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    setServerError(null);
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleBack = () => {
    setServerError(null);
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else onCancel();
  };

  // Handle Enter key on input fields: advance step without premature submission
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (step < 3) {
        handleNext();
      }
    }
  };

  // Fee Receipt Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        receipt: 'Unsupported file type. Please upload a PDF, JPG, or PNG document.',
      }));
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({
        ...prev,
        receipt: 'File size exceeds 5 MB limit. Please upload a smaller file.',
      }));
      return;
    }

    // Read Data URL for preview
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        feeReceiptFile: file,
        feeReceiptName: file.name,
        feeReceiptSize: file.size,
        feeReceiptType: file.type,
        feeReceiptDataUrl: reader.result as string,
      }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next.receipt;
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveReceipt = () => {
    setFormData((prev) => ({
      ...prev,
      feeReceiptFile: null,
      feeReceiptName: '',
      feeReceiptSize: 0,
      feeReceiptType: '',
      feeReceiptDataUrl: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent submission if not on step 3
    if (step < 3) {
      handleNext();
      return;
    }

    // In-flight guard: prevent double-clicks or repeated submissions
    if (isSubmittingRef.current || submitting) {
      return;
    }

    // Must validate step 1, 2, and 3
    if (!validateStep1() || !validateStep2() || !validateStep3()) {
      return;
    }

    isSubmittingRef.current = true;
    setSubmitting(true);
    setServerError(null);
    setIsRateLimited(false);

    try {
      const res = await registerStudent(formData);

      if (!res.success) {
        setServerError(res.error || 'Failed to complete registration.');
        if (res.isRateLimited) {
          setIsRateLimited(true);
        }
        return;
      }

      setNeedsEmailVerification(Boolean(res.requiresEmailConfirmation));
      setIsSubmitted(true);
    } catch (err: any) {
      setServerError(err.message || 'An unexpected error occurred during registration.');
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (isSubmitted) {
    const selectedShift = shifts.find((s) => s.id === formData.shiftId);
    const selectedRoute = routes.find((r) => r.id === formData.routeId);
    const selectedStop = pickupStops.find((s) => s.stopId === formData.pickupStopId);

    return (
      <div className="max-w-xl w-full mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 animate-in fade-in zoom-in-95">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
            <Clock className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            Registration Submitted · Pending Approval
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
            Application Awaiting Administrator Verification
          </h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Your college bus transit registration has been securely transmitted. Your PRN and
            transport details must be verified by the Transport Cell before tracking and digital bus
            pass access are unlocked.
          </p>

          {needsEmailVerification && (
            <div className="mt-3 p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-start gap-2.5 text-left">
              <Mail className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Email Confirmation Required</p>
                <p className="mt-0.5 text-sky-800 leading-relaxed">
                  A verification email has been dispatched to <strong>{formData.email}</strong>. Please confirm your email address before signing into the student transit portal.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <div className="flex justify-between py-1 border-b border-slate-200/70">
            <span className="text-slate-500">Student Name:</span>
            <span className="font-bold text-slate-900">{formData.fullName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/70">
            <span className="text-slate-500">College Email:</span>
            <span className="font-mono text-slate-900">{formData.email}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/70">
            <span className="text-slate-500">PRN / Enrollment:</span>
            <span className="font-mono font-bold text-sky-800">{formData.prn}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/70">
            <span className="text-slate-500">Department & Year:</span>
            <span className="font-medium text-slate-900">
              {formData.department} ({formData.academicYear} · Div {formData.division})
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/70">
            <span className="text-slate-500">Shift & Route:</span>
            <span className="font-medium text-slate-900">
              {selectedShift?.name} · {selectedRoute?.name}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/70">
            <span className="text-slate-500">Designated Pickup Stop:</span>
            <span className="font-bold text-sky-900">{selectedStop?.stop.name}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-slate-200/70">
            <span className="text-slate-500">Pass Expiry Date:</span>
            <span className="font-bold text-emerald-700">
              {formData.passExpiryDate
                ? new Date(formData.passExpiryDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '1 Academic Semester'}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Fee Receipt:</span>
            <span className="font-medium text-slate-700">
              {formData.feeReceiptName ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded ({formData.feeReceiptName})
                </span>
              ) : (
                <span className="text-slate-400">Not Uploaded (Optional)</span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={() => onSuccess(formData.email)}
            className="w-full py-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <span>Proceed to Student Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const selectedShift = shifts.find((s) => s.id === formData.shiftId);
  const selectedRoute = routes.find((r) => r.id === formData.routeId);
  const selectedStop = pickupStops.find((ps) => ps.stopId === formData.pickupStopId);

  return (
    <div className="max-w-xl w-full mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
      {/* Header with Step Progress */}
      <div className="bg-gradient-to-r from-sky-700 to-blue-800 text-white p-6 sm:p-7">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-sky-200 uppercase">
              Student Registration
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-0.5">
              Create College Transit Account
            </h2>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white">
            Step {step} of 3
          </span>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { num: 1, label: '1. Personal' },
            { num: 2, label: '2. Academic' },
            { num: 3, label: '3. Transport & Fee' },
          ].map((item) => (
            <div key={item.num} className="space-y-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step >= item.num ? 'bg-white' : 'bg-white/30'
                }`}
              />
              <p
                className={`text-[10px] font-semibold text-center ${
                  step >= item.num ? 'text-white' : 'text-sky-200'
                }`}
              >
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {serverError && (
        <div
          className={`m-6 p-4 rounded-2xl border text-xs flex items-start gap-3 shadow-xs ${
            isRateLimited
              ? 'bg-amber-50/90 border-amber-300 text-amber-900 ring-2 ring-amber-100'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {isRateLimited ? (
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-bold">
              {isRateLimited ? 'Institutional Rate Limit Cooldown Active' : 'Registration Notice'}
            </p>
            <p className="mt-0.5 leading-relaxed">{serverError}</p>
            {isRateLimited && (
              <p className="mt-1.5 text-[11px] text-amber-700 font-medium">
                Your completed application details are safely preserved. Please wait a few minutes before submitting again, or contact the K.K. Wagh Transport Cell for immediate verification.
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        {/* =================================================================== */}
        {/* STEP 1: PERSONAL DETAILS */}
        {/* =================================================================== */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <label htmlFor="reg-fullname" className="text-xs font-bold text-slate-700 block mb-1.5">
                Full Legal Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-fullname"
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  onKeyDown={handleInputKeyDown}
                  placeholder="e.g. Pradhan Gle"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                />
              </div>
              {errors.fullName && <p className="text-[11px] text-rose-600 mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="reg-email" className="text-xs font-bold text-slate-700 block">
                  Official College Email <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  Must end in @kkwagh.edu.in
                </span>
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onKeyDown={handleInputKeyDown}
                  placeholder="pradhangle370125@kkwagh.edu.in"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all ${
                    errors.email
                      ? 'border-rose-300 bg-rose-50/30'
                      : 'border-slate-200 bg-slate-50/70 focus:border-sky-500'
                  }`}
                />
              </div>
              {errors.email ? (
                <p className="text-[11px] text-rose-600 mt-1 leading-relaxed">{errors.email}</p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">
                  Only official college email IDs ending in @kkwagh.edu.in are accepted.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="reg-phone" className="text-xs font-bold text-slate-700 block mb-1.5">
                Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  onKeyDown={handleInputKeyDown}
                  placeholder="9403812345"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                />
              </div>
              {errors.phone && <p className="text-[11px] text-rose-600 mt-1">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-password" className="text-xs font-bold text-slate-700 block mb-1.5">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  />
                </div>
                {errors.password && <p className="text-[11px] text-rose-600 mt-1">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="reg-confirm-password" className="text-xs font-bold text-slate-700 block mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="reg-confirm-password"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 2: ACADEMIC DETAILS */}
        {/* =================================================================== */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 text-xs text-sky-900">
              <p className="font-bold flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-sky-700" /> Academic Enrollment Check
              </p>
              <p className="text-[11px] text-sky-800 mt-0.5">
                Your PRN and department records will be verified by the Transport Cell before pass issuance.
              </p>
            </div>

            <div>
              <label htmlFor="reg-prn" className="text-xs font-bold text-slate-700 block mb-1.5">
                PRN / University Enrollment Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="reg-prn"
                  type="text"
                  value={formData.prn}
                  onChange={(e) => setFormData({ ...formData, prn: e.target.value.toUpperCase() })}
                  onKeyDown={handleInputKeyDown}
                  placeholder="e.g. 72148902K"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-mono font-bold text-slate-900 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                />
              </div>
              {errors.prn && <p className="text-[11px] text-rose-600 mt-1">{errors.prn}</p>}
            </div>

            <div>
              <label htmlFor="reg-department" className="text-xs font-bold text-slate-700 block mb-1.5">
                Department / Engineering Branch <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  id="reg-department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all cursor-pointer"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-academic-year" className="text-xs font-bold text-slate-700 block mb-1.5">
                  Academic Year <span className="text-rose-500">*</span>
                </label>
                <select
                  id="reg-academic-year"
                  value={formData.academicYear}
                  onChange={(e) =>
                    setFormData({ ...formData, academicYear: e.target.value as any })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all cursor-pointer"
                >
                  <option value="FE">First Year (FE)</option>
                  <option value="SE">Second Year (SE)</option>
                  <option value="TE">Third Year (TE)</option>
                  <option value="BE">Final Year (BE)</option>
                </select>
              </div>

              <div>
                <label htmlFor="reg-division" className="text-xs font-bold text-slate-700 block mb-1.5">
                  Class Division <span className="text-rose-500">*</span>
                </label>
                <input
                  id="reg-division"
                  type="text"
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value.toUpperCase() })}
                  onKeyDown={handleInputKeyDown}
                  placeholder="e.g. A, B, C"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-bold text-slate-900 uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all text-center"
                />
                {errors.division && <p className="text-[11px] text-rose-600 mt-1">{errors.division}</p>}
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* STEP 3: TRANSPORTATION DETAILS & FEE RECEIPT (NO DESTINATION FIELD!) */}
        {/* =================================================================== */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <Bus className="w-4 h-4 text-amber-700" /> Transportation Allocation
              </p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Select your Shift to load approved official college bus routes, then pick your route to choose your designated pickup point. Destination is automatically set to K. K. Wagh Campus.
              </p>
            </div>

            {/* 1. SELECT SHIFT */}
            <div>
              <label htmlFor="reg-shift" className="text-xs font-bold text-slate-700 block mb-1.5">
                College Shift <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  id="reg-shift"
                  value={formData.shiftId}
                  onChange={(e) => setFormData({ ...formData, shiftId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all cursor-pointer"
                >
                  <option value="">-- Choose College Shift --</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.startTime} – {s.endTime})
                    </option>
                  ))}
                </select>
              </div>
              {errors.shiftId && <p className="text-[11px] text-rose-600 mt-1">{errors.shiftId}</p>}
            </div>

            {/* 2. SELECT ROUTE (Belonging to Shift) */}
            <div>
              <label htmlFor="reg-route" className="text-xs font-bold text-slate-700 block mb-1.5">
                Official Bus Route <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Bus className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  id="reg-route"
                  value={formData.routeId}
                  onChange={(e) => setFormData({ ...formData, routeId: e.target.value })}
                  disabled={!formData.shiftId || loadingRoutes}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {!formData.shiftId
                      ? '-- Please select Shift first --'
                      : loadingRoutes
                      ? 'Loading routes...'
                      : '-- Choose Official Route --'}
                  </option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRouteDisplay(r)}
                    </option>
                  ))}
                </select>
              </div>
              {errors.routeId && <p className="text-[11px] text-rose-600 mt-1">{errors.routeId}</p>}
            </div>

            {/* 3. SELECT PICKUP STOP (Eligible stops on Route) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="reg-stop" className="text-xs font-bold text-slate-700 block">
                  Designated Boarding / Pickup Stop <span className="text-rose-500">*</span>
                </label>
                {pickupStops.length > 0 && (
                  <span className="text-[10px] text-slate-500 font-medium">
                    {pickupStops.length} eligible stops
                  </span>
                )}
              </div>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  id="reg-stop"
                  value={formData.pickupStopId}
                  onChange={(e) => setFormData({ ...formData, pickupStopId: e.target.value })}
                  disabled={!formData.routeId || loadingStops || pickupStops.length === 0}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all cursor-pointer disabled:opacity-50"
                >
                  <option value="">
                    {!formData.routeId
                      ? '-- Please select Route first --'
                      : loadingStops
                      ? 'Loading stops...'
                      : pickupStops.length === 0
                      ? 'No eligible pickup stops found'
                      : '-- Choose Pickup Stop --'}
                  </option>
                  {pickupStops.map((ps) => (
                    <option key={`${ps.stopId}-${ps.sequenceNumber}`} value={ps.stopId}>
                      Stop #{ps.sequenceNumber}: {ps.stop.name}
                      {ps.morningPickupTime ? ` (${ps.morningPickupTime})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {errors.pickupStopId && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.pickupStopId}</p>
              )}
            </div>

            {/* 4. PASS EXPIRY DATE */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="reg-pass-expiry" className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-sky-700" />
                  <span>Pass Expiry Date</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">Validity Term</span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  id="reg-pass-expiry"
                  value={formData.passExpiryDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, passExpiryDate: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Select the date until which your institutional bus pass will remain valid.
              </p>
              {/* Quick Select Presets */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Select:</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + 6);
                    setFormData({ ...formData, passExpiryDate: d.toISOString().split('T')[0] });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  +6 Months (1 Term)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() + 1);
                    setFormData({ ...formData, passExpiryDate: d.toISOString().split('T')[0] });
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  +1 Year (Annual)
                </button>
              </div>
              {errors.passExpiryDate && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.passExpiryDate}</p>
              )}
            </div>

            {/* CONFIRMATION SUMMARY CARD */}
            {selectedShift && selectedRoute && selectedStop && (
              <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 space-y-2 text-xs animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Transport Allocation Confirmation Summary</span>
                </div>
                <div className="space-y-1 text-[11px] text-emerald-900">
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Selected Shift:</span>
                    <span className="font-bold">{selectedShift.name} ({selectedShift.startTime} – {selectedShift.endTime})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Selected Route:</span>
                    <span className="font-bold">{formatRouteDisplay(selectedRoute)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-emerald-700">Designated Boarding Stop:</span>
                    <span className="font-bold text-emerald-950">
                      Stop #{selectedStop.sequenceNumber}: {selectedStop.stop.name}
                      {selectedStop.morningPickupTime ? ` (${selectedStop.morningPickupTime})` : ''}
                    </span>
                  </div>
                  {formData.passExpiryDate && (
                    <div className="flex justify-between pt-1 border-t border-emerald-200/60">
                      <span className="text-emerald-700">Pass Expiry Date:</span>
                      <span className="font-bold text-emerald-950">
                        {new Date(formData.passExpiryDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* OFFICIAL COLLEGE TRANSPORT INFORMATION LINK */}
            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200/80 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center shrink-0 text-sky-700">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-bold text-sky-950">
                  Know more about college transport routes
                </p>
                <p className="text-[11px] text-sky-800 leading-relaxed">
                  Visit the official K. K. Wagh transport facilities page for additional route information.
                </p>
                <a
                  href="https://www.kkwagh.edu.in/engineering/transport-facilities"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-700 hover:text-sky-900 underline mt-0.5"
                >
                  <span>https://www.kkwagh.edu.in/engineering/transport-facilities</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* 4. OPTIONAL FEE RECEIPT UPLOAD */}
            <div className="pt-2 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-sky-700" />
                  <span>College Transport Fee Receipt</span>
                  <span className="text-[10px] font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Optional
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">PDF, JPG, PNG up to 5MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="hidden"
                id="receipt-file-input"
              />

              {!formData.feeReceiptFile ? (
                <label
                  htmlFor="receipt-file-input"
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50/60 hover:bg-sky-50/30 rounded-2xl cursor-pointer transition-colors text-center group"
                >
                  <Upload className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors mb-1" />
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-sky-900">
                    Click to select or drag & drop fee receipt
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Attach bank deposit slip, online UPI receipt or office counter receipt
                  </span>
                </label>
              ) : (
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 truncate">
                        {formData.feeReceiptName}
                      </p>
                      <p className="text-[10px] text-emerald-700">
                        {((formData.feeReceiptSize || 0) / 1024).toFixed(1)} KB · Ready for upload
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="receipt-file-input"
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-[11px] font-semibold cursor-pointer transition-colors"
                    >
                      Replace
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveReceipt}
                      aria-label="Remove receipt file"
                      className="p-1 rounded-lg text-emerald-700 hover:text-rose-700 hover:bg-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {errors.receipt && <p className="text-[11px] text-rose-600 mt-1">{errors.receipt}</p>}
            </div>
          </div>
        )}

        {/* Navigation & Submit Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{step === 1 ? 'Cancel' : 'Previous Step'}</span>
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <span>Continue to Step {step + 1}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Registration</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
