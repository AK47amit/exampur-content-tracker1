'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const officialEmail = email.trim().toLowerCase();
      const personalRecoveryEmail = recoveryEmail.trim().toLowerCase();

      if (isSignUp) {
        if (!personalRecoveryEmail) {
          throw new Error('Recovery email is required for employee registration.');
        }

        // 1. Register with Official Exampur ID as primary
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

        // 2. Force sign out so user cannot bypass and auto-login without checking recovery email
        await supabase.auth.signOut();

        // 3. Trigger Custom Nodemailer API to send email strictly to Recovery Email
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
            console.error('Failed to dispatch recovery notification email.');
          }
        } catch (mailErr) {
          console.error('Mail dispatch network error:', mailErr);
        }

        alert('Account created successfully! Verification details have been sent to your recovery email. Please check your recovery inbox.');
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setRecoveryEmail('');
      } else {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email: officialEmail,
          password,
        });

        if (error) throw error;

        if (data?.session) {
          router.push('/');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">
          {isSignUp ? 'Employee Registration' : 'Exampur Employee Login'}
        </h2>
        <p className="text-sm text-[#8b949e] mb-6 text-center">
          {isSignUp
            ? 'Register using your official Exampur ID'
            : 'Sign in with your official credentials'}
        </p>

        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-sm mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">
              Official Exampur ID
            </label>
            <input
              type="email"
              required
              placeholder="name@exampur.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">
                Personal Recovery Email
              </label>
              <input
                type="email"
                required
                placeholder="yourpersonal@gmail.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">
              Password
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold py-2.5 rounded-lg transition duration-200 shadow-md disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Register Employee' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="text-sm text-[#58a6ff] hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}