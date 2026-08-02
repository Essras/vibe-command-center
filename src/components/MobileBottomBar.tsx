'use client';

import React from 'react';
import { Project, FavoriteModel } from '@/lib/db';
import {
  MessageSquare,
  Code,
  Plus,
  Coins,
} from 'lucide-react';

interface MobileBottomBarProps {
  activeTab: 'chat' | 'editor';
  onTabChange: (tab: 'chat' | 'editor') => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenProjectModal: () => void;
  favoriteModels: FavoriteModel[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  currentUser?: { username: string; role: 'admin' | 'member'; creditsBalance: number };
  onOpenMemberUsage?: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab,
  onTabChange,
  projects,
  activeProjectId,
  onSelectProject,
  onOpenProjectModal,
  favoriteModels,
  activeModelId,
  onSelectModel,
  currentUser,
  onOpenMemberUsage,
}) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur-xl border-t border-gray-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl">
      {/* 1. Chat Tab */}
      <button
        onClick={() => onTabChange('chat')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
          activeTab === 'chat'
            ? 'text-indigo-400 bg-indigo-500/10 font-bold'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <MessageSquare className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Chat</span>
      </button>

      {/* 2. Editor Tab */}
      <button
        onClick={() => onTabChange('editor')}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition cursor-pointer ${
          activeTab === 'editor'
            ? 'text-indigo-400 bg-indigo-500/10 font-bold'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <Code className="w-5 h-5" />
        <span className="text-[10px] mt-0.5 font-medium">Editor</span>
      </button>

      {/* 3. Project Workspace Quick Switcher */}
      <div className="flex flex-col items-center justify-center py-1 px-2">
        <div className="flex items-center space-x-1">
          <select
            value={activeProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="bg-gray-900 text-gray-200 text-[10px] font-bold rounded-lg px-2 py-1 border border-gray-800 focus:outline-none max-w-[90px] truncate"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-gray-900 text-gray-100">
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={onOpenProjectModal}
            className="p-1 rounded-lg bg-gray-900 text-gray-300 border border-gray-800 transition"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <span className="text-[9px] text-gray-500 font-medium mt-0.5">Workspace</span>
      </div>

      {/* 4. Model Selector */}
      <div className="flex flex-col items-center justify-center py-1 px-2">
        <select
          value={activeModelId}
          onChange={(e) => onSelectModel(e.target.value)}
          className="bg-gray-900 text-indigo-300 font-bold text-[10px] rounded-lg px-2 py-1 border border-gray-800 focus:outline-none max-w-[95px] truncate"
        >
          <option value="auto">✨ Auto</option>
          {currentUser?.role === 'admin' ? (
            favoriteModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))
          ) : (
            <>
              <option value="fast">⚡ Fast</option>
              <option value="balanced">⚖️ Balanced</option>
              <option value="reasoning">🧠 Reasoning</option>
              <option value="vision">👁️ Vision</option>
            </>
          )}
        </select>
        <span className="text-[9px] text-gray-500 font-medium mt-0.5">AI Engine</span>
      </div>

      {/* 5. Credits Quick Usage Button */}
      {onOpenMemberUsage && (
        <button
          onClick={onOpenMemberUsage}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition cursor-pointer"
        >
          <div className="flex items-center gap-0.5 font-bold font-mono text-[11px]">
            <Coins className="w-3.5 h-3.5" />
            <span>{(currentUser?.creditsBalance ?? 0).toLocaleString()}</span>
          </div>
          <span className="text-[9px] text-emerald-300/80 font-medium mt-0.5">Credits</span>
        </button>
      )}
    </div>
  );
};
