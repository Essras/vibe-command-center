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
    setFavorites([...favorites, newFav]);
    setNewModelId('');
    setNewModelName('');
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites(favorites.filter((f) => f.id !== id));
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
      const res = await fetch('/api/models/quota');
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
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProvider(p.id as any)}
                  className={`p-3 rounded-xl border text-left font-medium transition ${
                    selectedProvider === p.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800'
                  }`}
                >
                  <div className="font-semibold text-xs text-gray-100">{p.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{p.id.toUpperCase()} API</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. API Key Inputs */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <h3 className="font-semibold text-gray-200 flex items-center gap-1.5">
              <span>2. กรอก API Key สำหรับ {selectedProvider.toUpperCase()}</span>
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
                    placeholder="https://api.okmd.ai/v1"
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

          {/* 3. Favorite Models Manager */}
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200 flex items-center gap-1.5">
                <span>3. ⚙️ จัดการโมเดลโปรด (Favorite Models)</span>
              </h3>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs px-3 py-1 rounded-lg flex items-center space-x-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-medium">{fav.name}</span>
                  <span className="text-[10px] text-indigo-400">({fav.id})</span>
                  <button
                    onClick={() => handleRemoveFavorite(fav.id)}
                    className="text-gray-400 hover:text-red-400 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new favorite model form */}
            <div className="pt-2 border-t border-gray-850 flex items-center space-x-2">
              <input
                type="text"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                placeholder="Model ID (เช่น gemini-2.5-flash)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <input
                type="text"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="ชื่อแสดงผล (เช่น Gemini 2.5 Flash)"
                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddFavorite}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่ม</span>
              </button>
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
                หากส่ง Request แล้วเจอ HTTP Status 429 (Rate Limit ชั่วคราว) ระบบจะสลับไปใช้โมเดลโปรดลำดับถัดไปให้อัตโนมัติทันที
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
              <h4 className="font-bold text-xs text-purple-300">📊 Real-Time Quota Monitor Stats:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {Object.entries(quotaResult.data.quotas || {}).map(([key, val]: any) => (
                  <div key={key} className="p-2 rounded bg-gray-900 border border-gray-800">
                    <span className="font-semibold text-gray-200">{val.provider}:</span>
                    <span
                      className={`ml-2 font-mono ${
                        val.keyConfigured ? 'text-emerald-400' : 'text-gray-500'
                      }`}
                    >
                      {val.status}
                    </span>
                  </div>
                ))}
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
