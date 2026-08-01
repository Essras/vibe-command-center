'use client';

import React, { useState } from 'react';
import { Coins, Plus, QrCode, CreditCard, ShieldCheck, CheckCircle2, X } from 'lucide-react';

export interface CreditBalanceWidgetProps {
  initialCredits?: number;
  userId?: string;
  onBalanceUpdated?: (newBalance: number) => void;
}

export const CreditBalanceWidget: React.FC<CreditBalanceWidgetProps> = ({
  initialCredits = 100.0,
  userId = 'user-admin',
  onBalanceUpdated,
}) => {
  const [credits, setCredits] = useState<number>(initialCredits);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{ credits: number; priceTHB: number }>({
    credits: 500,
    priceTHB: 150,
  });
  const [paymentGateway, setPaymentGateway] = useState<'PromptPay' | 'Stripe' | 'Omise'>('PromptPay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Determine badge color status
  const getStatusColor = () => {
    if (credits > 20) return 'bg-emerald-400 text-emerald-400';
    if (credits >= 1) return 'bg-amber-400 text-amber-400';
    return 'bg-red-500 text-red-500';
  };

  const handleTopup = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/billing/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount: selectedPackage.priceTHB,
          creditsAdded: selectedPackage.credits,
          paymentGateway,
          transactionId: 'TX-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCredits(data.newBalance);
        if (onBalanceUpdated) onBalanceUpdated(data.newBalance);
        setSuccessMessage(`เติมเงินสำเร็จ! เพิ่ม +${selectedPackage.credits} Credits แล้ว`);
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMessage(null);
        }, 1800);
      } else {
        alert('เกิดข้อผิดพลาดในการเติมเงิน: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Network Error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Header Credit Widget */}
      <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-xl transition-all shadow-sm">
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Coins className="w-4 h-4 text-amber-400" />
            <span
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${getStatusColor()}`}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-medium leading-none">Credit Balance</span>
            <span className="text-xs font-bold text-gray-100 font-mono leading-tight mt-0.5">
              {credits.toFixed(2)} <span className="text-[10px] text-amber-400 font-normal">CR</span>
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="ml-1 px-2 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>เติมเงิน</span>
        </button>
      </div>

      {/* Top-up Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-850 flex items-center justify-between bg-gradient-to-r from-indigo-950/60 to-purple-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">เติมเงิน Credits สมาชิก</h3>
                  <p className="text-[11px] text-gray-400">คงเหลือปัจจุบัน: {credits.toFixed(2)} Credits</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-850 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {successMessage ? (
                <div className="p-6 text-center space-y-3 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                  <h4 className="text-base font-bold text-white">{successMessage}</h4>
                  <p className="text-xs text-emerald-300">ระบบอัปเดตยอดเงินในกระเป๋าของคุณเรียบร้อยแล้ว</p>
                </div>
              ) : (
                <>
                  {/* Select Credit Package */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      1. เลือกแพ็กเกจ Credit:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { credits: 100, priceTHB: 35 },
                        { credits: 500, priceTHB: 150 },
                        { credits: 1000, priceTHB: 280 },
                      ].map((pkg) => {
                        const isSelected = selectedPackage.credits === pkg.credits;
                        return (
                          <button
                            key={pkg.credits}
                            type="button"
                            onClick={() => setSelectedPackage(pkg)}
                            className={`p-3 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                                : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                            }`}
                          >
                            <span className="text-base font-extrabold text-amber-400 block font-mono">
                              +{pkg.credits}
                            </span>
                            <span className="text-[11px] text-gray-400 block mt-0.5">฿{pkg.priceTHB} THB</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Gateway Option */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-2">
                      2. ช่องทางชำระเงิน:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'PromptPay', label: 'PromptPay QR', icon: QrCode },
                        { id: 'Stripe', label: 'Stripe Credit', icon: CreditCard },
                        { id: 'Omise', label: 'Omise Pay', icon: ShieldCheck },
                      ].map((gw) => {
                        const Icon = gw.icon;
                        const isSelected = paymentGateway === gw.id;
                        return (
                          <button
                            key={gw.id}
                            type="button"
                            onClick={() => setPaymentGateway(gw.id as any)}
                            className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs ${
                              isSelected
                                ? 'bg-indigo-600/30 border-indigo-500 text-white font-semibold'
                                : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
                            }`}
                          >
                            <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-gray-400'}`} />
                            <span className="text-[11px]">{gw.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleTopup}
                    disabled={isProcessing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing
                      ? 'กำลังทำรายการชำระเงิน...'
                      : `ชำระเงิน ฿${selectedPackage.priceTHB} THB (รับ +${selectedPackage.credits} Credits)`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
