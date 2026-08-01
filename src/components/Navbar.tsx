'use client';

import React from 'react';
import { Project, FavoriteModel } from '@/lib/db';
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
  activeTab: 'chat' | 'editor';
  onTabChange: (tab: 'chat' | 'editor') => void;
  onLogout: () => void;
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
  activeTab,
  onTabChange,
  onLogout,
}) => {
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Workspace Selector */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-gray-100 flex items-center gap-1.5">
              <span>Vibe Command Center</span>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-gray-400">Hostinger VPS AI Hub</p>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-800 hidden md:block" />

        {/* Project Selector */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={activeProjectId}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-gray-800 text-gray-200 text-xs font-medium rounded-lg px-3 py-1.5 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8 appearance-none cursor-pointer hover:bg-gray-750 transition"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  📁 {p.name}
                </option>
              ))}
            </select>
            <FolderKanban className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          <button
            onClick={onOpenProjectModal}
            className="p-1.5 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition"
            title="จัดการโปรเจกต์ / Memory"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model Quick Selector Bar */}
      <div className="hidden lg:flex items-center space-x-1.5 bg-gray-950/70 p-1 rounded-xl border border-gray-800">
        <span className="text-[11px] text-gray-400 px-2 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          โมเดลโปรด:
        </span>
        {favoriteModels.map((m) => {
          const isActive = m.id === activeModelId;
          return (
            <button
              key={m.id}
              onClick={() => onSelectModel(m.id)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {m.name}
            </button>
          );
        })}
      </div>

      {/* Right Controls & Navigation */}
      <div className="flex items-center space-x-2">
        {/* Tab switcher */}
        <div className="bg-gray-800 p-1 rounded-lg flex border border-gray-700">
          <button
            onClick={() => onTabChange('chat')}
            className={`px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition ${
              activeTab === 'chat'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat Hub</span>
          </button>
          <button
            onClick={() => onTabChange('editor')}
            className={`px-3 py-1 text-xs rounded-md font-medium flex items-center gap-1.5 transition ${
              activeTab === 'editor'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Code Editor</span>
          </button>
        </div>

        {/* Member Management */}
        <button
          onClick={onOpenUsers}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition flex items-center gap-1 text-xs font-medium"
          title="จัดการสมาชิก & พาสเวิร์ด"
        >
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">สมาชิก</span>
        </button>

        {/* Tools & Skills */}
        <button
          onClick={onOpenSkills}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition"
          title="Custom Tools & MCP Skills"
        >
          <Wrench className="w-4 h-4 text-purple-400" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 transition flex items-center gap-1 text-xs font-medium"
          title="ตั้งค่า AI Providers & Models"
        >
          <Settings className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">ตั้งค่า AI</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-red-400 hover:bg-gray-700 border border-gray-700 transition"
          title="ออกจากระบบ"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
