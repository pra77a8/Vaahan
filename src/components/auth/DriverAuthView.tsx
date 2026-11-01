import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, AlertCircle, Phone, Car, ShieldAlert, Key, X, CheckCircle2 } from 'lucide-react';
import { KKWaghLogo } from '../common/KKWaghLogo';
import { DriverProfile } from '../../types';
import { authenticateUser, requestPasswordReset } from '../../services/authService';

interface DriverAuthViewProps {
  onLoginSuccess: (driver: DriverProfile) => void;
}

export const DriverAuthView: React.FC<DriverAuthViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setResetError('Please enter your authorized driver email.');
      return;
    }
    setResetLoading(true);
    const res = await requestPasswordReset(resetEmail, 'driver');
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
      setErrorMessage('Please enter your authorized driver email and access pin.');
      return;
    }

    setLoading(true);

    try {
      const res = await authenticateUser(email, password, 'driver');
      if (!res.success || !res.profile) {
        setErrorMessage(
          res.error ||
            'Driver authentication failed. Please verify that your account has been provisioned by the Transport Administration.'
        );
        setLoading(false);
        return;
      }

      onLoginSuccess(res.profile as DriverProfile);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during driver authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-800">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-3.5 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <KKWaghLogo size="md" showSubtitle={true} />
          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-amber-600" /> Fleet Desk: 0253-2512876
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-amber-700 font-semibold">Driver Transit Console</span>
          </div>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 animate-in fade-in">
          {/* Header */}
          <div className="text-center space-y-1.5 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
              <Car className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Driver Console Login
            </h1>
            <p className="text-xs text-slate-500">
              Official Trip Management & Live Telemetry Console for KKWIEER Bus Fleet
            </p>
          </div>

          <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Driver accounts are created and invited exclusively by the Transport Cell. Public driver
              registration is prohibited.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label htmlFor="driver-email" className="text-xs font-bold text-slate-700 block mb-1.5">
                Authorized Driver Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="driver-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ramesh.patil.driver@kkwagh.edu.in"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="driver-password" className="text-xs font-bold text-slate-700">
                  Driver Security PIN / Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetError(null);
                    setResetMessage(null);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-semibold text-amber-700 hover:underline"
                >
                  Forgot PIN / Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="driver-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter assigned password or PIN"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:bg-white transition-all"
                />
              </div>
            </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 mt-2"
              >
                <span>{loading ? 'Verifying Authorization...' : 'Access Driver Console'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
                <div>
                  <span>Are you a Transport Officer? </span>
                  <a
                    href="/management-vaahan"
                    className="text-emerald-700 font-extrabold hover:underline"
                  >
                    Go to Admin Portal Sign In
                  </a>
                </div>
                <div>
                  <span>Student rider? </span>
                  <a
                    href="/"
                    className="text-sky-700 font-semibold hover:underline"
                  >
                    Student Transit Portal
                  </a>
                </div>
              </div>
            </form>
          </div>
        </main>

      {/* Forgot PIN / Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">Reset Driver PIN / Password</h3>
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
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
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
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                  Enter your registered driver email address. You will receive a secure password reset link. Alternatively, you may contact the Transport Administration desk for an instant administrative PIN reset.
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Driver Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="ramesh.patil.driver@kkwagh.edu.in"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs font-medium text-slate-900 focus:outline-hidden focus:border-amber-500 focus:bg-white"
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
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500 text-center">
        <p className="font-semibold text-slate-700">
          Karmaveer Kakasaheb Wagh Education Society (KKWES), Nashik
        </p>
      </footer>
    </div>
  );
};
