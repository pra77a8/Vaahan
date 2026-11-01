import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Phone, GraduationCap, Key, X, CheckCircle2 } from 'lucide-react';
import { KKWaghLogo } from '../common/KKWaghLogo';
import { StudentProfile } from '../../types';
import { authenticateUser, requestPasswordReset } from '../../services/authService';
import { StudentRegistrationWizard } from './StudentRegistrationWizard';

interface StudentAuthViewProps {
  onLoginSuccess: (student: StudentProfile) => void;
}

export const StudentAuthView: React.FC<StudentAuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredEmailNotice, setRegisteredEmailNotice] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);
    if (!resetEmail.trim()) {
      setResetError('Please enter your registered college email.');
      return;
    }
    setResetLoading(true);
    const res = await requestPasswordReset(resetEmail, 'student');
    setResetLoading(false);
    if (!res.success) {
      setResetError(res.error || 'Failed to dispatch reset email.');
    } else {
      setResetMessage(res.message || 'Password reset link sent to your email.');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both your college email and password.');
      return;
    }

    setLoading(true);

    try {
      const res = await authenticateUser(email, password, 'student');
      if (!res.success || !res.profile) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
        setLoading(false);
        return;
      }

      onLoginSuccess(res.profile as StudentProfile);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
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
            <span className="text-emerald-700 font-semibold">Student Transit Portal</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        {mode === 'signup' ? (
          <StudentRegistrationWizard
            onSuccess={(newEmail) => {
              setRegisteredEmailNotice(newEmail);
              setEmail(newEmail);
              setMode('signin');
            }}
            onCancel={() => setMode('signin')}
          />
        ) : (
          <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 animate-in fade-in">
            {/* Header */}
            <div className="text-center space-y-1.5 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center mx-auto shadow-xs">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Student Sign In
              </h1>
              <p className="text-xs text-slate-500">
                K. K. Wagh Institute Smart Bus Tracking & Digital Pass Portal
              </p>
            </div>

            {registeredEmailNotice && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <p className="font-bold">Application Received!</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Your registration for <strong>{registeredEmailNotice}</strong> was submitted. Sign in
                  below to review your pending verification status.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{errorMessage}</p>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label htmlFor="student-signin-email" className="text-xs font-bold text-slate-700 block mb-1.5">
                  College Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="student-signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pradhangle370125@kkwagh.edu.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Official @kkwagh.edu.in domain required
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="student-signin-password" className="text-xs font-bold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email);
                      setResetError(null);
                      setResetMessage(null);
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] font-semibold text-sky-700 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    id="student-signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 mt-2"
              >
                <span>{loading ? 'Verifying Account...' : 'Sign In as Student'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5 text-center text-xs text-slate-500">
                <div className="flex items-center justify-center gap-1.5 text-xs">
                  <span>New student rider?</span>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-sky-700 font-extrabold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded px-1"
                  >
                    Create Account
                  </button>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-500">
                  <a href="/driver" className="text-amber-700 font-semibold hover:underline">
                    Driver Console
                  </a>
                  <span className="text-slate-300">·</span>
                  <a href="/management-vaahan" className="text-emerald-700 font-semibold hover:underline">
                    Admin Portal
                  </a>
                </div>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Reset Student Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resetMessage ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{resetMessage}</p>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl bg-sky-700 text-white font-bold text-xs"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5 text-xs">
                {resetError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {resetError}
                  </div>
                )}
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Enter your registered college email address. A secure recovery link will be sent to your inbox to establish a new password.
                </p>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">College Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="student.name@kkwagh.edu.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-sky-500 focus:bg-white"
                  />
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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
