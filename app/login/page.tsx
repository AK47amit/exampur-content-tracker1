'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<'employee' | 'admin'>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Google OAuth Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  // Regular Email/Password Auth
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Account created! Please sign in.');
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (selectedRole === 'admin' && profile?.role !== 'admin') {
          await supabase.auth.signOut();
          throw new Error('Access Denied: You do not have Admin privileges.');
        }

        window.location.href = selectedRole === 'admin' ? '/?tab=admin' : '/?tab=employee';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <span className="bg-orange-600 text-white font-bold px-2 py-0.5 rounded text-sm tracking-wider">
            EXAMPUR
          </span>
          <h2 className="text-xl font-semibold text-white tracking-wide">
            Content Operations
          </h2>
        </div>

        <div className="grid grid-cols-2 bg-[#1f2937] p-1 rounded-xl mb-6 border border-gray-700/60">
          <button
            type="button"
            onClick={() => { setSelectedRole('employee'); setErrorMsg(''); }}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${
              selectedRole === 'employee' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Employee Login
          </button>
          
          <button
            type="button"
            onClick={() => { setSelectedRole('admin'); setIsSignUp(false); setErrorMsg(''); }}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${
              selectedRole === 'admin' ? 'bg-orange-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Manager (Admin)
          </button>
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {selectedRole === 'admin' ? 'Manager Dashboard Access' : isSignUp ? 'Register as Employee' : 'Employee Sign In'}
        </h3>
        <p className="text-xs text-gray-400 mb-6">
          {selectedRole === 'admin' ? 'Only authorized managers can access review & approvals.' : 'Sign in with your official Exampur Google account.'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-600/50 rounded-lg text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Google Workspace Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-4 flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-2.5 px-4 rounded-lg shadow transition border border-gray-300 text-sm disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          {loading ? 'Connecting...' : 'Continue with Exampur Google Workspace'}
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#111827] px-2 text-gray-400">or with password</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@exampur.com"
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#1f2937] border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-2.5 rounded-lg shadow transition mt-2 disabled:opacity-50 text-sm cursor-pointer"
          >
            {loading ? 'Verifying...' : isSignUp ? 'Create Employee Account' : selectedRole === 'admin' ? 'Sign In as Manager' : 'Sign In with Email'}
          </button>
        </form>

        {selectedRole === 'employee' && (
          <div className="mt-6 text-center text-xs text-gray-400">
            {isSignUp ? 'Already have an account?' : 'Need a password-based account?'}{' '}
            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(''); }}
              className="text-orange-500 hover:underline font-semibold ml-1"
            >
              {isSignUp ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}