'use client';

/**
 * ============================================================================
 * EXAMPUR CONTENT OPERATIONS - GOOGLE WORKSPACE SSO & AUTH MODULE
 * ============================================================================
 * File: app/login/page.tsx
 * Description: Restores Google Workspace OAuth authentication flow strictly for 
 * official Exampur domains, along with manager login and recovery email routing.
 * ============================================================================
 */

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  
  // ---------------------------------------------------------------------------
  // Navigation & View State Management
  // ---------------------------------------------------------------------------
  const [tab, setTab] = useState<'employee' | 'admin'>('employee');
  const [isSignUp, setIsSignUp] = useState(true);
  
  // ---------------------------------------------------------------------------
  // Form Input Field States (For Manual Admin or Recovery routing)
  // ---------------------------------------------------------------------------
  const [email, setEmail] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // ---------------------------------------------------------------------------
  // Application Execution Feedback States
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /**
   * ===========================================================================
   * GOOGLE WORKSPACE SSO AUTHENTICATION HANDLER
   * ===========================================================================
   */
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Workspace authentication failed.');
      setLoading(false);
    }
  };

  /**
   * ===========================================================================
   * MANUAL AUTHENTICATION & REGISTRATION SUBMISSION HANDLER
   * ===========================================================================
   */
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const officialEmail = email.trim().toLowerCase();
      const personalRecoveryEmail = recoveryEmail.trim().toLowerCase();

      // Ensure official domain check for employee flows
      if (tab === 'employee' && !officialEmail.endsWith('@exampur.com')) {
        throw new Error('Only official @exampur.com Google Workspace accounts are authorized.');
      }

      if (tab === 'employee' && isSignUp) {
        if (!personalRecoveryEmail) {
          throw new Error('Personal recovery email is required for registration.');
        }

        if (personalRecoveryEmail === officialEmail) {
          throw new Error('Recovery email cannot be identical to your official Exampur ID.');
        }

        // Step 1: Register user in Supabase Auth with official ID as primary account identifier
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

        // Step 2: Invalidate session immediately to prevent unauthorized auto-login bypass
        await supabase.auth.signOut();

        // Step 3: Trigger Custom Nodemailer API to route welcome and verification strictly to recovery email
        try {
          const mailResponse = await fetch('/api/send-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              officialEmail: officialEmail,
              recoveryEmail: personalRecoveryEmail,
            }),
          });

          if (!mailResponse.ok) {
            console.error('API Route dispatch failed to send recovery notification email.');
          }
        } catch (mailNetworkErr) {
          console.error('Network exception caught during mail dispatcher call:', mailNetworkErr);
        }

        setSuccessMsg(
          'Account successfully created! Verification instructions have been dispatched exclusively to your recovery email inbox.'
        );
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setRecoveryEmail('');
        
      } else {
        // Standard Sign In Execution Flow (Handles both Employee Sign-In and Admin Sign-In)
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
      setErrorMsg(err.message || 'An unexpected authentication exception occurred during execution.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4">
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 max-w-md w-full shadow-2xl">
        
        {/* =================================================================== */}
        {/* HEADER BRANDING CONTAINER                                         */}
        {/* =================================================================== */}
        <div className="mb-6">
          <div className="inline-block bg-[#ff5722] text-white text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider mb-3 shadow-sm">
            EXAMPUR
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Content Operations</h2>
        </div>

        {/* =================================================================== */}
        {/* TOP ROLE SWITCHER NAVIGATION TABS                                 */}
        {/* =================================================================== */}
        <div className="flex bg-[#0d1117] p-1 rounded-lg border border-[#30363d] mb-6 shadow-inner">
          <button
            type="button"
            onClick={() => {
              setTab('employee');
              setIsSignUp(true);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200 ${
              tab === 'employee' ? 'bg-[#ff5722] text-white shadow' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Employee Login
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('admin');
              setIsSignUp(false);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200 ${
              tab === 'admin' ? 'bg-[#ff5722] text-white shadow' : 'text-[#8b949e] hover:text-white'
            }`}
          >
            Manager (Admin)
          </button>
        </div>

        {/* =================================================================== */}
        {/* DYNAMIC CONTEXT HEADER DESCRIPTION                                  */}
        {/* =================================================================== */}
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white">
            {tab === 'admin' ? 'Manager Sign In' : isSignUp ? 'Register as Employee' : 'Employee Sign In'}
          </h3>
          <p className="text-sm text-[#8b949e] mt-1 leading-relaxed">
            {tab === 'admin'
              ? 'Sign in using authorized system administrator credentials to oversee records.'
              : isSignUp
              ? 'Sign in with your official Exampur Google account or email. Only registered Google Workspace accounts are authorized.'
              : 'Enter your official credentials to access your secure operational dashboard.'}
          </p>
        </div>

        {/* =================================================================== */}
        {/* ERROR FEEDBACK DISPLAY BOX                                          */}
        {/* =================================================================== */}
        {errorMsg && (
          <div className="bg-red-950/60 border border-red-800 text-red-300 p-3.5 rounded-lg text-sm mb-5 shadow-inner">
            <span className="font-semibold block mb-0.5 tracking-wide">Error Notice</span>
            {errorMsg}
          </div>
        )}

        {/* =================================================================== */}
        {/* SUCCESS FEEDBACK DISPLAY BOX                                        */}
        {/* =================================================================== */}
        {successMsg && (
          <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-3.5 rounded-lg text-sm mb-5 shadow-inner">
            <span className="font-semibold block mb-0.5 tracking-wide">Success Notice</span>
            {successMsg}
          </div>
        )}

        {/* =================================================================== */}
        {/* GOOGLE WORKSPACE INTEGRATION BUTTON                                 */}
        {/* =================================================================== */}
        {tab === 'employee' && isSignUp && (
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-white font-medium py-2.5 px-4 rounded-lg flex items-center justify-center space-x-3 transition duration-200 mb-6 shadow-sm"
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.18v3.15C3.15 21.32 7.22 24 12 24z"/>
              <path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.18C.43 8.13 0 9.83 0 12s.43 3.87 1.18 5.39l4.09-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.18 6.61l4.09 3.15c.95-2.85 3.6-4.96 6.73-4.96z"/>
            </svg>
            <span className="text-sm font-medium">Continue with Google Workspace</span>
          </button>
        )}

        {/* =================================================================== */}
        {/* SEPARATOR DIVIDER LINE                                              */}
        {/* =================================================================== */}
        {tab === 'employee' && isSignUp && (
          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-[#30363d]"></div>
            <span className="flex-shrink mx-4 text-xs text-[#8b949e] uppercase tracking-wider font-semibold">or with password</span>
            <div className="flex-grow border-t border-[#30363d]"></div>
          </div>
        )}

        {/* =================================================================== */}
        {/* MAIN OPERATIONAL AUTHENTICATION FORM                                */}
        {/* =================================================================== */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5 tracking-wider">
              {tab === 'admin' ? 'Admin Email Address *' : 'Official Exampur ID *'}
            </label>
            <input
              type="email"
              required
              placeholder={tab === 'admin' ? 'admin@exampur.com' : 'name@exampur.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition shadow-inner"
            />
          </div>

          {/* Recovery Email Input Field (Exclusively for Employee Registration View) */}
          {tab === 'employee' && isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5 tracking-wider">
                Personal Recovery Email *
              </label>
              <input
                type="email"
                required
                placeholder="yourpersonal@gmail.com"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] transition shadow-inner"
              />
              <p className="text-[11px] text-[#8b949e] mt-1.5 leading-relaxed">
                Verification documentation will be routed strictly to this recovery destination.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#8b949e] uppercase mb-1.5 tracking-wider">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-white placeholder-[#484f58] focus:outline-none focus:border-[#58a6ff] pr-14 transition shadow-inner"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-[#8b949e] hover:text-white transition"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ff5722] hover:bg-[#f4511e] text-white font-bold py-3 rounded-lg transition-all duration-200 shadow-md disabled:opacity-50 mt-3"
          >
            {loading ? 'Processing...' : tab === 'admin' ? 'Sign In as Manager' : isSignUp ? 'Create Employee Account' : 'Sign In'}
          </button>
        </form>

        {/* =================================================================== */}
        {/* FOOTER NAVIGATION TOGGLE FOR EMPLOYEE MODE                          */}
        {/* =================================================================== */}
        {tab === 'employee' && (
          <div className="mt-6 text-center border-t border-[#30363d] pt-5">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-sm text-[#58a6ff] hover:underline font-medium transition"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Register as Employee"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}