'use client';

import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Folder,
  ChevronRight,
  Save,
  Plus,
  RefreshCw,
  Trash2,
  Code2,
  FileCode,
  Upload,
  Edit2,
  Copy,
  Download,
  Film,
  Image as ImageIcon,
  Music,
  FileText,
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
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [gdriveUrl, setGdriveUrl] = useState<string>('');
  const [isImportingGDrive, setIsImportingGDrive] = useState<boolean>(false);
  const editorFileInputRef = useRef<HTMLInputElement>(null);

  const isVideoFile = (path: string | null) => {
    if (!path) return false;
    return /\.(mp4|webm|mov|mkv|avi)$/i.test(path);
  };

  const isImageFile = (path: string | null) => {
    if (!path) return false;
    return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(path);
  };

  const isAudioFile = (path: string | null) => {
    if (!path) return false;
    return /\.(mp3|wav|ogg|m4a)$/i.test(path);
  };

  const isPdfFile = (path: string | null) => {
    if (!path) return false;
    return /\.pdf$/i.test(path);
  };

  const isMediaOrBinaryFile = (path: string | null) => {
    if (!path) return false;
    return (
      isVideoFile(path) ||
      isImageFile(path) ||
      isAudioFile(path) ||
      isPdfFile(path) ||
      /\.(zip|tar|gz|7z|rar|exe|bin|iso)$/i.test(path)
    );
  };

  const handleImportGDrive = async () => {
    if (!gdriveUrl.trim()) return;
    setIsImportingGDrive(true);
    setStatusMsg('กำลังดึงไฟล์/โฟลเดอร์จาก Google Drive...');

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_gdrive',
          path: currentDir,
          url: gdriveUrl.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchFiles(currentDir);
        setStatusMsg(data.message || 'ดึงไฟล์จาก Google Drive เรียบร้อยแล้ว!');
        setShowUploadModal(false);
        setGdriveUrl('');
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        alert(data.error || 'ไม่สามารถดึงไฟล์จาก Google Drive ได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการดึงไฟล์');
    } finally {
      setIsImportingGDrive(false);
    }
  };

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

  const handleRenameFile = async (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newName = prompt(`เปลี่ยนชื่อ "${item.name}" เป็น:`, item.name);
    if (!newName || newName.trim() === '' || newName === item.name) return;

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          oldPath: item.path,
          newName: newName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchFiles(currentDir);
        setStatusMsg(`เปลี่ยนชื่อเป็น ${newName.trim()} เรียบร้อยแล้ว!`);
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        alert(data.error || 'ไม่สามารถเปลี่ยนชื่อได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนชื่อ');
    }
  };

  const handleDeleteFile = async (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`คุณต้องการลบ "${item.name}" ใช่หรือไม่?`)) return;

    try {
      const res = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          path: item.path,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (activeFilePath === item.path) {
          setActiveFilePath(null);
          setFileContent('');
        }
        fetchFiles(currentDir);
        setStatusMsg(`ลบ ${item.name} เรียบร้อยแล้ว!`);
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        alert(data.error || 'ไม่สามารถลบได้');
      }
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  const handleCopyPath = (item: FileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.path);
    setStatusMsg(`คัดลอก Path "${item.path}" เรียบร้อยแล้ว!`);
    setTimeout(() => setStatusMsg(''), 4000);
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
      setActiveFilePath(item.path);
      setMobileTab('editor'); // Auto switch to editor on mobile when file selected

      if (!isMediaOrBinaryFile(item.path)) {
        try {
          const res = await fetch(`/api/files?action=read&path=${encodeURIComponent(item.path)}`);
          const data = await res.json();
          if (data.content !== undefined) {
            setFileContent(data.content);
            setStatusMsg('');
          }
        } catch (err) {
          console.error('Error reading file:', err);
        }
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

  const renderFileIcon = (item: FileItem) => {
    if (item.isDirectory) {
      return <Folder className="w-4 h-4 text-amber-400 shrink-0" />;
    }
    if (isVideoFile(item.path)) {
      return <Film className="w-4 h-4 text-purple-400 shrink-0" />;
    }
    if (isImageFile(item.path)) {
      return <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
    if (isAudioFile(item.path)) {
      return <Music className="w-4 h-4 text-pink-400 shrink-0" />;
    }
    if (isPdfFile(item.path)) {
      return <FileText className="w-4 h-4 text-rose-400 shrink-0" />;
    }
    return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
  };

  const rawUrl = activeFilePath ? `/api/files/raw?path=${encodeURIComponent(activeFilePath)}` : '';
  const downloadUrl = activeFilePath ? `/api/files/raw?path=${encodeURIComponent(activeFilePath)}&download=true` : '';

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
          {isVideoFile(activeFilePath) ? (
            <Film className="w-3.5 h-3.5" />
          ) : isImageFile(activeFilePath) ? (
            <ImageIcon className="w-3.5 h-3.5" />
          ) : (
            <FileCode className="w-3.5 h-3.5" />
          )}
          <span>{isMediaOrBinaryFile(activeFilePath) ? '🎬 พรีวิวสื่อ' : '📝 ตัวแก้ไขโค้ด'}</span>
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
                onClick={() => setShowUploadModal(true)}
                className="p-1.5 hover:bg-emerald-950/80 text-emerald-400 hover:text-emerald-300 rounded border border-emerald-500/30 transition flex items-center gap-1 text-[11px]"
                title="นำเข้าไฟล์สื่อจากคอมพิวเตอร์ หรือ Google Drive"
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

          <div className="px-3 py-1.5 bg-gray-950 border-b border-gray-850 text-[11px] text-gray-400 font-mono truncate flex items-center justify-between">
            <span className="truncate">📁 {currentDir}</span>
            {currentDir.includes('workspace/video-editor') && (
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Media Folder
              </span>
            )}
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
                <div
                  key={idx}
                  onClick={() => openFile(item)}
                  className={`w-full group text-left px-2.5 py-1.5 text-xs rounded flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600/30 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0 pr-1">
                    {renderFileIcon(item)}
                    <span className="truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
                    {!item.isDirectory && (
                      <a
                        href={`/api/files/raw?path=${encodeURIComponent(item.path)}&download=true`}
                        download
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-gray-700 text-gray-400 hover:text-emerald-300 rounded"
                        title="ดาวน์โหลดไฟล์นี้ลงเครื่อง"
                      >
                        <Download className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleCopyPath(item, e)}
                      className="p-1 hover:bg-gray-700 text-gray-400 hover:text-indigo-300 rounded"
                      title="คัดลอก Path ไฟล์ไปวางในแชท"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleRenameFile(item, e)}
                      className="p-1 hover:bg-gray-700 text-gray-400 hover:text-amber-300 rounded"
                      title="เปลี่ยนชื่อไฟล์"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteFile(item, e)}
                      className="p-1 hover:bg-gray-700 text-gray-400 hover:text-rose-400 rounded"
                      title="ลบไฟล์"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Editor / Media Viewer Container */}
        <div
          className={`flex-1 flex-col bg-gray-950 min-w-0 ${
            mobileTab === 'editor' ? 'flex w-full' : 'hidden md:flex'
          }`}
        >
          {/* Top Bar */}
          <div className="h-10 bg-gray-900 border-b border-gray-800 px-3 sm:px-4 flex items-center justify-between min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              {isVideoFile(activeFilePath) ? (
                <Film className="w-4 h-4 text-purple-400 shrink-0" />
              ) : isImageFile(activeFilePath) ? (
                <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <FileCode className="w-4 h-4 text-indigo-400 shrink-0" />
              )}
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

                {/* Always show Download Button for any selected file */}
                <a
                  href={downloadUrl}
                  download
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow transition"
                  title="ดาวน์โหลดไฟล์ลงเครื่องคอมพิวเตอร์/มือถือ"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>ดาวน์โหลด</span>
                </a>

                {/* Save button only for editable text files */}
                {!isMediaOrBinaryFile(activeFilePath) && (
                  <button
                    onClick={handleSaveFile}
                    disabled={isSaving}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg flex items-center gap-1 shadow transition disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกไฟล์'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Main Area: Video Player, Image Viewer, Audio Player, PDF or Monaco Editor */}
          <div className="flex-1 relative min-w-0 overflow-y-auto p-2 sm:p-4">
            {activeFilePath ? (
              isVideoFile(activeFilePath) ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-full max-w-4xl bg-black rounded-2xl p-2 border border-gray-800 shadow-2xl">
                    <video
                      key={activeFilePath}
                      controls
                      autoPlay={false}
                      preload="metadata"
                      src={rawUrl}
                      className="w-full max-h-[65vh] rounded-xl object-contain"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={downloadUrl}
                      download
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>📥 ดาวน์โหลดวิดีโอนี้ (.mp4) ลงเครื่อง</span>
                    </a>
                  </div>
                </div>
              ) : isImageFile(activeFilePath) ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="max-w-4xl p-2 bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl flex items-center justify-center">
                    <img
                      key={activeFilePath}
                      src={rawUrl}
                      alt={activeFilePath}
                      className="max-h-[65vh] object-contain rounded-xl"
                    />
                  </div>
                  <a
                    href={downloadUrl}
                    download
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>📥 ดาวน์โหลดรูปภาพนี้ลงเครื่อง</span>
                  </a>
                </div>
              ) : isAudioFile(activeFilePath) ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 max-w-xl mx-auto">
                  <div className="w-full bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-2xl space-y-4 text-center">
                    <Music className="w-12 h-12 text-pink-400 mx-auto animate-pulse" />
                    <p className="text-sm font-mono text-gray-200">{activeFilePath}</p>
                    <audio key={activeFilePath} controls src={rawUrl} className="w-full" />
                    <a
                      href={downloadUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-xl text-xs transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>📥 ดาวน์โหลดไฟล์เสียงลงเครื่อง</span>
                    </a>
                  </div>
                </div>
              ) : isPdfFile(activeFilePath) ? (
                <div className="h-full flex flex-col space-y-2">
                  <iframe key={activeFilePath} src={rawUrl} className="w-full flex-1 rounded-xl border border-gray-800" />
                </div>
              ) : isMediaOrBinaryFile(activeFilePath) ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="p-8 bg-gray-900 border border-gray-800 rounded-2xl text-center space-y-3 max-w-md">
                    <FileText className="w-12 h-12 text-gray-500 mx-auto" />
                    <p className="text-sm font-semibold text-gray-200">ไฟล์ไบนารี / Binary File</p>
                    <p className="text-xs text-gray-400 font-mono break-all">{activeFilePath}</p>
                    <a
                      href={downloadUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>📥 ดาวน์โหลดไฟล์นี้ลงเครื่อง</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="h-full relative">
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
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 p-4 text-center">
                <Code2 className="w-12 h-12 mb-2 text-gray-700" />
                <p className="text-sm">เลือกไฟล์จากแถบด้านซ้ายเพื่อเปิดดู เล่นวิดีโอ หรือดาวน์โหลดไฟล์</p>
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

      {/* Upload Modal (PC Upload vs Google Drive Import) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>นำเข้าไฟล์สู่โฟลเดอร์ ({currentDir})</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded bg-gray-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Option 1: Upload from Computer */}
              <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl space-y-2">
                <div className="font-bold text-gray-200 flex items-center justify-between">
                  <span>📄 1. อัปโหลดจากคอมพิวเตอร์ / มือถือ</span>
                </div>
                <p className="text-gray-400 text-[11px]">
                  เลือกไฟล์วิดีโอ (.mp4), เสียง (.mp3), ภาพ (.png) หรือเอกสารเพื่อนำเข้าสู่โฟลเดอร์นี้
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    editorFileInputRef.current?.click();
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition"
                >
                  💻 เลือกไฟล์จากเครื่อง
                </button>
              </div>

              <div className="text-center text-[11px] text-gray-500 font-bold">- หรือ -</div>

              {/* Option 2: Import from Google Drive Link/Folder */}
              <div className="p-3.5 bg-gray-950 border border-indigo-500/30 rounded-xl space-y-2">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <span>🌐 2. ดึงไฟล์ / โฟลเดอร์จาก Google Drive</span>
                </div>
                <p className="text-gray-400 text-[11px]">
                  วางลิงก์ไฟล์ หรือ ลิงก์โฟลเดอร์ Google Drive เพื่อดึงข้อมูลลงโฟลเดอร์นี้โดยตรง
                </p>
                <input
                  type="text"
                  placeholder="https://drive.google.com/drive/folders/... หรือ https://drive.google.com/file/d/..."
                  value={gdriveUrl}
                  onChange={(e) => setGdriveUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  disabled={isImportingGDrive || !gdriveUrl.trim()}
                  onClick={handleImportGDrive}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5"
                >
                  {isImportingGDrive ? '⏳ กำลังดึงข้อมูลจาก Google Drive...' : '📥 ดึงไฟล์จาก Google Drive เข้าโฟลเดอร์นี้'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
