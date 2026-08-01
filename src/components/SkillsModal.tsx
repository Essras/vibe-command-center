'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Play,
  CheckCircle,
  Terminal,
  ShieldCheck,
  Globe,
  Lock,
  ExternalLink,
  Share2,
  FileText,
  Video,
  Info,
} from 'lucide-react';
import { ActionSkill } from '@/app/api/skills/route';

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({ isOpen, onClose }) => {
  const [skills, setSkills] = useState<ActionSkill[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'tools' | 'gdrive'>('gdrive');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/skills')
        .then((res) => res.json())
        .then((data) => {
          if (data.skills) setSkills(data.skills);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunSkill = async (skillId: string) => {
    setExecutingId(skillId);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillId, action: 'test_run' }),
      });
      const data = await res.json();
      if (data.output) {
        setLogs((prev) => [
          `[${new Date().toLocaleTimeString()}] ${data.output}`,
          ...prev,
        ]);
      }
    } catch (err: any) {
      setLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] Error: ${err.message}`,
        ...prev,
      ]);
    } finally {
      setExecutingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-100">
                Custom Tools & Action Skills Extensions (MCP Engine)
              </h2>
              <p className="text-[11px] text-gray-400">
                เครื่องมือขยายขีดความสามารถ AI, Google Drive Integration และสเปกความปลอดภัย
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 p-1 rounded-lg hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tab Bar */}
        <div className="flex border-b border-gray-800 bg-gray-950/60 px-6 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('gdrive')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'gdrive'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>📖 คู่มือแชร์ Google Drive & ความปลอดภัย</span>
          </button>

          <button
            onClick={() => setActiveTab('tools')}
            className={`pb-2.5 px-3 font-bold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'tools'
                ? 'border-indigo-500 text-indigo-300'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wrench className="w-4 h-4 text-purple-400" />
            <span>🛠️ รายการ MCP Tools ({skills.length})</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-gray-200">
          {activeTab === 'gdrive' ? (
            <div className="space-y-4">
              {/* Feature Introduction Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-indigo-950/80 to-purple-950/80 border border-emerald-500/40 flex items-start gap-3 shadow-lg">
                <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Google Drive Direct Link Extractor</span>
                    <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                      ACTIVE
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-200/90 mt-1 leading-relaxed">
                    คุณสามารถนำลิงก์ Google Drive (รูปภาพ, PDF, เอกสาร หรือวิดีโอ) มาวางในช่องแชท Vibe App ได้โดยตรง ระบบจะทำการสกัดข้อมูลและส่งให้ AI อ่านวิเคราะห์ให้อัตโนมัติทันที
                  </p>
                </div>
              </div>

              {/* Step 1: How to Share Guide */}
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-850 space-y-3">
                <h4 className="font-bold text-xs text-indigo-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <span>1. วิธีการตั้งค่าแชร์เอกสารใน Google Drive (Step-by-Step Sharing Guide):</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                    <div className="text-[10px] font-bold text-indigo-400 font-mono">STEP 1</div>
                    <div className="font-bold text-gray-200">เปิดปุ่ม "แชร์ (Share)"</div>
                    <p className="text-[10px] text-gray-400">
                      คลิกขวาที่ไฟล์ใน Google Drive ➔ เลือกเมนู <strong className="text-gray-300">"แชร์" (Share)</strong>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                    <div className="text-[10px] font-bold text-indigo-400 font-mono">STEP 2</div>
                    <div className="font-bold text-gray-200">เปลี่ยนสิทธิ์เข้าถึง</div>
                    <p className="text-[10px] text-gray-400">
                      ในช่อง General Access เลือกเปลี่ยนจาก <em>Restricted (จำกัด)</em> เป็น <strong className="text-emerald-400">"Anyone with the link (ทุกคนที่มีลิงก์)"</strong>
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 space-y-1">
                    <div className="text-[10px] font-bold text-indigo-400 font-mono">STEP 3</div>
                    <div className="font-bold text-gray-200">วางลิงก์ในแชท</div>
                    <p className="text-[10px] text-gray-400">
                      กด <strong className="text-gray-300">"คัดลอกลิงก์" (Copy Link)</strong> แล้วนำมาวางในช่องแชท Vibe App ได้เลย!
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Security & Privacy Standards */}
              <div className="p-4 rounded-2xl bg-gray-950 border border-gray-850 space-y-3">
                <h4 className="font-bold text-xs text-purple-300 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <span>2. มาตรฐานระดับความปลอดภัย & Data Privacy Standards:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-xl bg-gray-900 border border-emerald-500/30 space-y-1">
                    <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>🟢 Viewer Access Only (สิทธิ์อ่านอย่างเดียว ปลอดภัย 100%)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      สำหรับการวางลิงก์ในแชท ระบบจะอ่านข้อมูลเฉพาะสิทธิ์ <strong>"ผู้ดู (Viewer)"</strong> เท่านั้น <strong>ไม่สามารถแก้ไขหรือลบไฟล์</strong> ใน Google Drive ของคุณได้ 100% โดยไฟล์ผลลัพธ์ (รูปภาพ/วิดีโอ) สามารถกดดาวน์โหลดลงเครื่องได้ทันที
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900 border border-purple-500/30 space-y-1">
                    <div className="font-bold text-purple-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-purple-400" />
                      <span>🔒 Direct Download Output (ดาวน์โหลดตรงลงเครื่อง)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed">
                      ผลลัพธ์รูปภาพหรือวิดีโอที่สร้างเสร็จ จะมีปุ่มให้กดดาวน์โหลดลงคอมพิวเตอร์หรือมือถือของคุณโดยตรง โดยไม่ต้องเปิดสิทธิ์เขียนลง Google Drive ของคุณให้เสี่ยงต่อความปลอดภัย
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-400">
                รองรับการเพิ่ม Custom Tools / MCP Skills ให้ AI สั่งงาน VPS, เรียก Facebook Graph API หรือทำ RAG ค้นหาข้อมูล
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-4 bg-gray-950 border border-gray-800 rounded-xl flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-gray-100 text-xs">{skill.name}</span>
                        <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                          {skill.category.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{skill.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-900">
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Ready
                      </span>
                      <button
                        onClick={() => handleRunSkill(skill.id)}
                        disabled={executingId === skill.id}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium flex items-center gap-1 transition disabled:opacity-50"
                      >
                        <Play className="w-3 h-3" />
                        <span>{executingId === skill.id ? 'Running...' : 'ทดสอบ Tool'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Logs Output */}
              {logs.length > 0 && (
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
                  <div className="flex items-center space-x-1.5 text-purple-400 font-bold">
                    <Terminal className="w-4 h-4" />
                    <span>Tool Execution Console Output:</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-gray-300">
                    {logs.map((log, i) => (
                      <div key={i} className="py-0.5 border-b border-gray-900">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950 flex justify-between items-center text-xs">
          <div className="text-[11px] text-gray-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>กดวางลิงก์ Google Drive ในช่องแชทเพื่อเริ่มใช้งานได้ทันที</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 font-semibold"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
