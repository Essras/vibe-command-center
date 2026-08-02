'use client';

import React from 'react';
import { MessageSquare, Code } from 'lucide-react';

interface MobileBottomBarProps {
  activeTab: 'chat' | 'editor';
  onTabChange: (tab: 'chat' | 'editor') => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="md:hidden fixed bottom-2 left-0 right-0 z-40 flex justify-center pointer-events-none px-4">
      <div className="pointer-events-auto bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-full p-1 shadow-2xl flex items-center space-x-1 max-w-[240px] w-full border-gray-700/60 ring-1 ring-black/50">
        {/* 1. Chat Tab */}
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'chat'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>

        {/* 2. Editor Tab */}
        <button
          type="button"
          onClick={() => onTabChange('editor')}
          className={`flex-1 py-2 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'editor'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Editor</span>
        </button>
      </div>
    </div>
  );
};
