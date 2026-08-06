'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Send,
  Paperclip,
  Trash2,
  Copy,
  Check,
  Sparkles,
  FileText,
  X,
  Bot,
  User,
  RefreshCw,
  Globe,
  Cpu,
  CheckCircle2,
  Terminal,
  FileVideo,
  Download,
  FolderKanban,
  Image as ImageIcon,
  Play,
  Maximize2,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { FavoriteModel, Project } from '@/lib/db';

export interface ChatMessageUI {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: { name: string; type: string; content?: string }[];
  modelUsed?: string;
  timestamp?: string;
}

interface ChatInterfaceProps {
  activeProject?: Project;
  favoriteModels: FavoriteModel[];
  activeModelId: string;
  onSelectModel: (id: string) => void;
  messages: ChatMessageUI[];
  onSendMessage: (text: string, attachments: any[]) => void;
  onClearHistory: () => void;
  isLoading: boolean;
  openStatusModalSignal?: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  activeProject,
  favoriteModels,
  activeModelId,
  onSelectModel,
  messages,
  onSendMessage,
  onClearHistory,
  isLoading,
  openStatusModalSignal,
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; type: string; content: string }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isGDriveModalOpen, setIsGDriveModalOpen] = useState(false);
  const [gdriveUrlInput, setGdriveUrlInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const prevOutputFilesLength = useRef(0);

  const [vpsStatus, setVpsStatus] = useState<{
    isRunning: boolean;
    runningProcesses: string[];
    outputFiles: { name: string; sizeMB: string; modified: string }[];
    activeProcessesCount: number;
    logContent?: string;
    agentSteps?: { name: string; status: string; error?: string; healing?: string }[];
  }>({
    isRunning: false,
    runningProcesses: [],
    outputFiles: [],
    activeProcessesCount: 0,
    logContent: '',
    agentSteps: [],
  });
  const [showStatusModal, setShowStatusModal] = useState(false);

  useEffect(() => {
    if (openStatusModalSignal && openStatusModalSignal > 0) {
      setShowStatusModal(true);
    }
  }, [openStatusModalSignal]);

  const checkVpsStatus = async () => {
    try {
      const res = await fetch('/api/system/status');
      const data = await res.json();
      if (data.success) {
        setVpsStatus({
          isRunning: data.isRunning,
          runningProcesses: data.runningProcesses || [],
          outputFiles: data.outputFiles || [],
          activeProcessesCount: data.activeProcessesCount || 0,
          logContent: data.logContent || '',
          agentSteps: data.agentSteps || [],
        });
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (vpsStatus.outputFiles.length > prevOutputFilesLength.current) {
      if (window.innerWidth >= 768) {
        setIsRightPanelOpen(true);
      }
    }
    prevOutputFilesLength.current = vpsStatus.outputFiles.length;
  }, [vpsStatus.outputFiles]);

  useEffect(() => {
    checkVpsStatus();
    const interval = setInterval(checkVpsStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleAddGDriveLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gdriveUrlInput.trim()) return;

    const gdriveMatch = gdriveUrlInput.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|document\/d\/|spreadsheets\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
    const fileId = gdriveMatch ? gdriveMatch[1] : gdriveUrlInput.trim();
    const fileName = `Google Drive File (${fileId.slice(0, 10)}...)`;

    setAttachments((prev) => [
      ...prev,
      {
        name: fileName,
        type: 'application/gdrive',
        content: gdriveUrlInput.trim(),
      },
    ]);

    setGdriveUrlInput('');
    setIsGDriveModalOpen(false);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      const isImage = file.type.startsWith('image/');
      
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          { name: file.name, type: file.type || 'text/plain', content },
        ]);
      };

      if (isImage) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData?.getData('text/plain');
    if (pastedText && (pastedText.includes('drive.google.com') || pastedText.includes('docs.google.com'))) {
      const gdriveMatch = pastedText.match(/(?:drive|docs)\.google\.com\/(?:file\/d\/|document\/d\/|spreadsheets\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
      if (gdriveMatch) {
        const fileId = gdriveMatch[1];
        const fileName = `Google Drive File (${fileId.slice(0, 8)}...)`;
        setAttachments((prev) => [
          ...prev,
          {
            name: fileName,
            type: 'application/gdrive',
            content: pastedText.trim(),
          },
        ]);
      }
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (!file) continue;

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target?.result as string;
          const fileName = file.name && file.name !== 'image.png'
            ? file.name
            : `clipboard-image-${Date.now()}.png`;

          setAttachments((prev) => [
            ...prev,
            {
              name: fileName,
              type: file.type || 'image/png',
              content: base64Data,
            },
          ]);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(input, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeModelName =
    favoriteModels.find((m) => m.id === activeModelId)?.name || activeModelId;

  return (
    <div className="flex-1 flex flex-row h-[calc(100vh-3.5rem)] bg-gray-950 text-gray-100 min-w-0 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Banner / Project Info */}
        <div className="bg-gray-900/40 border-b border-gray-800/60 px-4 py-2 flex items-center justify-between min-w-0 shrink-0">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-gray-200 truncate">
                Workspace: {activeProject?.name || 'General Workspace'}
              </h2>
            </div>
            <p className="text-[10px] text-gray-400 truncate max-w-sm sm:max-w-md hidden xs:block">
              Memory: {activeProject?.systemPrompt?.slice(0, 60) || 'None'}...
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowStatusModal(true)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow border ${
              vpsStatus.isRunning
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse shadow-amber-500/10'
                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
            }`}
            title="คลิกเพื่อดูสถานะโปรเซสงานบน VPS"
          >
            <Cpu className={`w-3.5 h-3.5 ${vpsStatus.isRunning ? 'text-amber-400 animate-spin' : 'text-emerald-400'}`} />
            <span>
              {vpsStatus.isRunning
                ? `VPS: กำลังรันงาน (${vpsStatus.activeProcessesCount})`
                : 'VPS: พร้อมใช้งาน'}
            </span>
          </button>

          <button
            onClick={() => setIsRightPanelOpen(!isRightPanelOpen)}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
              isRightPanelOpen
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/30'
                : 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-750'
            }`}
            title="เปิด/ปิด แผงผลลัพธ์วิดีโอและรูปภาพข้างขวา"
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isRightPanelOpen ? 'ปิดแผงขวา ➔' : '📂 ดูแผงผลลัพธ์'}</span>
          </button>

          <button
            onClick={onClearHistory}
            className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition flex items-center gap-1 text-[11px] cursor-pointer"
            title="ล้างประวัติแชท"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ล้างประวัติ</span>
          </button>
        </div>
      </div>

      {/* Live VPS Processing & Execution Log Banner (Always visible on screen) */}
      {(vpsStatus.isRunning || vpsStatus.logContent || vpsStatus.outputFiles.length > 0) && (
        <div className={`px-4 py-2.5 border-b text-xs transition-all shrink-0 ${
          vpsStatus.isRunning
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            : vpsStatus.outputFiles.length > 0
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
              : 'bg-gray-900/60 border-gray-800 text-gray-300'
        }`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-semibold">
              {vpsStatus.isRunning ? (
                <span className="flex items-center gap-2 text-amber-300 animate-pulse font-bold">
                  <Cpu className="w-4 h-4 text-amber-400 animate-spin" />
                  ⚡ [VPS RUNNING] กำลังรันสคริปต์ประมวลผลตัดต่อวิดีโอ...
                </span>
              ) : vpsStatus.outputFiles.length > 0 ? (
                <span className="flex items-center gap-2 text-emerald-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  🎉 [JOB COMPLETED] ไฟล์ผลลัพธ์พร้อมใช้งานใน output/ ({vpsStatus.outputFiles.length} ไฟล์)
                </span>
              ) : (
                <span className="flex items-center gap-2 text-gray-300">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  📋 รายงานและ Log การทำงานล่าสุดบน VPS
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => checkVpsStatus()}
                className="px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-300 transition flex items-center gap-1 cursor-pointer border border-gray-700"
                title="อัปเดตสถานะล่าสุดทันที"
              >
                <RefreshCw className="w-3 h-3" />
                <span>รีเฟรช Log</span>
              </button>
              <button
                onClick={() => setShowStatusModal(true)}
                className="px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/60 text-[11px] text-indigo-200 transition cursor-pointer border border-indigo-500/30"
              >
                ป๊อปอัปขยาย 🔍
              </button>
            </div>
          </div>

          {/* Agent Steps Progress List (Autonomous Self-Healing Steps) */}
          {vpsStatus.agentSteps && vpsStatus.agentSteps.length > 0 && (
            <div className="mt-2 bg-black/70 p-2.5 rounded-xl border border-gray-800 space-y-2">
              <div className="text-[10px] text-gray-400 font-bold border-b border-gray-800 pb-1 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>ขั้นตอนการทำงานของ AI Agent (มีระบบช่วยแก้ไขปัญหาอัตโนมัติ):</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 mt-1 max-h-48 overflow-y-auto">
                {vpsStatus.agentSteps.map((step, idx) => {
                  const isPending = step.status === 'PENDING';
                  const isProcessing = step.status === 'PROCESSING';
                  const isCompleted = step.status === 'COMPLETED';
                  const isFailed = step.status === 'FAILED';
                  
                  return (
                    <div key={idx} className="flex flex-col bg-gray-900/60 p-1.5 px-2.5 rounded-lg border border-gray-850/50">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {isCompleted ? '✅' : isFailed ? '❌' : isProcessing ? '🔄' : '💤'}
                          </span>
                          <span className={`font-mono text-[11px] ${
                            isCompleted ? 'text-gray-400 line-through opacity-80' : 
                            isFailed ? 'text-red-400 font-bold' : 
                            isProcessing ? 'text-indigo-300 font-bold animate-pulse' : 'text-gray-500'
                          }`}>
                            {step.name}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isCompleted ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 
                          isFailed ? 'bg-red-950 text-red-400 border border-red-500/20' : 
                          isProcessing ? 'bg-indigo-950 text-indigo-400 border border-indigo-500/20 animate-pulse' : 
                          'bg-gray-950 text-gray-600'
                        }`}>
                          {step.status}
                        </span>
                      </div>
                      
                      {step.healing && isProcessing && (
                        <div className="mt-1 ml-6 text-[10px] text-amber-400 font-sans flex items-center gap-1 animate-pulse">
                          <span>🔧 {step.healing}</span>
                        </div>
                      )}
                      
                      {step.error && isFailed && (
                        <div className="mt-1 ml-6 text-[10px] text-red-500 font-mono bg-red-950/20 p-1.5 rounded border border-red-500/10 whitespace-pre-wrap break-all">
                          {step.error.slice(0, 150)}...
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Execution Log (auto_run.log) */}
          {vpsStatus.logContent && (
            <div className="mt-2 font-mono text-[10px] bg-black/90 p-2.5 rounded-lg border border-gray-800 text-emerald-400 overflow-x-auto max-h-24">
              <div className="text-[9px] text-gray-400 mb-1 font-sans flex justify-between border-b border-gray-800/80 pb-1">
                <span className="font-bold text-gray-300 flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-amber-400" />
                  📋 Log การทำงานล่าสุดบน VPS (auto_run.log):
                </span>
                <span className={vpsStatus.isRunning ? 'text-amber-400 animate-pulse font-bold' : 'text-emerald-400 font-bold'}>
                  {vpsStatus.isRunning ? '🔄 กำลังทำงาน...' : '✅ ทำงานเสร็จแล้ว'}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-all leading-relaxed">
                {vpsStatus.logContent.split('\n').slice(-6).join('\n')}
              </pre>
            </div>
          )}

          {/* Output Files Download Quick-Bar & Inline Video Player */}
          {vpsStatus.outputFiles.length > 0 && (
            <div className="mt-2 text-[11px] bg-emerald-950/70 p-2.5 rounded-xl border border-emerald-500/30 space-y-2 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                  <FileVideo className="w-4 h-4 text-emerald-400 animate-pulse" />
                  🎉 ไฟล์ผลลัพธ์พร้อมใช้งาน/ดาวน์โหลด (output/):
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  {vpsStatus.outputFiles.length} ไฟล์
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {vpsStatus.outputFiles.map((f, i) => {
                  const isVideo = /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name);
                  const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name);
                  const rawPath = `workspace/video-editor/output/${f.name}`;
                  const downloadLink = `/api/files/raw?path=${encodeURIComponent(rawPath)}&download=true`;
                  const previewUrl = `/api/files/raw?path=${encodeURIComponent(rawPath)}`;

                  if (isImg) {
                    return (
                      <div 
                        key={i} 
                        className="flex items-center gap-1.5 bg-emerald-900/80 p-1 px-2 rounded-lg border border-emerald-500/40 cursor-pointer hover:bg-emerald-800 transition"
                        onClick={() => setLightboxImage(previewUrl)}
                        title="คลิกเพื่อพรีวิวรูปภาพขยายใหญ่"
                      >
                        <img src={previewUrl} className="w-4 h-4 rounded object-cover border border-white/20" />
                        <span className="font-mono text-[11px] text-emerald-100 hover:text-white font-bold flex items-center gap-1 transition">
                          🖼️ {f.name} ({f.sizeMB} MB) 🔍
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={i} className="flex items-center gap-1 bg-emerald-900/80 p-1 px-2 rounded-lg border border-emerald-500/40 hover:bg-emerald-800 transition">
                      <a
                        href={downloadLink}
                        download
                        className="font-mono text-[11px] text-emerald-100 hover:text-white font-bold flex items-center gap-1 transition"
                        title="คลิกเพื่อดาวน์โหลดไฟล์ลงเครื่อง"
                      >
                        {isVideo ? '🎬' : '📄'} {f.name} ({f.sizeMB} MB) 📥
                      </a>
                    </div>
                  );
                })}
              </div>

              {/* Render Inline Video Player for the first output video if present */}
              {vpsStatus.outputFiles.some((f) => /\.(mp4|webm)$/i.test(f.name)) && (
                <div className="mt-2 bg-black rounded-xl p-2 border border-emerald-500/30 max-w-xl">
                  <div className="text-[10px] text-emerald-300 font-bold mb-1 flex items-center gap-1">
                    <span>▶️ พรีวิววิดีโอผลลัพธ์สดบนหน้าจอ (ไม่ต้องเปิด Terminal):</span>
                  </div>
                  {vpsStatus.outputFiles
                    .filter((f) => /\.(mp4|webm)$/i.test(f.name))
                    .map((f, idx) => (
                      <div key={idx} className="space-y-1 mb-2">
                        <video
                          controls
                          preload="metadata"
                          src={`/api/files/raw?path=${encodeURIComponent(`workspace/video-editor/output/${f.name}`)}`}
                          className="w-full max-h-56 rounded-lg bg-black"
                        />
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono px-1">
                          <span>{f.name}</span>
                          <a
                            href={`/api/files/raw?path=${encodeURIComponent(`workspace/video-editor/output/${f.name}`)}&download=true`}
                            download
                            className="text-emerald-400 font-bold hover:underline"
                          >
                            📥 ดาวน์โหลด .mp4 ({f.sizeMB} MB)
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400 shadow-xl shadow-indigo-500/10">
              <Bot className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-gray-200">Vibe Command Center Chat</h3>
            <p className="text-xs text-gray-400 max-w-md mt-1">
              พิมพ์คำสั่ง Vibe Code, คิดคอนเทนต์ หรือสั่งงาน AI ด้วยไฟล์บริบทที่คุณต้องการ
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mt-6 w-full text-left">
              <button
                onClick={() => setInput('ช่วยเขียน Python script สำหรับดึงข้อมูล Facebook Page API ให้หน่อย')}
                className="p-3 bg-gray-900/90 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-xs text-gray-300 transition text-left"
              >
                🐍 **Python VPS Script**: เขียนสคริปต์ดึง API
              </button>
              <button
                onClick={() => setInput('ช่วยคิดแคปชั่นและคอนเทนต์ Facebook สำหรับยิงโฆษณาสินค้าให้หน่อย')}
                className="p-3 bg-gray-900/90 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-xs text-gray-300 transition text-left"
              >
                📝 **Content AI**: คิดแคปชั่นเพจ Facebook
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id || index}
                className={`flex space-x-3 max-w-4xl ${
                  isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`rounded-2xl p-3.5 sm:p-4 text-xs leading-relaxed space-y-2 max-w-[95%] sm:max-w-[88%] min-w-0 overflow-hidden ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-600/20'
                      : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-none shadow-md'
                  }`}
                >
                  {/* Attachments preview */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-gray-700/50">
                      {msg.attachments.map((att, i) => {
                        const isImage = att.type?.startsWith('image/') || att.content?.startsWith('data:image/');
                        return isImage ? (
                          <div key={i} className="rounded-xl overflow-hidden border border-white/20 bg-black/40 max-w-xs">
                            <img
                              src={att.content}
                              alt={att.name}
                              className="max-h-48 object-contain rounded-xl"
                            />
                            <div className="p-1 text-[10px] text-gray-300 truncate bg-black/60 px-2">
                              🖼️ {att.name}
                            </div>
                          </div>
                        ) : (
                          <div
                            key={i}
                            className="flex items-center space-x-1.5 bg-black/20 text-[11px] px-2 py-0.5 rounded-lg"
                          >
                            <FileText className="w-3 h-3 text-indigo-300" />
                            <span className="truncate max-w-[150px]">{att.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Markdown Renderer for Assistant */}
                  {isUser ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <div className="prose prose-invert prose-xs max-w-none min-w-0 overflow-hidden">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a({ href, children }: any) {
                            let targetUrl = href || '#';
                            if (href && (href.startsWith('output/') || href.startsWith('workspace/') || href.startsWith('/vps_data/'))) {
                              const cleanRel = href.replace(/^(\/vps_data\/|\.\/|\/)/, '');
                              targetUrl = `/api/files/raw?path=${encodeURIComponent(cleanRel)}&download=true`;
                            }
                            return (
                              <a
                                href={targetUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:text-emerald-300 font-bold underline inline-flex items-center gap-1 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30"
                              >
                                <span>📥</span>
                                <span>{children}</span>
                              </a>
                            );
                          },
                          table({ children }: any) {
                            return (
                              <div className="overflow-x-auto max-w-full my-3 rounded-xl border border-gray-800 bg-gray-950/80 shadow-md">
                                <table className="min-w-full divide-y divide-gray-800 text-xs text-left">
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          thead({ children }: any) {
                            return <thead className="bg-gray-900 text-indigo-300 font-bold">{children}</thead>;
                          },
                          th({ children }: any) {
                            return <th className="px-3 py-2 border-b border-gray-800 whitespace-nowrap">{children}</th>;
                          },
                          td({ children }: any) {
                            return <td className="px-3 py-2 border-b border-gray-850 text-gray-200">{children}</td>;
                          },
                          pre({ children }: any) {
                            return <div className="overflow-x-auto max-w-full my-2">{children}</div>;
                          },
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            const codeId = `code-${Math.random().toString(36).substr(2, 9)}`;
                            const lang = match ? match[1].toLowerCase() : '';
                            const isPrompt = ['prompt', 'midjourney', 'sd', 'text', 'markdown'].includes(lang);

                            return !inline && match ? (
                              <div className={`relative my-3 rounded-xl overflow-hidden border max-w-full overflow-x-auto shadow-md ${
                                isPrompt ? 'border-purple-800/60' : 'border-gray-800'
                              }`}>
                                <div className={`px-3.5 py-2 flex items-center justify-between text-[10px] font-semibold border-b ${
                                  isPrompt 
                                    ? 'bg-purple-950/80 text-purple-300 border-purple-800/40' 
                                    : 'bg-gray-950 text-gray-400 border-gray-800'
                                }`}>
                                  <span className="flex items-center gap-1">
                                    {isPrompt && <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />}
                                    {isPrompt ? `${match[1].toUpperCase()} PROMPT` : match[1].toUpperCase()}
                                  </span>
                                  <button
                                    onClick={() => handleCopyCode(codeString, codeId)}
                                    className={`flex items-center gap-1.5 transition px-2 py-0.5 rounded ${
                                      isPrompt
                                        ? 'hover:bg-purple-800/40 hover:text-white text-purple-200'
                                        : 'hover:bg-gray-800 hover:text-white text-gray-300'
                                    }`}
                                  >
                                    {copiedId === codeId ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400 font-bold" />
                                        <span className="text-emerald-400">คัดลอกแล้ว!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>{isPrompt ? 'คัดลอก Prompt' : 'คัดลอกโค้ด'}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <SyntaxHighlighter
                                  style={vscDarkPlus}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{
                                    margin: 0,
                                    borderRadius: 0,
                                    fontSize: '11px',
                                    background: isPrompt ? '#0c0714' : '#0d1117',
                                    padding: '12px',
                                  }}
                                  {...props}
                                >
                                  {codeString}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code className="bg-gray-800 px-1.5 py-0.5 rounded text-[11px] font-mono text-indigo-300" {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}

                  {msg.modelUsed && !isUser && (
                    <div className="text-[10px] text-gray-500 pt-1 text-right font-mono">
                      via {msg.modelUsed}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex space-x-3 items-center text-gray-400 text-xs my-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-gray-900 border border-indigo-500/30 rounded-xl px-4 py-2 text-xs flex items-center gap-2.5 text-indigo-200 shadow-lg shadow-indigo-950/40">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium text-emerald-400">🤖 AI กำลังประมวลผลคำสั่งระบบ...</span>
                <span className="text-[11px] text-gray-400">คุณสามารถพิมพ์คำสั่งถัดไปรอไว้ล่วงหน้าได้ทันที</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-gray-900/90 border-t border-gray-800/80 backdrop-blur-md shrink-0">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-2">
          {/* Attachments Chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {attachments.map((att, i) => {
                const isImage = att.type?.startsWith('image/') || att.content?.startsWith('data:image/');
                const isGDrive = att.type === 'application/gdrive';
                return (
                  <div
                    key={i}
                    className={`flex items-center space-x-1.5 border text-xs px-2.5 py-1 rounded-xl shadow-sm ${
                      isGDrive
                        ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
                        : 'bg-gray-800/90 border-gray-700 text-gray-200'
                    }`}
                  >
                    {isImage ? (
                      <img
                        src={att.content}
                        alt={att.name}
                        className="w-7 h-7 object-cover rounded-lg border border-indigo-500/50"
                      />
                    ) : isGDrive ? (
                      <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <span className="truncate max-w-[170px] font-medium">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(i)}
                      className="text-gray-400 hover:text-red-400 ml-1 p-0.5 rounded-lg hover:bg-gray-700 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="relative flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept="image/*,.txt,.js,.ts,.tsx,.jsx,.json,.py,.md,.css,.html"
              className="hidden"
            />

            {/* Popup Attachment Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAttachMenuOpen(!isAttachMenuOpen)}
                className={`absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition z-10 ${
                  isAttachMenuOpen
                    ? 'text-indigo-400 bg-gray-800'
                    : 'text-gray-400 hover:text-indigo-400 hover:bg-gray-800'
                }`}
                title="เลือกวิธีแนบไฟล์ (ไฟล์เครื่อง / ลิงก์ Google Drive)"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Attachment Dropdown Popup */}
              {isAttachMenuOpen && (
                <div className="absolute left-3 bottom-12 bg-gray-900/95 border border-gray-800 backdrop-blur-lg rounded-2xl p-2 shadow-2xl z-30 space-y-1 w-64 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-800/80 mb-1">
                    เลือกรูปแบบการแนบเอกสาร
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-200 hover:bg-gray-800 hover:text-white rounded-xl flex items-center space-x-2.5 transition"
                  >
                    <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold">📄 แนบไฟล์จากเครื่อง</span>
                      <span className="text-[10px] text-gray-400">รูปภาพ, เอกสาร, สคริปต์, โค้ด</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAttachMenuOpen(false);
                      setIsGDriveModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-950/80 rounded-xl flex items-center space-x-2.5 transition border border-emerald-500/20"
                  >
                    <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="flex flex-col">
                      <span className="font-semibold text-emerald-300">🌐 แนบลิงก์ Google Drive</span>
                      <span className="text-[10px] text-emerald-400/70">ไฟล์วิดีโอ, เสียง, สคริปต์, โฟลเดอร์งาน</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="พิมพ์คำสั่ง สั่งงาน Vibe Code หรือวางภาพจาก Clipboard (Ctrl+V / Win+V)..."
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl pl-11 pr-12 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none max-h-32"
            />

            <button
              type="submit"
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="absolute right-2.5 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/30 transition disabled:opacity-40 disabled:hover:bg-indigo-600"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Google Drive Link Modal */}
      {isGDriveModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400">
                <Globe className="w-5 h-5 animate-pulse" />
                <h3 className="font-bold text-sm text-white">แนบไฟล์สื่อจาก Google Drive</h3>
              </div>
              <button
                onClick={() => setIsGDriveModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-gray-300 leading-relaxed">
                วางลิงก์ Google Drive (ไฟล์วิดีโอ, เสียง, สคริปต์ หรือโฟลเดอร์งาน) เพื่อดึงไฟล์เข้าสู่โฟลเดอร์ <code className="text-emerald-400 font-mono">input/</code> ของ Workspace นี้ให้อัตโนมัติ:
              </p>

              <form onSubmit={handleAddGDriveLink} className="space-y-3">
                <input
                  type="text"
                  value={gdriveUrlInput}
                  onChange={(e) => setGdriveUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/file/d/123xyz..."
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  autoFocus
                />

                <div className="flex items-center justify-between pt-2">
                  <a
                    href="https://drive.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:underline flex items-center space-x-1"
                  >
                    <span>🔗 เปิด Google Drive (drive.google.com)</span>
                  </a>

                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsGDriveModalOpen(false)}
                      className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-xl transition"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      disabled={!gdriveUrlInput.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
                    >
                      + แนบไฟล์
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* Right side panel: Generated Media & Prompts Gallery */}
      {isRightPanelOpen && (
        <div className="hidden md:flex w-80 lg:w-96 border-l border-gray-800 bg-gray-900/60 backdrop-blur-sm h-full flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-950 shrink-0">
            <h3 className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
              <FolderKanban className="w-4 h-4 text-indigo-400" />
              <span>ผลลัพธ์สื่อที่สร้างเสร็จ ({vpsStatus.outputFiles.length})</span>
            </h3>
            <button
              onClick={() => setIsRightPanelOpen(false)}
              className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {vpsStatus.outputFiles.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-500">
                <FolderKanban className="w-10 h-10 text-gray-700 mb-2" />
                <p className="text-[11px] italic">ยังไม่มีไฟล์ผลลัพธ์ในโปรเจกต์นี้</p>
                <p className="text-[10px] text-gray-600 mt-1 max-w-[200px]">เมื่อ AI ทำการเรนเดอร์หรือสร้างสื่อเสร็จแล้ว ผลงานจะปรากฏขึ้นตรงนี้โดยอัตโนมัติ</p>
              </div>
            ) : (
              <>
                {/* Video Previews */}
                {vpsStatus.outputFiles.some(f => /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name)) && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <FileVideo className="w-3.5 h-3.5 text-emerald-400" />
                      <span>วิดีโอตัดต่อผลลัพธ์</span>
                    </h4>
                    <div className="space-y-3">
                      {vpsStatus.outputFiles
                        .filter(f => /\.(mp4|webm|mov|mkv|avi)$/i.test(f.name))
                        .map((f, i) => (
                          <div key={i} className="bg-black/40 rounded-xl p-2 border border-gray-850 space-y-1.5">
                            <video
                              controls
                              preload="metadata"
                              src={`/api/files/raw?path=${encodeURIComponent(`workspace/video-editor/output/${f.name}`)}`}
                              className="w-full rounded-lg bg-black max-h-48"
                            />
                            <div className="flex items-center justify-between px-1">
                              <span className="font-mono text-[10px] text-gray-300 truncate max-w-[180px]" title={f.name}>
                                🎬 {f.name}
                              </span>
                              <a
                                href={`/api/files/raw?path=${encodeURIComponent(`workspace/video-editor/output/${f.name}`)}&download=true`}
                                download
                                className="text-emerald-400 hover:text-emerald-300 text-[10px] font-bold flex items-center gap-0.5"
                              >
                                <Download className="w-3 h-3" />
                                <span>โหลด</span>
                              </a>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Image Grid Previews */}
                {vpsStatus.outputFiles.some(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name)) && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span>รูปภาพที่สร้างขึ้น</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {vpsStatus.outputFiles
                        .filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name))
                        .map((f, i) => {
                          const rawPath = `workspace/video-editor/output/${f.name}`;
                          const rawUrl = `/api/files/raw?path=${encodeURIComponent(rawPath)}`;
                          return (
                            <div key={i} className="group relative bg-black/40 rounded-xl overflow-hidden border border-gray-850 aspect-square flex flex-col justify-between">
                              <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center bg-gray-950">
                                <img
                                  src={rawUrl}
                                  alt={f.name}
                                  className="object-cover w-full h-full group-hover:scale-105 transition duration-200"
                                />
                                <button
                                  onClick={() => setLightboxImage(rawUrl)}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1 text-[10px] font-semibold cursor-pointer"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                  <span>ขยาย</span>
                                </button>
                              </div>
                              <div className="bg-black/60 p-1 px-2 text-[9px] text-gray-300 truncate flex justify-between items-center border-t border-gray-850/30">
                                <span className="truncate flex-1 font-mono">{f.name}</span>
                                <a
                                  href={rawUrl + "&download=true"}
                                  download
                                  className="text-emerald-400 hover:text-emerald-300 shrink-0 ml-1"
                                >
                                  <Download className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Other files (Text/SRT/Log/Reports) */}
                {vpsStatus.outputFiles.some(f => !/\.(mp4|webm|mov|mkv|avi|png|jpg|jpeg|gif|webp)$/i.test(f.name)) && (
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>ไฟล์เอกสารและข้อความ</span>
                    </h4>
                    <div className="space-y-1.5">
                      {vpsStatus.outputFiles
                        .filter(f => !/\.(mp4|webm|mov|mkv|avi|png|jpg|jpeg|gif|webp)$/i.test(f.name))
                        .map((f, i) => {
                          const rawPath = `workspace/video-editor/output/${f.name}`;
                          return (
                            <div key={i} className="flex items-center justify-between text-gray-300 bg-black/40 p-2 rounded-lg border border-gray-850 font-mono text-[10px]">
                              <span className="truncate text-indigo-300">📄 {f.name}</span>
                              <a
                                href={`/api/files/raw?path=${encodeURIComponent(rawPath)}&download=true`}
                                download
                                className="text-emerald-400 hover:text-emerald-300 font-bold ml-2"
                              >
                                📥
                              </a>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 bg-black/40 rounded-full cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <a
              href={lightboxImage + "&download=true"}
              download
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดภาพ</span>
            </a>
            <button
              onClick={() => {
                const pathStr = lightboxImage.split('path=')[1];
                const decodedPath = pathStr ? decodeURIComponent(pathStr.split('&')[0]) : '';
                const filename = decodedPath.split('/').pop() || 'image.png';
                navigator.clipboard.writeText(filename);
                alert(`คัดลอกชื่อไฟล์ ${filename} แล้ว`);
              }}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Copy className="w-4 h-4" />
              <span>คัดลอกชื่อไฟล์</span>
            </button>
          </div>
        </div>
      )}

      {/* VPS Status Detail Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${vpsStatus.isRunning ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                สถานะระบบและการประมวลผลบน VPS
              </h3>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-200 text-xs px-2 py-1 bg-gray-800 rounded"
              >
                ✕ ปิด
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-gray-400">สถานะเซิร์ฟเวอร์: </span>
                <span className={`font-bold ${vpsStatus.isRunning ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {vpsStatus.isRunning ? '⚙️ กำลังตัดต่อ/เรนเดอร์ในหลังบ้าน' : '💤 พร้อมรับงานใหม่ (ไม่มีโปรเซสค้าง)'}
                </span>
              </div>

              {vpsStatus.runningProcesses.length > 0 && (
                <div>
                  <div className="font-semibold text-gray-300 mb-1">โปรเซสที่กำลังรันบน VPS ({vpsStatus.runningProcesses.length}):</div>
                  <div className="bg-gray-950 p-2.5 rounded border border-gray-800 font-mono text-[11px] text-amber-300 max-h-36 overflow-y-auto space-y-1">
                    {vpsStatus.runningProcesses.map((p, i) => (
                      <div key={i} className="truncate">• {p}</div>
                    ))}
                  </div>
                </div>
              )}

              {vpsStatus.logContent && (
                <div>
                  <div className="font-semibold text-gray-300 mb-1">📋 Live Execution Log (auto_run.log):</div>
                  <pre className="bg-gray-950 p-2.5 rounded border border-gray-800 font-mono text-[10px] text-emerald-400 max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {vpsStatus.logContent}
                  </pre>
                </div>
              )}

              <div>
                <div className="font-semibold text-gray-300 mb-1">ไฟล์ในโฟลเดอร์ output/ ({vpsStatus.outputFiles.length}):</div>
                {vpsStatus.outputFiles.length === 0 ? (
                  <div className="text-gray-500 italic bg-gray-950 p-2 rounded border border-gray-850">ยังไม่มีไฟล์ในโฟลเดอร์ output/</div>
                ) : (
                  <div className="bg-gray-950 p-2.5 rounded border border-gray-800 space-y-1.5 max-h-36 overflow-y-auto">
                    {vpsStatus.outputFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-gray-300 bg-gray-900 p-1.5 px-2.5 rounded border border-gray-800">
                        <span className="truncate font-mono text-[11px] text-indigo-300">📹 {f.name} ({f.sizeMB} MB)</span>
                        <a
                          href={`/api/files/raw?path=${encodeURIComponent(`workspace/video-editor/output/${f.name}`)}&download=true`}
                          download
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold flex items-center gap-1 transition shrink-0 ml-2"
                        >
                          <Download className="w-3 h-3" />
                          <span>ดาวน์โหลด</span>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg"
              >
                รับทราบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
