import React, { useState } from 'react';
import {
  GraduationCap,
  Car,
  Shield,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Phone,
  Sparkles,
  Info,
} from 'lucide-react';
import { KKWaghLogo } from '../common/KKWaghLogo';
import { UserRole } from '../../types';
import { authenticateUser } from '../../services/authService';
import { StudentRegistrationWizard } from './StudentRegistrationWizard';

interface AuthScreenProps {
  onLoginSuccess: (role: UserRole, userProfile: any) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'student-signin' | 'student-signup' | 'driver-signin' | 'admin-signin'>('student-signin');

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success Confirmation State after Registration
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setLoading(true);

    const role: UserRole = activeTab === 'student-signin'
      ? 'student'
      : activeTab === 'driver-signin'
      ? 'driver'
      : 'admin';

    try {
      const res = await authenticateUser(email, password, role);
      if (!res.success || !res.profile) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }

      onLoginSuccess(role, res.profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handlePreFillEmail = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Top Institute Header Banner */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <KKWaghLogo size="md" showSubtitle={true} />
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-sky-600" /> Transport Cell: 0253-2512876
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 font-semibold">Campus Transit Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        {/* If in Registration Mode */}
        {activeTab === 'student-signup' ? (
          <StudentRegistrationWizard
            onSuccess={(newEmail) => {
              setRegisteredEmail(newEmail);
              setActiveTab('student-signin');
            }}
            onCancel={() => setActiveTab('student-signin')}
          />
        ) : (
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header / Brand */}
            <div className="bg-gradient-to-r from-sky-700 via-blue-700 to-sky-800 text-white p-6 sm:p-7 text-center relative">
              <div className="inline-block p-2 bg-white/10 backdrop-blur-md rounded-2xl mb-2 border border-white/20">
                {activeTab === 'student-signin' && <GraduationCap className="w-8 h-8 text-white" />}
                {activeTab === 'driver-signin' && <Car className="w-8 h-8 text-amber-300" />}
                {activeTab === 'admin-signin' && <Shield className="w-8 h-8 text-emerald-300" />}
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                {activeTab === 'student-signin' && 'Student Transit Portal'}
                {activeTab === 'driver-signin' && 'Driver Operational Console'}
                {activeTab === 'admin-signin' && 'Transport Administrator'}
              </h1>
              <p className="text-xs text-sky-100 mt-1 max-w-xs mx-auto">
                Sign in to manage bus passes, view live GPS routes, and access verified transit schedules.
              </p>
            </div>

            {/* Portal Role Switcher Tabs */}
            <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('student-signin');
                  setErrorMessage(null);
                  setEmail('');
                  setPassword('');
                }}
                className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === 'student-signin'
                    ? 'border-sky-600 text-sky-800 bg-white font-extrabold'
                    : 'border-transparent hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('driver-signin');
                  setErrorMessage(null);
                  setEmail('');
                  setPassword('');
                }}
                className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === 'driver-signin'
                    ? 'border-amber-600 text-amber-900 bg-white font-extrabold'
                    : 'border-transparent hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <Car className="w-3.5 h-3.5 text-amber-600" />
                <span>Driver</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin-signin');
                  setErrorMessage(null);
                  setEmail('');
                  setPassword('');
                }}
                className={`py-3 px-2 flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
                  activeTab === 'admin-signin'
                    ? 'border-emerald-600 text-emerald-900 bg-white font-extrabold'
                    : 'border-transparent hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin</span>
              </button>
            </div>

            {/* Registration Success Banner */}
            {registeredEmail && (
              <div className="m-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Registration Submitted Successfully!</p>
                  <p className="text-[11px] leading-relaxed text-emerald-800">
                    Your account has been submitted under <strong>{registeredEmail}</strong> with status <strong>Pending Administrator Approval</strong>.
                  </p>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    Please sign in below to monitor your verification status.
                  </p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mx-6 mt-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Sign In Failed</p>
                  <p className="mt-0.5 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="p-6 sm:p-7 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  {activeTab === 'student-signin' ? 'College Email (@kkwagh.edu.in)' : 'Registered Email Address'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      activeTab === 'student-signin'
                        ? 'studentname@kkwagh.edu.in'
                        : activeTab === 'driver-signin'
                        ? 'ramesh.patil.driver@kkwagh.edu.in'
                        : 'transport.admin@kkwagh.edu.in'
                    }
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Password</label>
                  <a
                    href="#forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Password recovery is handled via your official @kkwagh.edu.in institute mailbox. Contact the IT/Transport Cell if assistance is needed.');
                    }}
                    className="text-[11px] font-semibold text-sky-600 hover:underline"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Student Registration Callout */}
              {activeTab === 'student-signin' && (
                <div className="pt-4 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    First time student user?{' '}
                    <button
                      type="button"
                      onClick={() => setActiveTab('student-signup')}
                      className="text-sky-700 font-extrabold hover:underline"
                    >
                      Create Student Account
                    </button>
                  </p>
                </div>
              )}

              {/* Driver & Admin Note: No Public Registration */}
              {(activeTab === 'driver-signin' || activeTab === 'admin-signin') && (
                <div className="pt-3 border-t border-slate-100 text-center text-[11px] text-slate-400">
                  <p>
                    {activeTab === 'driver-signin'
                      ? 'Driver accounts are provisioned exclusively by Transport Office.'
                      : 'Administrator portal restricted to verified Transport Cell staff.'}
                  </p>
                </div>
              )}

              {/* Quick Institute Directory for Testing */}
              <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
                  Registered Institute Email Helper
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
                  {activeTab === 'student-signin' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handlePreFillEmail('priyanka.shinde@kkwagh.edu.in')}
                        className="px-2 py-1 rounded-md bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 font-medium"
                      >
                        Priyanka (Student)
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreFillEmail('pradhangle370125@kkwagh.edu.in')}
                        className="px-2 py-1 rounded-md bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 font-medium"
                      >
                        Prathamesh (Student)
                      </button>
                    </>
                  )}
                  {activeTab === 'driver-signin' && (
                    <button
                      type="button"
                      onClick={() => handlePreFillEmail('pranitadhangle908@gmail.com')}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-800 font-medium"
                    >
                      Pranit (Driver)
                    </button>
                  )}
                  {activeTab === 'admin-signin' && (
                    <button
                      type="button"
                      onClick={() => handlePreFillEmail('transport.admin@kkwagh.edu.in')}
                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 font-medium"
                    >
                      Prof. Gangurde (Admin)
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Institutional Light Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 text-center">
        <p className="font-semibold text-slate-700">
          Karmaveer Kakasaheb Wagh Education Society (KKWES), Nashik
        </p>
        <p className="text-[11px] text-slate-400 mt-1">
          Hirabai Haridas Vidyanagari, Amrutdham, Panchavati, Nashik - 422003 · Autonomous Institute
        </p>
      </footer>
    </div>
  );
};
