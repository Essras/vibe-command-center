'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, Lock, User, KeyRound, AlertCircle, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(urlError || '');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (urlError) {
      setError(urlError);
    }
  }, [urlError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Username หรือ Password ไม่ถูกต้อง');
      }
    } catch (err: any) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4 relative overflow-hidden text-gray-100">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-gray-900/90 border border-gray-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/30">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Vibe Command Center</h1>
            <p className="text-xs text-gray-400 mt-1">Personal AI & Vibe Code Web Hub for Hostinger VPS</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Username</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pl-10"
              />
              <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3.5 top-3.5 text-gray-500 hover:text-indigo-400 transition"
                title="คลิกเพื่อแสดง/ซ่อนรหัสผ่าน"
              >
                <KeyRound className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-white transition"
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-indigo-400" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 text-sm flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
          </button>
        </form>

        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-gray-800"></div>
          <span className="flex-shrink mx-4 text-[11px] text-gray-500 font-semibold">หรือ</span>
          <div className="flex-grow border-t border-gray-800"></div>
        </div>

        {/* Google OAuth Login Button */}
        <a
          href="/api/auth/google"
          className="w-full py-3 bg-gray-950 hover:bg-gray-850 border border-gray-750 text-white font-semibold rounded-xl shadow-md transition text-xs flex items-center justify-center gap-2.5 cursor-pointer text-gray-200"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span>เข้าสู่ระบบด้วย Google Account (Sign in with Google)</span>
        </a>

        <div className="mt-8 text-center text-[11px] text-gray-500 border-t border-gray-800/60 pt-4">
          Protected Web Console • HTTPS SSL • Hostinger VPS
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-gray-400 text-sm">
        กำลังโหลด...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
