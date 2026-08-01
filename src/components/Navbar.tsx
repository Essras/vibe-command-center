'use client';

import React from 'react';
import { Project, FavoriteModel, ProviderKeys } from '@/lib/db';
import {
  FolderKanban,
  Settings,
  Wrench,
  Code,
  MessageSquare,
  Plus,
  LogOut,
  Sparkles,
  Zap,
  Users,
  ChevronDown,
  BarChart3,
} from 'lucide-react';

interface NavbarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenProjectModal: () => void;
  favoriteModels: FavoriteModel[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  onOpenSettings: () => void;
  onOpenSkills: () => void;
  onOpenUsers: () => void;
  onOpenDashboard?: () => void;
  activeTab: 'chat' | 'editor';
  onTabChange: (tab: 'chat' | 'editor') => void;
  onLogout: () => void;
  keys?: ProviderKeys;
  currentUser?: { username: string; role: 'admin' | 'member'; creditsBalance: number };
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenProjectModal,
  favoriteModels,
  activeModelId,
  onSelectModel,
  onOpenSettings,
  onOpenSkills,
  onOpenUsers,
  onOpenDashboard,
  activeTab,
  onTabChange,
  onLogout,
  keys,
  currentUser,
}) => {
  const activeModel = favoriteModels.find((m) => m.id === activeModelId);

  const isKeyConfigured = (provider: string): boolean => {
    if (!keys) return true;
    if (provider === 'gemini') return !!keys.geminiApiKey?.trim();
    if (provider === 'openai') return !!keys.openaiApiKey?.trim();
    if (provider === 'claude') return !!keys.claudeApiKey?.trim();
    if (provider === 'openrouter') return !!keys.openrouterApiKey?.trim();
    if (provider === 'okmd') return !!keys.okmdApiKey?.trim();
    return false;
  };

  // Group models by provider for clean dropdown presentation
  const providerGroups = favoriteModels.reduce((acc, m) => {
    const prov = m.provider.toUpperCase();
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push(m);
    return acc;
  }, {} as Record<string, FavoriteModel[]>);

  const activeReady = activeModel ? isKeyConfigured(activeModel.provider) : false;

  return (
    <header className="h-14 border-b border-gray-800/80 bg-gray-950/95 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between sticky top-0 z-30 shrink-0 select-none">
      {/* Brand & Project Selector */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
        {/* Compact Logo & Brand */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Zap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-100 hidden sm:inline-block tracking-tight whitespace-nowrap">
            Vibe Hub
          </span>
          <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.2 rounded border border-indigo-500/30 hidden md:inline-block">
            PRO
          </span>
        </div>

        <div className="h-5 w-px bg-gray-800 hidden sm:block shrink-0" />

        {/* Project Selector Dropdown */}
        <div className="flex items-center space-x-1 min-w-0">
          <div className="relative min-w-0">
            <select
              value={activeProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-gray-900 text-gray-200 text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1.5 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer hover:bg-gray-850 transition max-w-[130px] sm:max-w-[180px] md:max-w-[220px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-gray-900 text-gray-100">
                  📁 {p.name}
                </option>
              ))}
            </select>
            <FolderKanban className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-2 pointer-events-none shrink-0" />
          </div>

          <button
            onClick={onOpenProjectModal}
            className="p-1.5 rounded-lg bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800 transition shrink-0"
            title="เพิ่ม/จัดการโปรเจกต์ (GEMINI.md Memory)"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: Model Selector Dropdown */}
      <div className="flex items-center justify-center px-2 min-w-0 shrink">
        <div className="relative flex items-center bg-gray-900/90 border border-gray-800 rounded-xl px-2.5 py-1.5 hover:border-indigo-500/50 transition">
          <span
            className="w-2.5 h-2.5 rounded-full mr-1.5 shrink-0 bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse"
            title="ระบบ Smart Auto Router พร้อมใช้งาน"
          />
          <span className="text-[11px] text-gray-400 font-medium mr-1 hidden lg:inline-block whitespace-nowrap">
            โหมด AI:
          </span>
          <select
            value={activeModelId}
            onChange={(e) => onSelectModel(e.target.value)}
            className="bg-transparent text-gray-100 font-bold text-xs focus:outline-none cursor-pointer pr-5 appearance-none max-w-[140px] xs:max-w-[180px] sm:max-w-[240px] truncate"
          >
            <option value="auto" className="bg-gray-900 text-indigo-300 font-bold">
              ✨ Auto (ระบบเลือกให้อัตโนมัติ)
            </option>
            
            {currentUser?.role === 'admin' ? (
              // Admin: Can view raw models & categories
              Object.entries(providerGroups).map(([providerName, models]) => (
                <optgroup
                  key={providerName}
                  label={`── ${providerName} MODELS ──`}
                  className="bg-gray-900 text-indigo-300 font-semibold"
                >
                  {models.map((m) => {
                    const ready = isKeyConfigured(m.provider);
                    return (
                      <option key={m.id} value={m.id} className="bg-gray-900 text-gray-100 font-normal">
                        {ready ? '🟢' : '🔴'} {m.name} {ready ? '' : '(ยังไม่ใส่คีย์)'}
                      </option>
                    );
                  })}
                </optgroup>
              ))
            ) : (
              // Regular Members: Clean Smart Categories Only (No Raw Provider Names)
              <optgroup label="── หมวดหมู่โมเดลสมองกล ──" className="bg-gray-900 text-indigo-300 font-semibold">
                <option value="fast" className="bg-gray-900 text-gray-100 font-normal">
                  ⚡ FAST MODEL (โมเดลความเร็วสูง)
                </option>
                <option value="balanced" className="bg-gray-900 text-gray-100 font-normal">
                  ⚖️ BALANCED MODEL (โมเดลสมดุลความเร็ว-คุณภาพ)
                </option>
                <option value="reasoning" className="bg-gray-900 text-gray-100 font-normal">
                  🧠 REASONING MODEL (โมเดลวิเคราะห์เชิงลึก)
                </option>
                <option value="vision" className="bg-gray-900 text-gray-100 font-normal">
                  👁️ VISION MODEL (โมเดลอ่านและวิเคราะห์รูปภาพ)
                </option>
              </optgroup>
            )}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none shrink-0" />
        </div>
      </div>

      {/* Right Controls & Navigation */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Tab Switcher */}
        <div className="bg-gray-900 p-1 rounded-xl flex border border-gray-800">
          <button
            onClick={() => onTabChange('chat')}
            className={`px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1 transition ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Chat</span>
          </button>
          <button
            onClick={() => onTabChange('editor')}
            className={`px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1 transition ${
              activeTab === 'editor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Editor</span>
          </button>
        </div>

        {/* Admin-only controls */}
        {currentUser?.role === 'admin' && (
          <>
            {/* Admin Analytics & Token Metering Dashboard */}
            {onOpenDashboard && (
              <button
                onClick={onOpenDashboard}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-gradient-to-r from-purple-900/60 to-indigo-900/60 hover:from-purple-800 hover:to-indigo-800 text-purple-200 border border-purple-500/40 transition flex items-center gap-1 text-xs font-bold shadow-sm"
                title="ดู Dashboard โควต้าและปริมาณ Token Metering"
              >
                <BarChart3 className="w-4 h-4 text-purple-300" />
                <span className="hidden lg:inline">Dashboard</span>
              </button>
            )}

            {/* Member Management */}
            <button
              onClick={onOpenUsers}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800 transition flex items-center gap-1 text-xs font-semibold"
              title="จัดการสมาชิก"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="hidden lg:inline">สมาชิก</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800 transition flex items-center gap-1 text-xs font-semibold"
              title="ตั้งค่า AI Keys"
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span className="hidden lg:inline">ตั้งค่า</span>
            </button>
          </>
        )}

        {/* Skills */}
        <button
          onClick={onOpenSkills}
          className="p-1.5 sm:p-2 rounded-xl bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800 transition"
          title="Tools & Skills"
        >
          <Wrench className="w-4 h-4 text-purple-400" />
        </button>

        {/* Current Logged In User Profile Badge */}
        <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-gray-900 border border-gray-800 text-xs shrink-0 shadow-sm">
          <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 flex items-center justify-center font-bold text-[10px]">
            {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="font-bold text-gray-200 hidden sm:inline truncate max-w-[100px]">
            {currentUser?.username || 'User'}
          </span>
          <span
            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${
              currentUser?.role === 'admin'
                ? 'bg-purple-950 text-purple-300 border border-purple-800/40'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
            }`}
          >
            {currentUser?.role || 'member'}
          </span>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-1.5 sm:p-2 rounded-xl bg-gray-900 text-gray-400 hover:text-red-400 hover:bg-gray-800 border border-gray-800 transition"
          title="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
