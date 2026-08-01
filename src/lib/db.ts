import fs from 'fs';
import path from 'path';

export interface FavoriteModel {
  id: string;
  name: string;
  provider: 'gemini' | 'openai' | 'claude' | 'openrouter' | 'okmd';
}

export interface ProviderKeys {
  geminiApiKey?: string;
  openaiApiKey?: string;
  claudeApiKey?: string;
  openrouterApiKey?: string;
  okmdApiKey?: string;
  okmdBaseUrl?: string;
}

export interface Project {
  id: string;
  userId?: string; // Tenant Owner Username
  name: string;
  description: string;
  systemPrompt: string; // Personal memory / GEMINI.md
  vpsFolder: string;
  createdAt: string;
}

export interface UserMember {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'member';
  creditsBalance: number;
  createdAt: string;
}

export interface TokenUsageLogItem {
  id: string;
  userId: string;
  projectId?: string;
  modelUsed: string;
  promptTokens: number;
  completionTokens: number;
  creditsDeducted: number;
  timestamp: string;
}

export interface TopupLogItem {
  id: string;
  userId: string;
  amount: number;
  creditsAdded: number;
  paymentGateway: string;
  transactionId: string;
  status: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: { name: string; type: string; content?: string }[];
  modelUsed?: string;
  timestamp: string;
}

export interface VibeData {
  keys: ProviderKeys;
  autoFallback429: boolean;
  favoriteModels: FavoriteModel[];
  activeModelId: string;
  projects: Project[];
  chatHistory: Record<string, ChatMessage[]>; // projectId -> messages
  users: UserMember[];
  tokenUsageLogs: TokenUsageLogItem[];
  topupLogs: TopupLogItem[];
  currentUser?: {
    username: string;
    role: 'admin' | 'member';
    creditsBalance: number;
  };
}

const DB_PATH = process.env.DATA_PATH
  ? path.join(process.env.DATA_PATH, 'vibe_db.json')
  : path.join(process.cwd(), 'data', 'vibe_db.json');

const DEFAULT_DATA: VibeData = {
  keys: {
    geminiApiKey: '',
    openaiApiKey: '',
    claudeApiKey: '',
    openrouterApiKey: '',
    okmdApiKey: '',
    okmdBaseUrl: 'https://gen.ai.kku.ac.th/okmd/api/v1',
  },
  autoFallback429: true,
  favoriteModels: [
    { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'gemini' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude' },
    { id: 'gpt-4o', name: 'OpenAI GPT-4o', provider: 'openai' },
  ],
  activeModelId: 'gemini-2.0-flash',
  projects: [
    {
      id: 'default-workspace',
      name: 'General Vibe Workspace',
      description: 'Default project workspace for Vibe Coding & Content AI',
      systemPrompt: 'You are an expert Vibe Coding assistant and Content Strategist. Always provide clean code, clear explanations in Thai, and actionable advice.',
      vpsFolder: './workspace',
      createdAt: new Date().toISOString(),
    },
  ],
  chatHistory: {},
  users: [
    {
      id: 'user-admin',
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'vibe2026',
      role: 'admin',
      creditsBalance: 100.0,
      createdAt: new Date().toISOString(),
    },
  ],
  tokenUsageLogs: [],
  topupLogs: [],
};

export function getDb(): VibeData {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(DEFAULT_DATA, null, 2), 'utf-8');
      return DEFAULT_DATA;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    
    // Migration fallbacks
    if (!parsed.users || parsed.users.length === 0) {
      parsed.users = DEFAULT_DATA.users;
    }
    parsed.users = parsed.users.map((u: any) => ({
      ...u,
      creditsBalance: typeof u.creditsBalance === 'number' ? u.creditsBalance : 100.0,
    }));
    if (!parsed.tokenUsageLogs) {
      parsed.tokenUsageLogs = [];
    }
    if (!parsed.topupLogs) {
      parsed.topupLogs = [];
    }
    // Update OKMD base URL default if set to old default
    if (parsed.keys && parsed.keys.okmdBaseUrl === 'https://api.okmd.ai/v1') {
      parsed.keys.okmdBaseUrl = 'https://gen.ai.kku.ac.th/okmd/api/v1';
    }

    return { ...DEFAULT_DATA, ...parsed };
  } catch (err) {
    console.error('Error reading DB:', err);
    return DEFAULT_DATA;
  }
}

export function saveDb(data: VibeData) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}
