'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Save,
  Plus,
  RefreshCw,
  Trash2,
  Code2,
  FileCode,
  Upload,
} from 'lucide-react';
import { Project } from '@/lib/db';

interface FileItem {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface CodeEditorProps {
  activeProject?: Project;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ activeProject }) => {
  const [currentDir, setCurrentDir] = useState<string>('.');
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'files' | 'editor'>('files');
  const editorFileInputRef = useRef<HTMLInputElement>(null);

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setStatusMsg('กำลังอัปโหลดไฟล์...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'upload',
              path: currentDir,
              filename: file.name,
              base64,
            }),
          });
          fetchFiles(currentDir);
          setStatusMsg(`อัปโหลด ${file.name} เรียบร้อยแล้ว!`);
          setTimeout(() => setStatusMsg(''), 4000);
        } catch (err) {
          console.error('Upload failed:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchFiles = async (dirPath: string = '.') => {
    try {
      const res = await fetch(`/api/files?action=list&path=${encodeURIComponent(dirPath)}`);
      const data = await res.json();
      if (data.items) {
        setFileList(data.items);
        setCurrentDir(dirPath);
      }
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  useEffect(() => {
    if (activeProject) {
      fetchFiles(activeProject.vpsFolder || '.');
    } else {
      fetchFiles('.');
    }
  }, [activeProject]);

  const openFile = async (item: FileItem) => {
    if (item.isDirectory) {
      fetchFiles(item.path);
    } else {
      try {
        const res = await fetch(`/api/files?action=read&path=${encodeURIComponent(item.path)}`);
        const data = await res.json();
        if (data.content !== undefined) {
          setActiveFilePath(item.path);
          setFileContent(data.content);
          setStatusMsg('');
          setMobileTab('editor'); // Auto switch to editor on mobile when file selected
        }
      } catch (err) {
        console.error('Error reading file:', err);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!activeFilePath) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', path: activeFilePath, content: fileContent }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMsg('บันทึกไฟล์เรียบร้อยแล้ว!');
        setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (err) {
      console.error('Error saving file:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNewFile = async () => {
    const filename = prompt('กรอกชื่อไฟล์ใหม่ (รวมนามสกุล เช่น app.py, script.js):');
    if (!filename) return;

    const newPath = currentDir === '.' ? filename : `${currentDir}/${filename}`;
    try {
      await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', path: newPath, isDirectory: false }),
      });
      fetchFiles(currentDir);
      setActiveFilePath(newPath);
      setFileContent('');
    } catch (err) {
      console.error('Error creating file:', err);
    }
  };

  const getLanguageFromPath = (path: string | null) => {
    if (!path) return 'javascript';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.md')) return 'markdown';
    if (path.endsWith('.sh')) return 'shell';
    return 'javascript';
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] bg-gray-950 text-gray-100 overflow-hidden">
      {/* Mobile Sub-Header View Toggle (Visible only on mobile < md) */}
      <div className="md:hidden bg-gray-900 border-b border-gray-800 p-1 flex justify-center space-x-1 shrink-0">
        <button
          onClick={() => setMobileTab('files')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'files'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>📁 รายการไฟล์</span>
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
            mobileTab === 'editor'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>📝 ตัวแก้ไขโค้ด</span>
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar File Explorer */}
        <div
          className={`bg-gray-900 border-r border-gray-800 flex flex-col shrink-0 ${
            mobileTab === 'files' ? 'w-full flex' : 'hidden md:flex md:w-64'
          }`}
        >
          <div className="p-3 border-b border-gray-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Folder className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-gray-200 truncate">
                {activeProject ? activeProject.name : 'VPS Workspace'}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <input
                type="file"
                ref={editorFileInputRef}
                onChange={handleDirectUpload}
                multiple
                className="hidden"
              />
              <button
                type="button"
                onClick={() => editorFileInputRef.current?.click()}
                className="p-1.5 hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 rounded border border-emerald-500/30 transition flex items-center gap-1 text-[11px]"
                title="อัปโหลดไฟล์สื่อจากคอมพิวเตอร์เข้าสู่โฟลเดอร์นี้"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="font-semibold hidden sm:inline">อัปโหลด</span>
              </button>
              <button
                onClick={handleCreateNewFile}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded"
                title="สร้างไฟล์ใหม่"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => fetchFiles(currentDir)}
                className="p-1 hover:bg-gray-800 text-gray-400 hover:text-white rounded"
                title="รีเฟรชโฟลเดอร์"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-3 py-1.5 bg-gray-950 border-b border-gray-850 text-[11px] text-gray-400 font-mono truncate">
            📁 {currentDir}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {currentDir !== '.' && currentDir !== activeProject?.vpsFolder && (
              <button
                onClick={() => {
                  const parts = currentDir.replace(/\\/g, '/').split('/');
                  parts.pop();
                  fetchFiles(parts.join('/') || activeProject?.vpsFolder || '.');
                }}
                className="w-full text-left px-2 py-1 text-xs text-indigo-400 hover:bg-gray-800 rounded flex items-center gap-1.5"
              >
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                <span>.. (ย้อนกลับ)</span>
              </button>
            )}

            {fileList.map((item, idx) => {
              const isSelected = activeFilePath === item.path;
              return (
                <button
                  key={idx}
                  onClick={() => openFile(item)}
                  className={`w-full text-left px-2.5 py-1.5 text-xs rounded flex items-center space-x-2 transition ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  {item.isDirectory ? (
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <FileCode className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                  <span className="truncate">{item.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor Container */}
        <div
          className={`flex-1 flex-col bg-gray-950 min-w-0 ${
            mobileTab === 'editor' ? 'flex w-full' : 'hidden md:flex'
          }`}
        >
          {/* Editor Top Bar */}
          <div className="h-10 bg-gray-900 border-b border-gray-800 px-3 sm:px-4 flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-mono text-gray-200 truncate">
                {activeFilePath ? activeFilePath : 'ยังไม่ได้เลือกไฟล์'}
              </span>
            </div>

            {activeFilePath && (
              <div className="flex items-center space-x-2 shrink-0">
                {statusMsg && (
                  <span className="text-xs text-emerald-400 font-medium animate-fade-in hidden sm:inline">
                    ✓ {statusMsg}
                  </span>
                )}
                <button
                  onClick={handleSaveFile}
                  disabled={isSaving}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกไฟล์'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Monaco Editor area */}
          <div className="flex-1 relative min-w-0">
            {activeFilePath ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={getLanguageFromPath(activeFilePath)}
                value={fileContent}
                onChange={(value) => setFileContent(value || '')}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                <Code2 className="w-12 h-12 mb-2 text-gray-700" />
                <p className="text-sm">เลือกไฟล์จากแถบด้านซ้ายเพื่อเปิดดูและแก้ไขโค้ดบน VPS</p>
                <button
                  onClick={() => setMobileTab('files')}
                  className="md:hidden mt-3 px-3 py-1.5 bg-indigo-600/30 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/40"
                >
                  📁 ไปยังรายการไฟล์
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
