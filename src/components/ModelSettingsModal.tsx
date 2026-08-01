'use client';

import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Check,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Search,
} from 'lucide-react';
import { FavoriteModel, ProviderKeys } from '@/lib/db';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  keys: ProviderKeys;
  autoFallback429: boolean;
  favoriteModels: FavoriteModel[];
  onSaveSettings: (
    newKeys: ProviderKeys,
    newAutoFallback: boolean,
    newFavorites: FavoriteModel[]
  ) => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  keys,
  autoFallback429,
  favoriteModels,
  onSaveSettings,
}) => {
  const [selectedProvider, setSelectedProvider] = useState<
    'gemini' | 'openai' | 'claude' | 'openrouter' | 'okmd'
  >('gemini');

  const [formKeys, setFormKeys] = useState<ProviderKeys>({ ...keys });
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [fallbackChecked, setFallbackChecked] = useState<boolean>(autoFallback429);
  const [favorites, setFavorites] = useState<FavoriteModel[]>([...favoriteModels]);

  // New model form
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  // Live Fetched Models State & Search Filter
  const [liveModels, setLiveModels] = useState<{ id: string; name: string; provider: string; isFree?: boolean }[]>([]);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [modelSearchQuery, setModelSearchQuery] = useState('');

  // Test & Quota States
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    latency?: number;
  }>({ loading: false });

  const [quotaResult, setQuotaResult] = useState<{
    loading: boolean;
    data?: any;
    error?: string;
  }>({ loading: false });

  if (!isOpen) return null;

  const isProviderKeySet = (prov: string): boolean => {
    if (prov === 'gemini') return !!formKeys.geminiApiKey?.trim();
    if (prov === 'openai') return !!formKeys.openaiApiKey?.trim();
    if (prov === 'claude') return !!formKeys.claudeApiKey?.trim();
    if (prov === 'openrouter') return !!formKeys.openrouterApiKey?.trim();
    if (prov === 'okmd') return !!formKeys.okmdApiKey?.trim();
    return false;
  };

  const toggleShowKey = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleAddFavorite = () => {
    if (!newModelId.trim() || !newModelName.trim()) return;
    const newFav: FavoriteModel = {
      id: newModelId.trim(),
      name: newModelName.trim(),
      provider: selectedProvider,
    };
    if (!favorites.some((f) => f.id === newFav.id)) {
      setFavorites([...favorites, newFav]);
    }
    setNewModelId('');
    setNewModelName('');
  };

  const handleSelectLiveModel = (m: { id: string; name: string; provider: string }) => {
    const newFav: FavoriteModel = {
      id: m.id,
      name: m.name,
      provider: selectedProvider,
    };
    if (!favorites.some((f) => f.id === newFav.id)) {
      setFavorites([...favorites, newFav]);
    }
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(favorites.filter((f) => f.id !== id));
  };

  const handleFetchLiveModels = async () => {
    setFetchingLive(true);
    setLiveError('');
    setLiveModels([]);

    try {
      const res = await fetch('/api/models/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: selectedProvider }),
      });
      const data = await res.json();
      if (data.success && data.models) {
        setLiveModels(data.models);
      } else {
        setLiveError(data.error || 'ไม่สามารถดึงรายการโมเดลได้');
      }
    } catch (err: any) {
      setLiveError(err.message || 'เกิดข้อผิดพลาดในการดึงรายการโมเดล');
    } finally {
      setFetchingLive(false);
    }
  };

  const handleRunConnectionTest = async () => {
    setTestResult({ loading: true });
    try {
      const activeFav = favorites.find((f) => f.provider === selectedProvider) || favorites[0];
      const res = await fetch('/api/models/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: activeFav, keys: formKeys }),
      });
      const data = await res.json();
      setTestResult({
        loading: false,
        success: data.success,
        message: data.message,
        latency: data.latency,
      });
    } catch (err: any) {
      setTestResult({ loading: false, success: false, message: err.message });
    }
  };

  const handleFetchQuota = async () => {
    setQuotaResult({ loading: true });
    try {
      const res = await fetch('/api/models/quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys: formKeys }),
      });
      const data = await res.json();
      setQuotaResult({ loading: false, data });
    } catch (err: any) {
      setQuotaResult({ loading: false, error: err.message });
    }
  };

  const handleSave = () => {
    onSaveSettings(formKeys, fallbackChecked, favorites);
    onClose();
  };

  // Filter live models based on search query
  const filteredLiveModels = liveModels.filter((m) => {
    if (!modelSearchQuery.trim()) return true;
    const q = modelSearchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-gray-100">
              Advanced AI Provider & Model Management
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-gray-200">
          {/* 1. Provider Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">
              1. เลือก AI Provider (AI Provider Selection)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'gemini', name: 'Google Gemini (Native)' },
                { id: 'openai', name: 'OpenAI' },
                { id: 'claude', name: 'Anthropic Claude' },
                { id: 'openrouter', name: 'OpenRouter' },
                { id: 'okmd', name: 'OKMD AI PLAYGROUND' },
              ].map((p) => {
                const isKeyReady = isProviderKeySet(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelectedProvider(p.id as any);
                      setLiveModels([]);
                      setLiveError('');
                      setModelSearchQuery('');
                    }}
                    className={`p-3 rounded-xl border text-left font-medium transition relative ${
                      selectedProvider === p.id
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-gray-100">{p.name}</div>
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                          isKeyReady ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-500'
                        }`}
                        title={isKeyReady ? 'พร้อมใช้งาน (Key Configured)' : 'ยังไม่ได้ตั้งค่า API Key'}
                      />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <span>{p.id.toUpperCase()} API</span>
                      <span className={isKeyReady ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                        ({isKeyReady ? '🟢 เชื่อมต่อแล้ว' : '🔴 ยังไม่ใส่คีย์'})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. API Key Inputs */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <h3 className="font-semibold text-gray-200 flex items-center justify-between">
              <span>2. กรอก API Key สำหรับ {selectedProvider.toUpperCase()}</span>
              <span
                className={`text-[11px] px-2.5 py-0.5 rounded-full border font-bold ${
                  isProviderKeySet(selectedProvider)
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-red-950/80 border-red-500/50 text-red-300'
                }`}
              >
                {isProviderKeySet(selectedProvider) ? '🟢 Key Ready' : '🔴 Missing Key'}
              </span>
            </h3>

            {selectedProvider === 'gemini' && (
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['gemini'] ? 'text' : 'password'}
                    value={formKeys.geminiApiKey || ''}
                    onChange={(e) => setFormKeys({ ...formKeys, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('gemini')}
                    className="absolute right-3 top-2 text-gray-400 hover:text-white"
                  >
                    {showKeys['gemini'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {selectedProvider === 'openai' && (
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">OpenAI API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['openai'] ? 'text' : 'password'}
                    value={formKeys.openaiApiKey || ''}
                    onChange={(e) => setFormKeys({ ...formKeys, openaiApiKey: e.target.value })}
                    placeholder="sk-proj-..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('openai')}
                    className="absolute right-3 top-2 text-gray-400 hover:text-white"
                  >
                    {showKeys['openai'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {selectedProvider === 'claude' && (
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Anthropic Claude API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['claude'] ? 'text' : 'password'}
                    value={formKeys.claudeApiKey || ''}
                    onChange={(e) => setFormKeys({ ...formKeys, claudeApiKey: e.target.value })}
                    placeholder="sk-ant-..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('claude')}
                    className="absolute right-3 top-2 text-gray-400 hover:text-white"
                  >
                    {showKeys['claude'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {selectedProvider === 'openrouter' && (
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">OpenRouter API Key</label>
                <div className="relative">
                  <input
                    type={showKeys['openrouter'] ? 'text' : 'password'}
                    value={formKeys.openrouterApiKey || ''}
                    onChange={(e) => setFormKeys({ ...formKeys, openrouterApiKey: e.target.value })}
                    placeholder="sk-or-v1-..."
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('openrouter')}
                    className="absolute right-3 top-2 text-gray-400 hover:text-white"
                  >
                    {showKeys['openrouter'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {selectedProvider === 'okmd' && (
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">OKMD Base URL Endpoint</label>
                  <input
                    type="text"
                    value={formKeys.okmdBaseUrl || ''}
                    onChange={(e) => setFormKeys({ ...formKeys, okmdBaseUrl: e.target.value })}
                    placeholder="https://gen.ai.kku.ac.th/okmd/api/v1"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">OKMD API Key</label>
                  <div className="relative">
                    <input
                      type={showKeys['okmd'] ? 'text' : 'password'}
                      value={formKeys.okmdApiKey || ''}
                      onChange={(e) => setFormKeys({ ...formKeys, okmdApiKey: e.target.value })}
                      placeholder="okmd-key-..."
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('okmd')}
                      className="absolute right-3 top-2 text-gray-400 hover:text-white"
                    >
                      {showKeys['okmd'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Dynamic Live Fetching of Models from Provider */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-cyan-400" />
                <span>3. ดึงโมเดลที่เปิดทำงานอยู่จาก {selectedProvider.toUpperCase()}</span>
              </h3>
              <button
                type="button"
                onClick={handleFetchLiveModels}
                disabled={fetchingLive}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs flex items-center gap-1 transition shadow disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${fetchingLive ? 'animate-spin' : ''}`} />
                <span>{fetchingLive ? 'กำลังดึงข้อมูล...' : '🔍 ดึงรายการโมเดลทั้งหมด'}</span>
              </button>
            </div>

            {liveError && (
              <div className="p-2.5 bg-red-950/60 border border-red-500/40 rounded-lg text-red-300 text-[11px]">
                ⚠️ {liveError}
              </div>
            )}

            {liveModels.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    พบทั้งหมด <strong className="text-emerald-400">{liveModels.length}</strong> โมเดล (ค้นหาและคลิกเลือกเพื่อเพิ่ม):
                  </span>
                </div>

                {/* Instant Search Filter */}
                <div className="relative">
                  <input
                    type="text"
                    value={modelSearchQuery}
                    onChange={(e) => setModelSearchQuery(e.target.value)}
                    placeholder="🔍 ค้นหาโมเดล (พิมพ์ชื่อ เช่น grok, deepseek, free, gpt...)"
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                </div>

                <div className="max-h-56 overflow-y-auto border border-gray-800 rounded-lg p-2 bg-gray-900 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {filteredLiveModels.map((m) => {
                    const isAdded = favorites.some((f) => f.id === m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectLiveModel(m)}
                        className={`p-2 rounded-lg text-left border transition flex items-center justify-between ${
                          isAdded
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-semibold'
                            : 'bg-gray-950 border-gray-800 text-gray-200 hover:border-indigo-500 hover:bg-gray-800'
                        }`}
                      >
                        <div className="truncate mr-1">
                          <div className="font-bold text-xs truncate flex items-center gap-1">
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ${
                                m.isFree
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-cyan-950 text-cyan-400 border border-cyan-500/40'
                              }`}
                            >
                              {m.isFree ? 'FREE 🟢' : 'PAID 💳'}
                            </span>
                            <span className="truncate">{m.name.replace(/^\[(FREE|PAID).*?\]\s*/, '')}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono truncate">{m.id}</div>
                        </div>
                        {isAdded ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Plus className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Favorite Models List */}
            <div className="pt-3 border-t border-gray-850 space-y-2">
              <h4 className="font-semibold text-gray-200 text-xs">
                รายการโมเดลโปรดที่บันทึกไว้ในระบบ ({favorites.length} โมเดล)
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((fav) => {
                  const isReady = isProviderKeySet(fav.provider);
                  return (
                    <div
                      key={fav.id}
                      className={`border text-xs px-3 py-1 rounded-lg flex items-center space-x-2 transition ${
                        isReady
                          ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                          : 'bg-red-950/50 border-red-500/40 text-red-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isReady ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      <span className="font-medium">{fav.name}</span>
                      <span className="text-[10px] opacity-80">[{fav.provider.toUpperCase()}]</span>
                      <button
                        onClick={() => handleRemoveFavorite(fav.id)}
                        className="text-gray-400 hover:text-red-400 transition ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add custom favorite model form */}
              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="Model ID (เช่น gpt-4o)"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  placeholder="ชื่อแสดงผล"
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={handleAddFavorite}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มด้วยตนเอง</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Auto Fallback Switch logic on 429 Error */}
          <div className="bg-indigo-950/30 p-4 rounded-xl border border-indigo-500/30 flex items-start space-x-3">
            <input
              type="checkbox"
              id="fallback429"
              checked={fallbackChecked}
              onChange={(e) => setFallbackChecked(e.target.checked)}
              className="w-4 h-4 mt-0.5 text-indigo-600 rounded bg-gray-900 border-gray-700 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="fallback429" className="cursor-pointer">
              <span className="font-bold text-gray-100 text-xs block">
                [x] 🔄 สลับโมเดลในรายการโปรดให้อัตโนมัติเมื่อติด Rate Limit (429)
              </span>
              <span className="text-[11px] text-gray-400 mt-0.5 block leading-normal">
                หากส่ง Request แล้วเจอ HTTP Status 429 ระบบจะสลับไปใช้โมเดลโปรดลำดับถัดไปที่มี API Key ให้อัตโนมัติ
              </span>
            </label>
          </div>

          {/* 5. Testing & Quota Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleRunConnectionTest}
              disabled={testResult.loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-indigo-300 font-medium rounded-xl border border-gray-700 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>🔌 ทดสอบการเชื่อมต่อ (คีย์ + โมเดล)</span>
            </button>

            <button
              type="button"
              onClick={handleFetchQuota}
              disabled={quotaResult.loading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-purple-300 font-medium rounded-xl border border-gray-700 flex items-center gap-2 transition disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 text-purple-400" />
              <span>🔄 เช็คสถานะโควต้าเรียลไทม์ (Copilot)</span>
            </button>
          </div>

          {/* Test Result Display */}
          {testResult.message && (
            <div
              className={`p-3 rounded-xl border flex items-center space-x-2 ${
                testResult.success
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/50 border-red-500/40 text-red-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className="text-xs font-mono">{testResult.message}</span>
            </div>
          )}

          {/* Quota Monitor Display */}
          {quotaResult.data && (
            <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-2">
              <h4 className="font-bold text-xs text-purple-300">📊 Real-Time Quota & Connection Monitor Stats:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {Object.entries(quotaResult.data.quotas || {}).map(([key, val]: any) => {
                  const isReady = val.keyConfigured;
                  return (
                    <div
                      key={key}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                        isReady
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                          : 'bg-red-950/40 border-red-500/50 text-red-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isReady ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        <span className="font-bold">{val.provider}:</span>
                      </div>
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-black/40">
                        {isReady ? '🟢 เชื่อมต่อแล้ว (Ready)' : '🔴 ยังไม่มี API Key (Missing)'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-800 bg-gray-950 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition"
          >
            <Check className="w-4 h-4" />
            <span>บันทึกการตั้งค่า</span>
          </button>
        </div>
      </div>
    </div>
  );
};
