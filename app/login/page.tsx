'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'employee-login' | 'employee-signup' | 'admin'>('employee-login');
  
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

      if (activeTab === 'employee-signup') {
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

        // 2. Force sign out so user cannot auto-login without verifying recovery email
        await supabase.auth.signOut();

        // 3. Trigger Custom Nodemailer API to send email strictly to Recovery Email
        try {
          await fetch('/api/send-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              officialEmail: officialEmail,
              recoveryEmail: personalRecoveryEmail,
            }),
          });
        } catch (mailErr) {
          console.error('Mail dispatch network error:', mailErr);
        }

        alert('Account created successfully! Verification details have been sent to your recovery email. Please check your recovery inbox.');
        setActiveTab('employee-login');
        setEmail('');
        setPassword('');
        setRecoveryEmail('');
      } else {
        // Sign In Flow (For both Employee and Admin)
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
        
        {/* Top Header & Tabs matching original UI */}
        <div className="text-center mb-6">
          <span className="text-xs bg-[#ff5722]/10 text-[#ff5722] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider">
            EXAMPUR Content Operations
          </span>
          <h2 className="text-2xl font-bold text-white mt-3">
            {activeTab === 'admin' ? 'Manager (Admin) Login' : activeTab === 'employee-signup' ? 'Employee Registration' : 'Employee Login'}
          </h2>
          <p className="text-sm text-[#8b949e] mt-1">
            {activeTab === 'admin' 
              ? 'Sign in with administrator credentials' 
              : activeTab === 'employee-signup' 
              ? 'Register using your official Exampur ID' 
              : 'Sign in with your official Exampur account or email'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('employee-login'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${activeTab === 'employee-login' ? 'bg-[#ff5722] text-white shadow' : 'text-[#8b949e] hover:text-white'}`}
          >
            Employee Login
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('admin'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition ${activeTab === 'admin' ? 'bg-[#ff5722] text-white shadow' : 'text-[#8b949e] hover:text-white'}`}
          >
            Manager (Admin)
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-950/50 border border-red-800 text-red-300 p-3 rounded-lg text-sm mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1">
              {activeTab === 'admin' ? 'Admin Email' : 'Official Exampur ID'}
            </label>
            <input
              type="email"
              required
              placeholder={activeTab === 'admin' ? 'admin@exampur.com' : 'name@exampur.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff]"
            />
          </div>

          {activeTab === 'employee-signup' && (
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
            {loading ? 'Processing...' : activeTab === 'employee-signup' ? 'Register Employee' : 'Sign In'}
          </button>
        </form>

        {/* Bottom Toggle for Sign Up / Sign In */}
        {activeTab !== 'admin' && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab(activeTab === 'employee-signup' ? 'employee-login' : 'employee-signup');
                setErrorMsg('');
              }}
              className="text-sm text-[#58a6ff] hover:underline"
            >
              {activeTab === 'employee-signup' ? 'Already have an account? Sign In' : "Don't have an account? Register"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}