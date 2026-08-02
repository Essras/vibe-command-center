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
}) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<{ name: string; type: string; content: string }[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAttachMenuOpen, setIsAttachMenuOpen] = useState(false);
  const [isGDriveModalOpen, setIsGDriveModalOpen] = useState(false);
  const [gdriveUrlInput, setGdriveUrlInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-gray-950 text-gray-100 min-w-0">
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
            onClick={onClearHistory}
            className="p-1 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition flex items-center gap-1 text-[11px]"
            title="ล้างประวัติแชท"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ล้างประวัติ</span>
          </button>
        </div>
      </div>

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

                            return !inline && match ? (
                              <div className="relative my-3 rounded-lg overflow-hidden border border-gray-800 max-w-full overflow-x-auto">
                                <div className="bg-gray-950 px-3 py-1.5 flex items-center justify-between text-[10px] text-gray-400 border-b border-gray-800">
                                  <span>{match[1].toUpperCase()}</span>
                                  <button
                                    onClick={() => handleCopyCode(codeString, codeId)}
                                    className="flex items-center gap-1 hover:text-white transition"
                                  >
                                    {copiedId === codeId ? (
                                      <>
                                        <Check className="w-3 h-3 text-emerald-400" />
                                        <span className="text-emerald-400">คัดลอกแล้ว</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>คัดลอกโค้ด</span>
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
                                    background: '#0d1117',
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
  );
};
