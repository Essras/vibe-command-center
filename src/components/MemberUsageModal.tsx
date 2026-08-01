'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  CreditCard,
  Zap,
  Clock,
  History,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';

interface MemberUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { username: string; role: 'admin' | 'member'; creditsBalance: number };
}

export const MemberUsageModal: React.FC<MemberUsageModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [topupSuccess, setTopupSuccess] = useState<string | null>(null);

  const fetchUserStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/billing/user-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch user stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUserStats();
    }
  }, [isOpen]);

  const handleSimulateTopup = async (amount: number, credits: number) => {
    try {
      const res = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          creditsAdded: credits,
          paymentGateway: 'PromptPay QR',
          transactionId: 'TXN-' + Date.now(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTopupSuccess(`เติมเงินสำเร็จ! เพิ่ม +${credits} Credits เข้ากระเป๋าของคุณแล้ว`);
        setIsTopupOpen(false);
        fetchUserStats();
        setTimeout(() => setTopupSuccess(null), 4000);
      }
    } catch (e) {
      console.error('Topup failed', e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <span>กระเป๋าเงิน & สถิติการใช้งานส่วนตัว</span>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800/40">
                  MEMBER PORTAL
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                ตรวจสอบยอด Credit คงเหลือ, ปริมาณ Token ที่ใช้ไป และประวัติการหักเงิน
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-200">
          {topupSuccess && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-200 flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{topupSuccess}</span>
            </div>
          )}

          {/* Balance & Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Current Balance Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/80 to-gray-900 border border-emerald-500/40 space-y-2 shadow-lg">
              <div className="flex items-center justify-between text-emerald-300 font-semibold text-xs">
                <span>Credits คงเหลือ</span>
                <Coins className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                {(stats?.creditsBalance ?? currentUser?.creditsBalance ?? 100.0).toFixed(2)}{' '}
                <span className="text-xs font-bold text-emerald-400">CR</span>
              </div>
              <button
                onClick={() => setIsTopupOpen(true)}
                className="w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition cursor-pointer mt-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>เติมเงิน Credits</span>
              </button>
            </div>

            {/* Tokens Used Card */}
            <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-1">
              <div className="flex items-center justify-between text-gray-400 font-semibold text-xs">
                <span>Tokens ที่ใช้ไป</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold text-white font-mono pt-1">
                {(stats?.totalTokens || 0).toLocaleString()}{' '}
                <span className="text-xs font-normal text-gray-400">Tokens</span>
              </div>
              <div className="text-[10px] text-gray-400 pt-1">
                คำถามทั้งหมด: {stats?.requestCount || 0} ครั้ง
              </div>
            </div>

            {/* Total Spent Card */}
            <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-1">
              <div className="flex items-center justify-between text-gray-400 font-semibold text-xs">
                <span>Credits ที่หักสะสม</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl font-bold text-purple-300 font-mono pt-1">
                {(stats?.totalCreditsUsed || 0).toFixed(2)}{' '}
                <span className="text-xs font-normal text-gray-400">CR</span>
              </div>
              <div className="text-[10px] text-gray-400 pt-1">
                หักตามการใช้งานจริง (Pay-as-you-go)
              </div>
            </div>
          </div>

          {/* Top-up Package Modal Drawer */}
          {isTopupOpen && (
            <div className="p-4 rounded-2xl bg-gray-950 border border-indigo-500/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-indigo-300 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>เลือกแพ็กเกจเติมเงิน Credits (PromptPay / QR Code)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setIsTopupOpen(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  ปิด
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { price: 100, credits: 300, label: 'Starter Pack', desc: 'เหมาะสำหรับทดลองใช้งาน' },
                  { price: 300, credits: 1000, label: 'Popular Pack', desc: 'คุ้มค่าที่สุด! ยอดนิยม', popular: true },
                  { price: 500, credits: 2000, label: 'Pro Pack', desc: 'สำหรับสายโค้ดใช้ต่อเนื่อง' },
                ].map((pkg) => (
                  <button
                    key={pkg.price}
                    onClick={() => handleSimulateTopup(pkg.price, pkg.credits)}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                      pkg.popular
                        ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-md'
                        : 'bg-gray-900 border-gray-800 text-gray-200 hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{pkg.label}</span>
                        {pkg.popular && (
                          <span className="text-[9px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-bold">
                            HOT
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-black font-mono text-emerald-400 mt-1">
                        +{pkg.credits} <span className="text-xs font-normal">CR</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{pkg.desc}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-gray-800 flex justify-between items-center text-xs font-bold">
                      <span className="text-gray-300">ราคา: {pkg.price} ฿</span>
                      <span className="text-indigo-300 font-mono text-[11px]">เติมทันที ➔</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Usage History Log Stream */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-gray-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-400" />
                <span>ประวัติการใช้ Token & หัก Credit ล่าสุด</span>
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                แสดง 20 รายการล่าสุด
              </span>
            </h3>

            {loading ? (
              <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลประวัติ...</div>
            ) : !stats?.logs || stats.logs.length === 0 ? (
              <div className="p-8 border border-gray-850 rounded-2xl bg-gray-950 text-center text-gray-500 text-xs">
                ยังไม่มีประวัติการหัก Credit (ลองส่งคำสั่งพิมพ์แชทกับ AI เพื่อเริ่มนับการใช้งาน)
              </div>
            ) : (
              <div className="border border-gray-850 rounded-2xl bg-gray-950 overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-900 text-gray-400 font-semibold border-b border-gray-850 sticky top-0">
                    <tr>
                      <th className="p-2.5 pl-3">เวลา</th>
                      <th className="p-2.5">โหมดโมเดล</th>
                      <th className="p-2.5">Tokens (Prompt + Completion)</th>
                      <th className="p-2.5 pr-3 text-right">Credits ที่หัก</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850/60 font-mono text-gray-300">
                    {stats.logs.map((log: any, i: number) => (
                      <tr key={log.id || i} className="hover:bg-gray-900/50 transition">
                        <td className="p-2.5 pl-3 text-gray-400 text-[10px]">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td className="p-2.5 font-bold text-indigo-300">
                          {log.modelUsed}
                        </td>
                        <td className="p-2.5 text-gray-300">
                          {(log.promptTokens || 0) + (log.completionTokens || 0)} tkn
                        </td>
                        <td className="p-2.5 pr-3 text-right font-bold text-red-400">
                          -{(log.creditsDeducted || 0).toFixed(4)} CR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950 flex justify-between items-center text-gray-400 text-[11px]">
          <div className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>ระบบคำนวณและหัก Credit ปลอดภัย 100% (Pay-as-you-go)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-200 hover:bg-gray-700 transition font-medium text-xs cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
