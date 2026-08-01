'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, ChevronDown, Zap, Scale, Brain, Eye, Check } from 'lucide-react';
import { SUPPORTED_MODELS, ModelCategory, ModelDefinition, ALL_MODELS_LIST, routeModel } from '@/lib/ai/router';

export interface ModelBadgeSelectorProps {
  selectedModelId: string; // 'auto' or explicit model ID (e.g. 'claude-3-5-sonnet-20241022')
  onSelectModel: (modelId: string) => void;
  promptText?: string;
  hasImageAttachment?: boolean;
}

export const ModelBadgeSelector: React.FC<ModelBadgeSelectorProps> = ({
  selectedModelId,
  onSelectModel,
  promptText = '',
  hasImageAttachment = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuto = !selectedModelId || selectedModelId.toLowerCase() === 'auto';

  // Compute dynamic auto-routed preview model if in Auto mode
  const autoRoutePreview = routeModel({
    prompt: promptText,
    userOverrideModel: 'auto',
    hasImage: hasImageAttachment,
  });

  // Active selected model definition if explicitly chosen
  const activeExplicitModel = ALL_MODELS_LIST.find((m) => m.id === selectedModelId);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCategoryIcon = (category: ModelCategory) => {
    switch (category) {
      case 'FAST_MODEL':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'BALANCED_MODEL':
        return <Scale className="w-3.5 h-3.5 text-indigo-400" />;
      case 'REASONING_MODEL':
        return <Brain className="w-3.5 h-3.5 text-purple-400" />;
      case 'VISION_MODEL':
        return <Eye className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Interactive Badge Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 shadow-sm cursor-pointer select-none ${
          isAuto
            ? 'bg-gradient-to-r from-indigo-900/80 via-purple-900/80 to-indigo-950/90 text-indigo-200 border-indigo-500/40 hover:border-indigo-400/80 hover:shadow-indigo-500/20'
            : 'bg-gray-900/90 text-gray-200 border-gray-750 hover:border-gray-600 hover:bg-gray-850'
        }`}
        title="คลิกเพื่อเปลี่ยนโมเดล หรือเปิด Auto Router"
      >
        <Sparkles className={`w-3.5 h-3.5 ${isAuto ? 'text-amber-300 animate-pulse' : 'text-indigo-400'}`} />
        
        {isAuto ? (
          <span className="flex items-center gap-1">
            <span className="font-bold text-indigo-300">✨ Auto</span>
            <span className="text-gray-400 text-[11px]">
              ({autoRoutePreview.model.name})
            </span>
          </span>
        ) : (
          <span className="flex items-center gap-1 truncate max-w-[140px]">
            {activeExplicitModel ? getCategoryIcon(activeExplicitModel.category) : null}
            <span className="truncate">{activeExplicitModel ? activeExplicitModel.name : selectedModelId}</span>
          </span>
        )}

        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 bottom-full mb-2 w-80 rounded-2xl bg-gray-950/95 border border-gray-800 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-gray-850 bg-gradient-to-r from-indigo-950/50 to-gray-950">
            <h4 className="text-xs font-bold text-gray-200 flex items-center justify-between">
              <span>เลือกโมเดล (Model Router)</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/50">
                Precision Metering Active
              </span>
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              เลือกระบบ Auto สล่ามไมโครเซอร์วิส หรือระบุโมเดลเฉพาะเจาะจง
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {/* Auto Mode Selection Option */}
            <button
              type="button"
              onClick={() => {
                onSelectModel('auto');
                setIsOpen(false);
              }}
              className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                isAuto
                  ? 'bg-indigo-950/70 border-indigo-500/60 text-white shadow-md'
                  : 'bg-gray-905 border-gray-850 text-gray-300 hover:bg-gray-900 hover:border-gray-700'
              }`}
            >
              <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-amber-300 animate-spin-slow" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-indigo-200">✨ Auto Model Router</span>
                  {isAuto && <Check className="w-4 h-4 text-indigo-400" />}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  วิเคราะห์ Intent + รูปภาพอัตโนมัติ เพื่อเลือกโมเดลที่คุ้มค่าที่สุด
                </p>
                <div className="mt-1.5 text-[10px] bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-md inline-block">
                  แนะนำสำหรับทุกงาน (Auto Route: {autoRoutePreview.model.name})
                </div>
              </div>
            </button>

            {/* Categorized Model Options */}
            {(Object.keys(SUPPORTED_MODELS) as ModelCategory[]).map((category) => (
              <div key={category} className="space-y-1 pt-1">
                <div className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {getCategoryIcon(category)}
                  <span>{category.replace('_', ' ')}</span>
                </div>

                {SUPPORTED_MODELS[category].map((model: ModelDefinition) => {
                  const isSelected = !isAuto && selectedModelId === model.id;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onSelectModel(model.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                          : 'bg-gray-900/60 border-gray-850/80 text-gray-300 hover:bg-gray-850 hover:border-gray-750'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-gray-100 truncate">{model.name}</span>
                          <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-gray-800 text-gray-400">
                            {model.provider}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{model.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-emerald-400 font-mono block">
                          ${model.pricing.promptTokenPricePer1M}/1M
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 ml-auto mt-0.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
