'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      // Update user password via Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setSuccessMsg('Password successfully updated! Redirecting to login page...');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please try again or request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 max-w-md w-full shadow-2xl">
        
        {/* Brand Header */}
        <div className="mb-6">
          <div className="inline-block bg-[#ff5722] text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider mb-3 shadow-sm">
            EXAMPUR
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-[#ff5722]" /> Reset Password
          </h2>
          <p className="text-sm text-[#8b949e] mt-1 leading-relaxed">
            Establish a brand new secure password for your official account.
          </p>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 p-3.5 rounded-lg text-sm mb-5 shadow-inner">
            <span className="font-semibold block mb-0.5 tracking-wide">Error Notice</span>
            {errorMsg}
          </div>
        )}

        {/* Success Feedback */}
        {successMsg && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-3.5 rounded-lg text-sm mb-5 shadow-inner">
            <span className="font-semibold block mb-0.5 tracking-wide">Success</span>
            {successMsg}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5 tracking-wider">
              Account Email *
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-gray-400 cursor-not-allowed text-sm shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5 tracking-wider">
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] pr-14 transition text-sm shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-[#8b949e] hover:text-white transition cursor-pointer"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5 tracking-wider">
              Confirm New Password *
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition text-sm shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-md disabled:opacity-50 mt-3 cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin" /> Updating Password...
              </>
            ) : (
              'Update Password & Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}