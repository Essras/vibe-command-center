'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { ChatInterface, ChatMessageUI } from '@/components/ChatInterface';
import { CodeEditor } from '@/components/CodeEditor';
import { ModelSettingsModal } from '@/components/ModelSettingsModal';
import { ProjectModal } from '@/components/ProjectModal';
import { SkillsModal } from '@/components/SkillsModal';
import { UserManagementModal } from '@/components/UserManagementModal';
import { Project, FavoriteModel, ProviderKeys, VibeData } from '@/lib/db';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<VibeData | null>(null);
  const [activeProjectId, setActiveProjectId] = useState<string>('default-workspace');
  const [activeModelId, setActiveModelId] = useState<string>('gemini-2.0-flash');
  const [activeTab, setActiveTab] = useState<'chat' | 'editor'>('chat');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);

  // Chat State
  const [messages, setMessages] = useState<ChatMessageUI[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchDb = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const dbData: VibeData = await res.json();
      setData(dbData);
      if (dbData.activeModelId) setActiveModelId(dbData.activeModelId);
      if (dbData.projects.length > 0) {
        if (!dbData.projects.some((p) => p.id === activeProjectId)) {
          setActiveProjectId(dbData.projects[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load DB:', err);
    }
  };

  const fetchChatHistory = async (projId: string) => {
    try {
      const res = await fetch(`/api/chat?projectId=${projId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  useEffect(() => {
    fetchDb();
  }, []);

  useEffect(() => {
    if (activeProjectId) {
      fetchChatHistory(activeProjectId);
    }
  }, [activeProjectId]);

  const handleSendMessage = async (text: string, attachments: any[]) => {
    const userMsg: ChatMessageUI = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: text,
      attachments,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);

    const assistantMsgId = 'msg-' + (Date.now() + 1);
    let assistantContent = '';
    let modelUsed = activeModelId;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProjectId,
          messages: newMessages,
          modelId: activeModelId,
        }),
      });

      if (!res.body) throw new Error('No body stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          modelUsed: activeModelId,
          timestamp: new Date().toISOString(),
        },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.fallbackNotice) {
                assistantContent += parsed.fallbackNotice;
              }
              if (parsed.text) {
                assistantContent += parsed.text;
              }
              if (parsed.modelUsed) {
                modelUsed = parsed.modelUsed;
              }

              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId
                    ? { ...msg, content: assistantContent, modelUsed }
                    : msg
                )
              );
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          content: `เกิดข้อผิดพลาด: ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  const handleSelectModel = async (modelId: string) => {
    setActiveModelId(modelId);
    if (data) {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_settings', activeModelId: modelId }),
      });
    }
  };

  const handleSaveSettings = async (
    newKeys: ProviderKeys,
    newAutoFallback: boolean,
    newFavorites: FavoriteModel[]
  ) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_settings',
        keys: newKeys,
        autoFallback429: newAutoFallback,
        favoriteModels: newFavorites,
      }),
    });
    const updated = await res.json();
    if (updated.db) setData(updated.db);
  };

  const handleCreateProject = async (proj: Partial<Project>) => {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create_project', project: proj }),
    });
    const result = await res.json();
    if (result.project) {
      await fetchDb();
      setActiveProjectId(result.project.id);
    }
  };

  const handleUpdateProject = async (proj: Partial<Project>) => {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_project', project: proj }),
    });
    await fetchDb();
  };

  const handleDeleteProject = async (id: string) => {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_project', project: { id } }),
    });
    await fetchDb();
  };

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
  };

  const activeProject = data?.projects.find((p) => p.id === activeProjectId);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar
        projects={data?.projects || []}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        favoriteModels={data?.favoriteModels || []}
        activeModelId={activeModelId}
        onSelectModel={handleSelectModel}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenSkills={() => setIsSkillsModalOpen(true)}
        onOpenUsers={() => setIsUsersModalOpen(true)}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col">
        {activeTab === 'chat' ? (
          <ChatInterface
            activeProject={activeProject}
            favoriteModels={data?.favoriteModels || []}
            activeModelId={activeModelId}
            onSelectModel={handleSelectModel}
            messages={messages}
            onSendMessage={handleSendMessage}
            onClearHistory={handleClearHistory}
            isLoading={isLoading}
          />
        ) : (
          <CodeEditor activeProject={activeProject} />
        )}
      </main>

      {/* Modals */}
      {data && (
        <ModelSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          keys={data.keys}
          autoFallback429={data.autoFallback429}
          favoriteModels={data.favoriteModels}
          onSaveSettings={handleSaveSettings}
        />
      )}

      {data && (
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => setIsProjectModalOpen(false)}
          projects={data.projects}
          activeProjectId={activeProjectId}
          onCreateProject={handleCreateProject}
          onUpdateProject={handleUpdateProject}
          onDeleteProject={handleDeleteProject}
        />
      )}

      <SkillsModal
        isOpen={isSkillsModalOpen}
        onClose={() => setIsSkillsModalOpen(false)}
      />

      <UserManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
      />
    </div>
  );
}
