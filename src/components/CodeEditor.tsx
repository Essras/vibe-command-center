'use client';

import React, { useState, useEffect } from 'react';
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
    <div className="flex-1 flex h-[calc(100vh-4rem)] bg-gray-950 text-gray-100 overflow-hidden">
      {/* Sidebar File Explorer */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Folder className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-gray-200 truncate">VPS Workspace</span>
          </div>
          <div className="flex items-center space-x-1">
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
          {currentDir !== '.' && (
            <button
              onClick={() => {
                const parts = currentDir.split('/');
                parts.pop();
                fetchFiles(parts.join('/') || '.');
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
      <div className="flex-1 flex flex-col bg-gray-950">
        {/* Editor Top Bar */}
        <div className="h-10 bg-gray-900 border-b border-gray-800 px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-mono text-gray-200">
              {activeFilePath ? activeFilePath : 'ยังไม่ได้เลือกไฟล์'}
            </span>
          </div>

          {activeFilePath && (
            <div className="flex items-center space-x-3">
              {statusMsg && (
                <span className="text-xs text-emerald-400 font-medium animate-fade-in">
                  ✓ {statusMsg}
                </span>
              )}
              <button
                onClick={handleSaveFile}
                disabled={isSaving}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกไฟล์บน VPS'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Monaco Editor area */}
        <div className="flex-1">
          {activeFilePath ? (
            <Editor
              height="100%"
              theme="vs-dark"
              language={getLanguageFromPath(activeFilePath)}
              value={fileContent}
              onChange={(value) => setFileContent(value || '')}
              options={{
                fontSize: 13,
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500">
              <Code2 className="w-12 h-12 mb-2 text-gray-700" />
              <p className="text-sm">เลือกไฟล์จากแถบด้านซ้ายเพื่อเปิดดูและแก้ไขโค้ดบน VPS</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
