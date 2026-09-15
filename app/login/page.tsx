'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'employee' | 'manager'>('employee');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google login failed');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        alert('Account created! Please sign in.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        router.push('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#161b22] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl">
        {/* Top Brand Header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="bg-[#ff5722] text-white text-xs font-black px-2.5 py-1 rounded">
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
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
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
            className={`py-2 text-sm font-semibold rounded-lg transition-all ${
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
            ? 'Access restricted to official Exampur management accounts.'
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
          Continue with Exampur Google Workspace
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
            {/* Divider */}
            <div className="relative flex items-center justify-center mb-6">
              <div className="border-t border-gray-700 w-full"></div>
              <span className="bg-[#161b22] px-3 text-[10px] font-bold text-gray-500 tracking-wider uppercase absolute">
                OR WITH PASSWORD
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  EMAIL ADDRESS
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

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  PASSWORD
                </label>
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
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition focus:outline-none"
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
                className="w-full bg-[#ff5722] hover:bg-[#f4511e] disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition shadow-lg mt-2 cursor-pointer"
              >
                {loading
                  ? 'Verifying...'
                  : isSignUp
                  ? 'Create Employee Account'
                  : 'Sign In with Email'}
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
                    className="text-[#ff5722] hover:underline font-semibold"
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
                    className="text-[#ff5722] hover:underline font-semibold"
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
    </div>
  );
}