'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Coins,
  Cpu,
  Users,
  RefreshCw,
  Zap,
  Activity,
  ShieldCheck,
  Plus,
  Minus,
  Sparkles,
  BarChart3,
  CreditCard,
  Clock,
  Layers,
} from 'lucide-react';

interface AdminDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  // Credit Adjustment State
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('50');

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching analytics dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDashboardData();
    }
  }, [isOpen]);

  const handleAdjustCredits = async (userId: string, amount: number) => {
    try {
      const res = await fetch('/api/admin/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust_credits',
          userId,
          amount,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchDashboardData();
        setAdjustingUserId(null);
      } else {
        alert('Error: ' + json.error);
      }
    } catch (err: any) {
      alert('Network Error: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-gray-950 border border-gray-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-850 flex items-center justify-between bg-gradient-to-r from-indigo-950/80 via-purple-950/60 to-gray-950">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>System Token Metering & Analytics Dashboard</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/30">
                  ADMIN MONITOR
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                วิเคราะห์ปริมาณการใช้งาน Token, ต้นทุนราคาทุน, สถิติแยกตามโมเดล และจัดการ Credits สมาชิก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 rounded-xl bg-gray-900 hover:bg-gray-850 text-gray-300 border border-gray-800 transition flex items-center gap-1 text-xs font-semibold"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-850 border border-gray-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 custom-scrollbar flex-1">
          {error && (
            <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/80 text-red-300 text-xs">
              ⚠️ {error}
            </div>
          )}

          {/* 1. TOP OVERVIEW METRICS (4 CARDS) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Tokens */}
            <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-850 hover:border-gray-750 transition-all shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">Total Tokens</span>
                <Cpu className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {data?.summary?.totalTokens?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>Prompt: {data?.summary?.totalPromptTokens?.toLocaleString() || 0}</span>
                <span>Completion: {data?.summary?.totalCompletionTokens?.toLocaleString() || 0}</span>
              </div>
            </div>

            {/* Card 2: Total Credits Deducted */}
            <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-850 hover:border-gray-750 transition-all shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">Credits Deducted</span>
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
                {data?.summary?.totalCreditsDeducted?.toFixed(2) || '0.00'}{' '}
                <span className="text-xs font-normal text-amber-500">CR</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                ต้นทุนรวมประมาณ: ${data?.summary?.totalCostInUSD?.toFixed(4) || '0.0000'} USD
              </div>
            </div>

            {/* Card 3: OpenRouter API Quota */}
            <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-850 hover:border-gray-750 transition-all shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">OpenRouter Quota</span>
                <CreditCard className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                {data?.providerQuotas?.openrouter?.balanceUSD !== null &&
                data?.providerQuotas?.openrouter?.balanceUSD !== undefined
                  ? `$${data.providerQuotas.openrouter.balanceUSD.toFixed(2)}`
                  : 'N/A'}
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {data?.providerQuotas?.openrouter?.configured
                  ? '🟢 Live API Quota Connected'
                  : '🔴 API Key Missing'}
              </div>
            </div>

            {/* Card 4: Active Users */}
            <div className="p-4 rounded-2xl bg-gray-900/80 border border-gray-850 hover:border-gray-750 transition-all shadow-sm">
              <div className="flex items-center justify-between text-gray-400 mb-2">
                <span className="text-xs font-semibold">Active Members</span>
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-white font-mono">
                {data?.summary?.userCount || 0}{' '}
                <span className="text-xs font-normal text-gray-400">Users</span>
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                จำนวนการเรียกใช้งาน: {data?.summary?.requestCount || 0} ครั้ง
              </div>
            </div>
          </div>

          {/* FREE MODELS & API QUOTA TRACKER WIDGET */}
          <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-850 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>ติดตามการใช้งานโมเดลฟรี & API Quotas (Free Model Quota Tracker)</span>
              </h3>
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/40 font-mono">
                Official Limits Monitor
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Google Gemini Free Tier Tracker */}
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-850/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Google Gemini (Free Tier)
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {data?.freeModelQuotas?.gemini?.rpdPct || 0}%
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-200 flex justify-between">
                  <span>วันนี้ใช้ไป: <strong>{data?.freeModelQuotas?.gemini?.rpdUsed || 0}</strong> / 1,500</span>
                  <span className="text-gray-400">RPD (Per Day)</span>
                </div>
                {/* Progress bar for Gemini Daily Quota */}
                <div className="w-full bg-gray-850 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    style={{ width: `${data?.freeModelQuotas?.gemini?.rpdPct || 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 font-mono flex justify-between pt-0.5">
                  <span>นาทีนี้: {data?.freeModelQuotas?.gemini?.rpmUsed || 0} / 15 RPM</span>
                  <span className="text-emerald-400">Google AI Studio</span>
                </div>
              </div>

              {/* OKMD AI Playground Tracker */}
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-850/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-400" />
                    OKMD AI Playground
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded">
                    Educational
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-200">
                  วันนี้ใช้ไป: <strong className="text-indigo-300 text-sm">{data?.freeModelQuotas?.okmd?.todayRequests || 0}</strong> ครั้ง
                </div>
                <div className="text-[10px] text-gray-400 pt-1">
                  โควต้า: {data?.freeModelQuotas?.okmd?.limitText || 'Unlimited Tier'}
                </div>
              </div>

              {/* OpenRouter Calls & Balance Tracker */}
              <div className="p-4 rounded-xl bg-gray-950 border border-gray-850/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-purple-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    OpenRouter (Free/Paid)
                  </span>
                  <span className="text-[10px] font-mono text-purple-300">
                    {data?.freeModelQuotas?.openrouter?.balanceUSD !== null && data?.freeModelQuotas?.openrouter?.balanceUSD !== undefined
                      ? `$${data.freeModelQuotas.openrouter.balanceUSD.toFixed(2)}`
                      : 'Active'}
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-200">
                  วันนี้ใช้ไป: <strong className="text-purple-300 text-sm">{data?.freeModelQuotas?.openrouter?.todayRequests || 0}</strong> ครั้ง
                </div>
                <div className="text-[10px] text-gray-400 pt-1">
                  รองรับโมเดลฟรีทั้งหมด + Custom Models
                </div>
              </div>
            </div>
          </div>

          {/* 2. MODEL CATEGORY USAGE BREAKDOWN (WIDGET) */}
          <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-850 space-y-3">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>การใช้งานแยกตาม Smart Model Category</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { label: 'FAST_MODEL', desc: 'GPT-4o Mini / Claude Haiku', color: 'from-amber-500 to-amber-600', key: 'FAST_MODEL' },
                { label: 'BALANCED_MODEL', desc: 'Claude Sonnet / DeepSeek Chat', color: 'from-indigo-500 to-purple-600', key: 'BALANCED_MODEL' },
                { label: 'REASONING_MODEL', desc: 'DeepSeek R1 / o3-mini', color: 'from-purple-500 to-pink-600', key: 'REASONING_MODEL' },
                { label: 'VISION_MODEL', desc: 'Claude Vision / GPT-4o Vision', color: 'from-emerald-500 to-teal-600', key: 'VISION_MODEL' },
              ].map((item) => {
                const catData = data?.categoryUsage?.[item.key] || { count: 0, credits: 0, tokens: 0 };
                const pct = data?.summary?.totalTokens
                  ? Math.min(100, Math.round((catData.tokens / data.summary.totalTokens) * 100))
                  : 0;

                return (
                  <div key={item.key} className="p-3.5 rounded-xl bg-gray-950 border border-gray-850/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-200">{item.label}</span>
                      <span className="text-xs font-mono font-bold text-indigo-300">{pct}%</span>
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{item.desc}</p>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-850 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-gray-400 font-mono pt-1">
                      <span>{catData.count} calls</span>
                      <span className="text-amber-400">{catData.credits.toFixed(2)} CR</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. USER / TENANT CREDIT LEDGER TABLE */}
          <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-850 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>บัญชีสมาชิก & ตารางติดตาม Credits (Tenant Ledger)</span>
              </h3>
              <span className="text-[11px] text-gray-400">
                แอดมินสามารถเติม/ปรับยอด Credits ให้สมาชิกได้ทันที
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-850">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-850">
                  <tr>
                    <th className="p-3">สมาชิก</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Credits Balance</th>
                    <th className="p-3">Tokens Used</th>
                    <th className="p-3">Credits Consumed</th>
                    <th className="p-3 text-right">ปรับยอด Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850/60 font-mono">
                  {data?.userSummaries?.map((user: any) => (
                    <tr key={user.id} className="hover:bg-gray-850/40 transition">
                      <td className="p-3 font-sans font-semibold text-gray-100 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center text-[10px]">
                          {user.username[0]?.toUpperCase()}
                        </div>
                        <span>{user.username}</span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-sans uppercase ${
                            user.role === 'admin'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                              : 'bg-gray-800 text-gray-400'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-amber-400">
                        {user.creditsBalance.toFixed(2)} CR
                      </td>
                      <td className="p-3 text-gray-300">
                        {user.totalTokens.toLocaleString()}
                      </td>
                      <td className="p-3 text-gray-400">
                        {user.totalCreditsUsed.toFixed(2)} CR
                      </td>
                      <td className="p-3 text-right font-sans">
                        {adjustingUserId === user.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              className="w-16 bg-gray-950 border border-gray-700 rounded px-2 py-1 text-xs text-white text-right focus:outline-none"
                            />
                            <button
                              onClick={() => handleAdjustCredits(user.id, Number(adjustAmount))}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                            >
                              + เพิ่ม
                            </button>
                            <button
                              onClick={() => handleAdjustCredits(user.id, -Number(adjustAmount))}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold"
                            >
                              - ลด
                            </button>
                            <button
                              onClick={() => setAdjustingUserId(null)}
                              className="px-1.5 py-1 text-gray-400 hover:text-white"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAdjustingUserId(user.id)}
                            className="px-2.5 py-1 rounded-lg bg-gray-850 hover:bg-gray-800 border border-gray-750 text-indigo-300 text-[11px] font-semibold transition"
                          >
                            ⚙️ ปรับ Credits
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. RECENT TOKEN USAGE ACTIVITY LOGS */}
          <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-850 space-y-3">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span>ประวัติการใช้งาน Token ล่าสุด (Token Usage Stream)</span>
            </h3>

            {data?.recentLogs && data.recentLogs.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-gray-850">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-950 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-850">
                    <tr>
                      <th className="p-3">เวลา</th>
                      <th className="p-3">โมเดลที่ใช้</th>
                      <th className="p-3">Prompt Tokens</th>
                      <th className="p-3">Completion Tokens</th>
                      <th className="p-3">Credits ที่หัก</th>
                      <th className="p-3">ผู้ใช้งาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850/60 font-mono text-[11px]">
                    {data.recentLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-850/40 transition">
                        <td className="p-3 text-gray-400 font-sans">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td className="p-3 font-semibold text-indigo-300">{log.modelUsed}</td>
                        <td className="p-3 text-gray-300">{log.promptTokens}</td>
                        <td className="p-3 text-gray-300">{log.completionTokens}</td>
                        <td className="p-3 text-amber-400 font-bold">-{log.creditsDeducted.toFixed(4)} CR</td>
                        <td className="p-3 text-gray-400 font-sans">{log.userId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-gray-500 bg-gray-950 rounded-xl border border-gray-850">
                ยังไม่มีประวัติการเรียกใช้งาน Token
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
