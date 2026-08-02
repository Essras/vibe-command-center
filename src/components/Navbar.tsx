'use client';

import React from 'react';
import { Project, FavoriteModel, ProviderKeys } from '@/lib/db';
import {
  FolderKanban,
  Code,
  MessageSquare,
  Plus,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { UserDropdownMenu } from './UserDropdownMenu';

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
  onOpenMemberUsage?: () => void;
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
  onOpenMemberUsage,
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

  const renderModelSelectOptions = () => {
    return (
      <>
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
          // Regular Members: Clean Smart Categories Only
          <optgroup label="── หมวดหมู่โมเดลสมองกล ──" className="bg-gray-900 text-indigo-300 font-semibold">
            <option value="fast" className="bg-gray-900 text-gray-100 font-normal">
              ⚡ FAST MODEL (โมเดลความเร็วสูง)
            </option>
            <option value="balanced" className="bg-gray-900 text-gray-100 font-normal">
              ⚖️ BALANCED MODEL (สมดุลความเร็ว-คุณภาพ)
            </option>
            <option value="reasoning" className="bg-gray-900 text-gray-100 font-normal">
              🧠 REASONING MODEL (วิเคราะห์เชิงลึก)
            </option>
            <option value="vision" className="bg-gray-900 text-gray-100 font-normal">
              👁️ VISION MODEL (วิเคราะห์รูปภาพ)
            </option>
          </optgroup>
        )}
      </>
    );
  };

  return (
    <div className="sticky top-0 z-30 shrink-0 select-none">
      {/* Primary Top Navbar */}
      <header className="h-14 border-b border-gray-800/80 bg-gray-950/95 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between">
        {/* Left: Brand & Workspace Selector */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
          {/* Brand Logo */}
          <div className="flex items-center space-x-1.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Zap className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
            </div>
            <span className="font-bold text-xs sm:text-sm text-gray-100 hidden xs:inline-block tracking-tight whitespace-nowrap">
              Vibe Hub
            </span>
            <span className="text-[9px] sm:text-[10px] bg-indigo-500/20 text-indigo-400 font-bold px-1.5 py-0.2 rounded border border-indigo-500/30 hidden lg:inline-block">
              PRO
            </span>
          </div>

          <div className="h-4 sm:h-5 w-px bg-gray-800 shrink-0" />

          {/* Workspace Selector Dropdown */}
          <div className="flex items-center space-x-1 min-w-0">
            <div className="relative min-w-0">
              <select
                value={activeProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-gray-900 text-gray-200 text-xs font-semibold rounded-lg pl-2.5 pr-7 py-1.5 border border-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 appearance-none cursor-pointer hover:bg-gray-850 transition max-w-[120px] xs:max-w-[140px] sm:max-w-[190px] md:max-w-[220px] truncate"
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
              className="p-1.5 rounded-lg bg-gray-900 text-gray-300 hover:bg-gray-800 border border-gray-800 transition shrink-0 cursor-pointer"
              title="เพิ่ม/จัดการโปรเจกต์ (GEMINI.md Memory)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Model Selector Dropdown (Desktop / Medium Screens >= 768px) */}
        <div className="hidden md:flex items-center justify-center px-2 min-w-0 shrink">
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
              className="bg-transparent text-gray-100 font-bold text-xs focus:outline-none cursor-pointer pr-5 appearance-none max-w-[160px] lg:max-w-[240px] truncate"
            >
              {renderModelSelectOptions()}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 pointer-events-none shrink-0" />
          </div>
        </div>

        {/* Right: Tab Switcher & User Dropdown Menu */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* Chat / Editor Tab Switcher */}
          <div className="bg-gray-900 p-0.5 sm:p-1 rounded-xl flex border border-gray-800">
            <button
              onClick={() => onTabChange('chat')}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="สลับไปหน้า แชท (Chat)"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => onTabChange('editor')}
              className={`px-2 sm:px-2.5 py-1 text-xs rounded-lg font-semibold flex items-center gap-1 transition cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="สลับไปหน้า แก้ไขโค้ด (Editor)"
            >
              <Code className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Editor</span>
            </button>
          </div>

          {/* Grouped User Profile & Settings Menu */}
          <UserDropdownMenu
            currentUser={currentUser}
            onOpenDashboard={onOpenDashboard}
            onOpenUsers={onOpenUsers}
            onOpenSettings={onOpenSettings}
            onOpenSkills={onOpenSkills}
            onOpenMemberUsage={onOpenMemberUsage}
            onLogout={onLogout}
          />
        </div>
      </header>

      {/* Mobile Sub-Header Toolbar: Dedicated Model Selector (Mobile Screens < 768px) */}
      <div className="md:hidden bg-gray-950/95 border-b border-gray-800/80 px-3 py-1.5 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center space-x-1.5 w-full min-w-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse shrink-0" />
          <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">โหมด AI:</span>
          <div className="relative flex-1 min-w-0">
            <select
              value={activeModelId}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full bg-gray-900 text-gray-100 font-bold text-xs rounded-lg pl-2 pr-6 py-1 border border-gray-800 focus:outline-none cursor-pointer appearance-none truncate"
            >
              {renderModelSelectOptions()}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-1.5 top-1.5 pointer-events-none shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};
