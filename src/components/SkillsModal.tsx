'use client';

import React, { useState, useEffect } from 'react';
import { X, Wrench, Play, CheckCircle, Terminal, ShieldCheck } from 'lucide-react';
import { ActionSkill } from '@/app/api/skills/route';

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({ isOpen, onClose }) => {
  const [skills, setSkills] = useState<ActionSkill[]>([]);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
          <div className="flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-gray-100">
              Custom Tools & Action Skills Extensions (MCP Engine)
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-gray-200">
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

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
