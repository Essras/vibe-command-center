'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderKanban, Save, Plus, Trash2, Brain } from 'lucide-react';
import { Project } from '@/lib/db';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string;
  onCreateProject: (proj: Partial<Project>) => void;
  onUpdateProject: (proj: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}) => {
  const [selectedId, setSelectedId] = useState<string>(activeProjectId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [vpsFolder, setVpsFolder] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const proj = projects.find((p) => p.id === selectedId);
    if (proj) {
      setName(proj.name);
      setDescription(proj.description || '');
      setSystemPrompt(proj.systemPrompt || '');
      setVpsFolder(proj.vpsFolder || './workspace');
    }
  }, [selectedId, projects]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (isCreating) {
      onCreateProject({
        name: name || 'โปรเจกต์ใหม่',
        description,
        systemPrompt,
        vpsFolder: vpsFolder || './workspace',
      });
    } else {
      onUpdateProject({
        id: selectedId,
        name,
        description,
        systemPrompt,
        vpsFolder,
      });
    }
    onClose();
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setName('โปรเจกต์ใหม่');
    setDescription('');
    setSystemPrompt('ผู้ช่วย Vibe Code และ Content Creator ส่วนตัว');
    setVpsFolder('./workspace');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
          <div className="flex items-center space-x-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-gray-100">
              Project & Workspace Management (GEMINI.md Memory)
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-gray-200">
          {/* Workspace Switcher */}
          <div className="flex items-center justify-between bg-gray-950 p-3 rounded-xl border border-gray-800">
            <div className="flex items-center space-x-2 flex-1">
              <span className="text-gray-400 font-semibold">เลือกโปรเจกต์:</span>
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setIsCreating(false);
                }}
                className="bg-gray-900 text-white rounded-lg px-3 py-1.5 border border-gray-700 font-medium"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartCreate}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างใหม่</span>
            </button>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1">ชื่อโปรเจกต์ (Project Name)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-medium mb-1">รายละเอียด (Description)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="เช่น คอนเทนต์ Facebook Page / LINE Bot Vibe Coding"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-medium mb-1">
                โฟลเดอร์เก็บไฟล์บน VPS (VPS Target Folder)
              </label>
              <input
                type="text"
                value={vpsFolder}
                onChange={(e) => setVpsFolder(e.target.value)}
                placeholder="./workspace/my-project"
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-purple-400" />
                <span>System Prompt & Personal Memory (คล้าย GEMINI.md)</span>
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={5}
                placeholder="ใส่กฎ ข้อมูลส่วนตัว สไตล์การตอบ หรือบริบทโปรเจกต์ที่ต้องการให้ AI จดจำ..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-white placeholder-gray-600 font-sans focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950 flex justify-between items-center">
          {!isCreating && projects.length > 1 ? (
            <button
              onClick={() => {
                if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์นี้?')) {
                  onDeleteProject(selectedId);
                  onClose();
                }
              }}
              className="text-red-400 hover:text-red-300 flex items-center gap-1 text-xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>ลบโปรเจกต์</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 text-xs"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 text-xs"
            >
              <Save className="w-4 h-4" />
              <span>{isCreating ? 'สร้างโปรเจกต์' : 'บันทึกการเปลี่ยนแปลง'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
