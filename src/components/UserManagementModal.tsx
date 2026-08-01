'use client';

import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Eye, EyeOff, KeyRound, Trash2, Check, Shield, User, Pencil } from 'lucide-react';
import { UserMember } from '@/lib/db';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<UserMember[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [editPasswords, setEditPasswords] = useState<Record<string, string>>({});

  // Role and Status Editing state
  const [editingUserRole, setEditingUserRole] = useState<string | null>(null);
  const [editRoleVal, setEditRoleVal] = useState<'admin' | 'member'>('member');
  const [editStatusVal, setEditStatusVal] = useState<'approved' | 'pending' | 'rejected'>('approved');

  // New user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [statusMsg, setStatusMsg] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleShowPassword = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrMsg('');
    setStatusMsg('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setErrMsg('กรุณากรอก Username และ Password');
      return;
    }

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          user: { username: newUsername.trim(), password: newPassword, role: newRole },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('เพิ่มสมาชิกใหม่เรียบร้อยแล้ว');
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        setErrMsg(data.error || 'เกิดข้อผิดพลาดในการสร้างสมาชิก');
      }
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  const handleUpdatePassword = async (id: string) => {
    const pwd = editPasswords[id];
    if (!pwd || !pwd.trim()) return;

    setErrMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', user: { id, password: pwd } }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('แก้ไขรหัสผ่านเรียบร้อยแล้ว');
        setEditPasswords((prev) => ({ ...prev, [id]: '' }));
        fetchUsers();
      } else {
        setErrMsg(data.error || 'เกิดข้อผิดพลาดในการแก้ไขรหัสผ่าน');
      }
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  const handleApproveUser = async (id: string) => {
    setErrMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', user: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('อนุมัติสมาชิกเรียบร้อยแล้ว');
        fetchUsers();
      } else {
        setErrMsg(data.error || 'เกิดข้อผิดพลาดในการอนุมัติสมาชิก');
      }
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  const handleRejectUser = async (id: string) => {
    setErrMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', user: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('ปฏิเสธสมาชิกเรียบร้อยแล้ว');
        fetchUsers();
      } else {
        setErrMsg(data.error || 'เกิดข้อผิดพลาดในการปฏิเสธสมาชิก');
      }
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  const handleSaveUserRoleStatus = async (id: string) => {
    setErrMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          user: { id, role: editRoleVal, status: editStatusVal },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('อัปเดตสิทธิ์และสถานะสมาชิกเรียบร้อยแล้ว');
        setEditingUserRole(null);
        fetchUsers();
      } else {
        setErrMsg(data.error || 'เกิดข้อผิดพลาดในการอัปเดต');
      }
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${username}" ?`)) return;

    setErrMsg('');
    setStatusMsg('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', user: { id } }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('ลบผู้ใช้เรียบร้อยแล้ว');
        fetchUsers();
      } else {
        setErrMsg(data.error || 'ไม่สามารถลบผู้ใช้ได้');
      }
    } catch (err: any) {
      setErrMsg(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-gray-100">
              หน้าจัดการสมาชิก & รหัสผ่าน (User & Member Management)
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-200">
          {statusMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs">
              ✓ {statusMsg}
            </div>
          )}
          {errMsg && (
            <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl text-red-300 text-xs">
              ⚠️ {errMsg}
            </div>
          )}

          {/* Form: Add New Member */}
          <form onSubmit={handleCreateUser} className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <h3 className="font-semibold text-gray-200 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              <span>เพิ่มสมาชิกใหม่ (Add New Member)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="เช่น vibe_user1"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="รหัสผ่าน"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Role (สิทธิ์)</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white font-medium"
                >
                  <option value="member">Member (ผู้ใช้ทั่วไป)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs flex items-center gap-1 shadow"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ เพิ่มสมาชิก</span>
              </button>
            </div>
          </form>

          {/* Members List Table */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-200 flex items-center justify-between">
              <span>รายชื่อสมาชิกในระบบ ({users.length} คน)</span>
              {users.some((u) => u.status === 'pending') && (
                <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold animate-pulse">
                  ⚠️ มี {users.filter((u) => u.status === 'pending').length} รายการรอการอนุมัติ
                </span>
              )}
            </h3>

            <div className="space-y-2">
              {users.map((u) => {
                const isShowingPwd = !!showPasswords[u.id];
                const isPending = u.status === 'pending';
                const isRejected = u.status === 'rejected';

                return (
                  <div
                    key={u.id}
                    className={`p-3 rounded-xl border space-y-2 flex flex-col transition ${
                      isPending
                        ? 'bg-amber-950/30 border-amber-500/50'
                        : isRejected
                        ? 'bg-red-950/30 border-red-500/50'
                        : 'bg-gray-950 border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">
                          {u.role === 'admin' ? <Shield className="w-4 h-4 text-purple-400" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-gray-100 text-xs">{u.username}</span>
                            <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700 font-mono flex items-center gap-1">
                              <span>{u.role.toUpperCase()}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingUserRole === u.id) {
                                    setEditingUserRole(null);
                                  } else {
                                    setEditingUserRole(u.id);
                                    setEditRoleVal(u.role);
                                    setEditStatusVal(u.status || 'approved');
                                  }
                                }}
                                className="text-gray-400 hover:text-indigo-300 transition"
                                title="คลิกปุ่มดินสอเพื่อแก้ไขสิทธิ์และสถานะสมาชิก"
                              >
                                <Pencil className="w-3 h-3 text-indigo-400 hover:scale-110 transition" />
                              </button>
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                isPending
                                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300'
                                  : isRejected
                                  ? 'bg-red-950/80 border-red-500/60 text-red-300'
                                  : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                              }`}
                            >
                              {isPending ? '🟡 รอการอนุมัติ' : isRejected ? '🔴 ถูกปฏิเสธ' : '🟢 อนุมัติแล้ว'}
                            </span>
                            {u.googleEmail && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-bold border bg-blue-950/80 border-blue-500/60 text-blue-300 flex items-center gap-1 font-mono"
                                title={`ผูกบัญชี Google: ${u.googleEmail}`}
                              >
                                <span>🔗 {u.googleEmail}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Inline Role & Status Editor Panel */}
                      {editingUserRole === u.id && (
                        <div className="p-2.5 bg-gray-900 border border-indigo-500/40 rounded-xl my-2 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="text-[10px] text-gray-400 block mb-0.5">เปลี่ยนสิทธิ์:</span>
                              <select
                                value={editRoleVal}
                                onChange={(e) => setEditRoleVal(e.target.value as any)}
                                className="bg-gray-950 border border-gray-700 text-white text-xs rounded px-2 py-1"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block mb-0.5">เปลี่ยนสถานะ:</span>
                              <select
                                value={editStatusVal}
                                onChange={(e) => setEditStatusVal(e.target.value as any)}
                                className="bg-gray-950 border border-gray-700 text-white text-xs rounded px-2 py-1"
                              >
                                <option value="approved">🟢 อนุมัติแล้ว (Approved)</option>
                                <option value="pending">🟡 รอการอนุมัติ (Pending)</option>
                                <option value="rejected">🔴 ถูกปฏิเสธ (Rejected)</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 pt-3">
                            <button
                              type="button"
                              onClick={() => handleSaveUserRoleStatus(u.id)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>บันทึกสิทธิ์</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingUserRole(null)}
                              className="px-2.5 py-1 bg-gray-800 text-gray-300 text-xs rounded-lg hover:bg-gray-700"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        {isPending && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleApproveUser(u.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold shadow flex items-center gap-1 transition"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>อนุมัติ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectUser(u.id)}
                              className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-[11px] font-bold shadow flex items-center gap-1 transition"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>ปฏิเสธ</span>
                            </button>
                          </div>
                        )}

                        {/* Old password reveal button */}
                        <button
                          type="button"
                          onClick={() => toggleShowPassword(u.id)}
                          className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-[11px] flex items-center gap-1 transition"
                          title="ดูพาสเวิร์ดเก่า"
                        >
                          {isShowingPwd ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-indigo-400" />}
                          <span>{isShowingPwd ? u.password : 'ดูพาสเวิร์ด'}</span>
                        </button>

                        {users.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="p-1 text-gray-500 hover:text-red-400 transition"
                            title="ลบสมาชิก"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Change Password Inline Input */}
                    <div className="pt-2 border-t border-gray-900 flex items-center space-x-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={editPasswords[u.id] || ''}
                          onChange={(e) =>
                            setEditPasswords({ ...editPasswords, [u.id]: e.target.value })
                          }
                          placeholder="พิมพ์รหัสผ่านใหม่เพื่อแก้ไข..."
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1 text-xs text-white placeholder-gray-600 pl-8"
                        />
                        <KeyRound className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdatePassword(u.id)}
                        disabled={!editPasswords[u.id]}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs flex items-center gap-1 transition disabled:opacity-40"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>บันทึกพาสเวิร์ดใหม่</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
