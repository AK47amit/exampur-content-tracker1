'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, Sparkles, KeyRound, Mail, X, Send } from 'lucide-react';

export default function LoginPage() {
  const [role, setRole] = useState<'employee' | 'manager'>('employee');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot / Reset Password Modal States
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');

  // 1. Google OAuth with Workspace Domain Hint
  const handleGoogleLogin = async () => {
    try {
      setErrorMsg('');
      const authOptions: any = {
        redirectTo: `${window.location.origin}/`,
        queryParams: {
          prompt: 'select_account',
        },
      };

      if (role === 'manager') {
        authOptions.queryParams.hd = 'exampur.com';
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: authOptions,
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google login failed');
    }
  };

  // 2. Email & Password Auth Handler with Custom Nodemailer & Secure Sign-Out Integration
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const officialEmail = email.trim().toLowerCase();
      const personalRecoveryEmail = recoveryEmail.trim().toLowerCase();

      if (isSignUp) {
        if (!personalRecoveryEmail) {
          setErrorMsg('Recovery email is mandatory for sign up.');
          setLoading(false);
          return;
        }

        if (personalRecoveryEmail === officialEmail) {
          setErrorMsg('Recovery email cannot be identical to your official Exampur ID.');
          setLoading(false);
          return;
        }

        // 1. Register with Official Exampur ID as primary, passing recovery email in metadata
        const { data, error } = await supabase.auth.signUp({
          email: officialEmail,
          password,
          options: {
            data: {
              recovery_email: personalRecoveryEmail,
            },
          },
        });

        if (error) throw error;

        // 2. Force sign out immediately to prevent unauthorized auto-login bypass
        await supabase.auth.signOut();

        // 3. Trigger Custom Nodemailer API to dispatch verification/welcome strictly to recovery email
        try {
          const mailRes = await fetch('/api/send-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              officialEmail: officialEmail,
              recoveryEmail: personalRecoveryEmail,
            }),
          });

          if (!mailRes.ok) {
            console.error('Failed to dispatch recovery notification email via API route.');
          }
        } catch (mailErr) {
          console.error('Mail dispatch network error:', mailErr);
        }

        alert('Account created successfully! Verification details have been sent to your recovery email inbox.');
        setIsSignUp(false);
        setPassword('');
        setRecoveryEmail('');
        setEmail('');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: officialEmail,
          password,
        });

        if (error) throw error;

        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  // 3. Forgot Password / Reset Link Sender
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetSuccessMsg('');
    setErrorMsg('');

    if (!forgotEmail.trim()) {
      alert('Please enter your email address.');
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) throw error;

      setResetSuccessMsg('Password reset instructions & verification link sent to your email!');
      setTimeout(() => {
        setShowForgotModal(false);
        setResetSuccessMsg('');
        setForgotEmail('');
      }, 4000);
    } catch (err: any) {
      alert('Error: ' + (err.message || 'Could not send reset email'));
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 relative">
      <div className="w-full max-w-md bg-[#161b22] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl">
        {/* Top Brand Header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="bg-[#ff5722] text-white text-xs font-black px-2.5 py-1 rounded tracking-wider">
            EXAMPUR
          </span>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Content Operations
          </h1>
        </div>

        {/* Role Toggle Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-[#21262d] p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setRole('employee');
              setErrorMsg('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              role === 'employee'
                ? 'bg-[#ff5722] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Employee Login
          </button>
          <button
            type="button"
            onClick={() => {
              setRole('manager');
              setIsSignUp(false);
              setErrorMsg('');
            }}
            className={`py-2 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              role === 'manager'
                ? 'bg-[#ff5722] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Manager (Admin)
          </button>
        </div>

        {/* Action Title */}
        <h2 className="text-xl font-bold text-white mb-1">
          {role === 'manager'
            ? 'Manager Authentication'
            : isSignUp
            ? 'Register as Employee'
            : 'Employee Sign In'}
        </h2>
        <p className="text-xs text-gray-400 mb-6">
          {role === 'manager'
            ? 'Access restricted strictly to @exampur.com Google Workspace accounts.'
            : 'Sign in with your official Exampur Google account or email.'}
        </p>

        {/* Google Workspace OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2.5 transition shadow-sm mb-6 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google Workspace
        </button>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Employee Only: Password Form & Create Account */}
        {role === 'employee' && (
          <>
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-gray-700 w-full"></div>
              <span className="bg-[#161b22] px-3 text-[10px] font-bold text-gray-500 tracking-wider uppercase absolute">
                OR WITH PASSWORD
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@exampur.com"
                  className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff5722] transition"
                />
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    RECOVERY EMAIL *
                  </label>
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    required
                    placeholder="personal@gmail.com"
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff5722] transition"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    PASSWORD *
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-[11px] text-[#ff5722] hover:underline font-semibold cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl pl-3.5 pr-11 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff5722] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition focus:outline-none cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff5722] hover:bg-[#f4511e] disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition shadow-lg mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Sparkles className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : isSignUp ? (
                  'Create Employee Account'
                ) : (
                  'Sign In with Email'
                )}
              </button>
            </form>

            <div className="text-center mt-6">
              {isSignUp ? (
                <p className="text-xs text-gray-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setErrorMsg('');
                    }}
                    className="text-[#ff5722] hover:underline font-semibold cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  Need a password-based account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setErrorMsg('');
                    }}
                    className="text-[#ff5722] hover:underline font-semibold cursor-pointer"
                  >
                    Create Account
                  </button>
                </p>
              )}
            </div>
          </>
        )}

        {/* Manager Note */}
        {role === 'manager' && (
          <div className="mt-4 p-3 bg-[#21262d]/50 border border-gray-800 rounded-xl text-center">
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Management access is strictly authenticated via Exampur Google Workspace OAuth.
            </p>
          </div>
        )}
      </div>

      {/* ================= FORGOT PASSWORD MODAL ================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#161b22] border border-gray-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#ff5722]/20 text-[#ff5722] rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Reset Password</h3>
                  <p className="text-[11px] text-gray-400">Receive password reset verification code & link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setResetSuccessMsg('');
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccessMsg && (
              <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 text-center font-medium">
                {resetSuccessMsg}
              </div>
            )}

            <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 uppercase font-bold tracking-wider mb-1.5">
                  Registered Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
                  <input
                    type="email"
                    required
                    placeholder="name@exampur.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full bg-[#0d1117] border border-gray-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#ff5722]"
                  />
                </div>
              </div>

              <p className="text-[11px] text-gray-400 leading-relaxed">
                We will email you a secure token & link. Click the link to verify your identity and establish a brand new password.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setResetSuccessMsg('');
                  }}
                  className="px-4 py-2 bg-[#21262d] hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingReset}
                  className="px-5 py-2 bg-[#ff5722] hover:bg-[#f4511e] text-white font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingReset ? 'Sending Verification...' : 'Send Recovery Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}