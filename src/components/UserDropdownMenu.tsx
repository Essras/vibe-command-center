'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Settings,
  Wrench,
  Users,
  BarChart3,
  Coins,
  LogOut,
  ChevronDown,
  Shield,
} from 'lucide-react';

interface UserDropdownMenuProps {
  currentUser?: { username: string; role: 'admin' | 'member'; creditsBalance: number };
  onOpenDashboard?: () => void;
  onOpenUsers?: () => void;
  onOpenSettings?: () => void;
  onOpenSkills?: () => void;
  onOpenMemberUsage?: () => void;
  onLogout: () => void;
}

export const UserDropdownMenu: React.FC<UserDropdownMenuProps> = ({
  currentUser,
  onOpenDashboard,
  onOpenUsers,
  onOpenSettings,
  onOpenSkills,
  onOpenMemberUsage,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-gray-900/90 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 transition duration-150 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer"
      >
        <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0">
          {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span className="font-bold text-gray-200 hidden xs:inline truncate max-w-[70px] sm:max-w-[110px]">
          {currentUser?.username || 'User'}
        </span>
        <span
          className={`text-[9px] px-1.5 py-0.2 rounded-md font-bold uppercase font-mono hidden md:inline-block ${
            isAdmin
              ? 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
              : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
          }`}
        >
          {currentUser?.role || 'member'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-gray-900/95 backdrop-blur-xl border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 divide-y divide-gray-800/60 animate-in fade-in zoom-in-95 duration-100">
          {/* Header Info */}
          <div className="px-4 py-3 bg-gray-950/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-md shrink-0">
                {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-100 truncate">
                  {currentUser?.username || 'User Account'}
                </p>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase font-mono ${
                      isAdmin
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                    }`}
                  >
                    {isAdmin ? 'System Admin' : 'Member'}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-0.5">
                    <Coins className="w-3 h-3 text-emerald-400" />
                    {(currentUser?.creditsBalance ?? 0).toLocaleString()} Cr
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Member Controls */}
          <div className="py-1">
            {onOpenMemberUsage && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenMemberUsage();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-200 hover:bg-gray-800/80 hover:text-white flex items-center space-x-2.5 transition cursor-pointer"
              >
                <Coins className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>สถิติการใช้งาน & เติมเงิน</span>
              </button>
            )}

            {onOpenSkills && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSkills();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-200 hover:bg-gray-800/80 hover:text-white flex items-center space-x-2.5 transition cursor-pointer"
              >
                <Wrench className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Tools & Skills</span>
              </button>
            )}
          </div>

          {/* Admin Management Section */}
          {isAdmin && (
            <div className="py-1">
              <div className="px-4 py-1 text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>เมนูผู้ดูแลระบบ (Admin)</span>
              </div>

              {onOpenDashboard && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDashboard();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-purple-200 hover:bg-purple-950/40 hover:text-purple-100 flex items-center space-x-2.5 transition cursor-pointer"
                >
                  <BarChart3 className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Dashboard & Metering</span>
                </button>
              )}

              {onOpenUsers && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenUsers();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-200 hover:bg-gray-800/80 hover:text-white flex items-center space-x-2.5 transition cursor-pointer"
                >
                  <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>จัดการสมาชิก & พื้นที่ใช้งาน</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-200 hover:bg-gray-800/80 hover:text-white flex items-center space-x-2.5 transition cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>ตั้งค่า AI Provider Keys</span>
                </button>
              )}
            </div>
          )}

          {/* Logout */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full px-4 py-2 text-left text-xs font-semibold text-red-400 hover:bg-red-950/30 hover:text-red-300 flex items-center space-x-2.5 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-red-400 shrink-0" />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
