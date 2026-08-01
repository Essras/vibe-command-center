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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          { name: file.name, type: file.type || 'text/plain', content: text },
        ]);
      };
      reader.readAsText(file);
    });
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
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-gray-950 text-gray-100">
      {/* Top Banner / Project Info */}
      <div className="bg-gray-900/60 border-b border-gray-800/80 px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-gray-200">
              Workspace: {activeProject?.name || 'General'}
            </h2>
            <p className="text-[11px] text-gray-400 truncate max-w-md">
              System Prompt Memory: {activeProject?.systemPrompt?.slice(0, 70) || 'None'}...
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-md border border-gray-700 font-mono">
            Model: {activeModelName}
          </span>
          <button
            onClick={onClearHistory}
            className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition"
            title="ล้างประวัติแชท"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/30 flex items-center justify-center mb-4 text-indigo-400">
              <Bot className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-200">Vibe Command Center Chat</h3>
            <p className="text-xs text-gray-400 max-w-md mt-1">
              พิมพ์คำสั่ง Vibe Code, คิดคอนเทนต์ หรือสั่งงาน AI ด้วยไฟล์บริบทที่คุณต้องการ
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mt-6 w-full text-left">
              <button
                onClick={() => setInput('ช่วยเขียน Python script สำหรับดึงข้อมูล Facebook Page API ให้หน่อย')}
                className="p-3 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-xs text-gray-300 transition text-left"
              >
                🐍 **Python VPS Script**: เขียนสคริปต์ดึง API
              </button>
              <button
                onClick={() => setInput('ช่วยคิดแคปชั่นและคอนเทนต์ Facebook สำหรับยิงโฆษณาสินค้าให้หน่อย')}
                className="p-3 bg-gray-900 border border-gray-800 hover:border-indigo-500/50 rounded-xl text-xs text-gray-300 transition text-left"
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

                <div className={`space-y-1.5 max-w-3xl ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Attachments preview */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {msg.attachments.map((att, i) => (
                        <div
                          key={i}
                          className="bg-gray-800 border border-gray-700 text-gray-300 text-[11px] px-2.5 py-1 rounded-md flex items-center gap-1.5"
                        >
                          <FileText className="w-3 h-3 text-indigo-400" />
                          <span>{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isUser
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/20'
                        : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-none shadow'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }: any) {
                            const match = /language-(\w+)/.exec(className || '');
                            const codeString = String(children).replace(/\n$/, '');
                            const codeId = 'code-' + Math.random();
                            return !inline && match ? (
                              <div className="relative my-3 rounded-lg overflow-hidden border border-gray-800">
                                <div className="bg-gray-950 px-4 py-1.5 border-b border-gray-800 flex justify-between items-center text-xs text-gray-400">
                                  <span>{match[1]}</span>
                                  <button
                                    onClick={() => handleCopyCode(codeString, codeId)}
                                    className="flex items-center gap-1 hover:text-white transition"
                                  >
                                    {copiedId === codeId ? (
                                      <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">คัดลอกแล้ว</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>คัดลอก</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                                <SyntaxHighlighter
                                  style={vscDarkPlus as any}
                                  language={match[1]}
                                  PreTag="div"
                                  customStyle={{ margin: 0, padding: '1rem', fontSize: '0.85rem' }}
                                  {...props}
                                >
                                  {codeString}
                                </SyntaxHighlighter>
                              </div>
                            ) : (
                              <code
                                className="bg-gray-800 text-indigo-300 font-mono text-xs px-1.5 py-0.5 rounded border border-gray-700"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>

                  {/* Footer tag for AI model used */}
                  {!isUser && msg.modelUsed && (
                    <div className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                      <span>⚡ Answered by {msg.modelUsed}</span>
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
          <div className="flex space-x-3 mr-auto justify-start max-w-2xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse shrink-0">
              <RefreshCw className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-gray-900 border border-gray-800 text-gray-400 p-4 rounded-2xl rounded-tl-none text-xs flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>AI กำลังประมวลผลคำตอบและโค้ด...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments preview bar above input */}
      {attachments.length > 0 && (
        <div className="px-6 py-2 bg-gray-900 border-t border-gray-800 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={i}
              className="bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-xs px-3 py-1 rounded-lg flex items-center space-x-2"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[150px] truncate">{att.name}</span>
              <button
                onClick={() => removeAttachment(i)}
                className="text-indigo-400 hover:text-red-400 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 bg-gray-900 border-t border-gray-800">
        <div className="max-w-4xl mx-auto flex items-end space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-gray-400 hover:text-indigo-400 hover:bg-gray-800 rounded-xl border border-gray-800 transition shrink-0"
            title="แนบไฟล์ (.txt, .pdf, .json, .py)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="พิมพ์คำสั่ง สั่งงาน Vibe Code หรือถาม AI... (Shift+Enter เพื่อขึ้นบรรทัดใหม่)"
              rows={2}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={(!input.trim() && attachments.length === 0) || isLoading}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};
