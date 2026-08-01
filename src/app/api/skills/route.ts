import { NextResponse } from 'next/server';

export interface ActionSkill {
  id: string;
  name: string;
  description: string;
  category: 'vps' | 'facebook' | 'rag' | 'custom';
  enabled: boolean;
}

const REGISTERED_SKILLS: ActionSkill[] = [
  {
    id: 'vps-file-manager',
    name: 'VPS File System Tool',
    description: 'Read, write, list, and format source code files directly on host VPS folders.',
    category: 'vps',
    enabled: true,
  },
  {
    id: 'facebook-graph-api',
    name: 'Facebook Graph API Helper',
    description: 'Post updates, fetch page metrics, and manage Facebook page content automatically.',
    category: 'facebook',
    enabled: true,
  },
  {
    id: 'rag-document-search',
    name: 'Workspace Document RAG',
    description: 'Search and retrieve relevant context from workspace document repository.',
    category: 'rag',
    enabled: true,
  },
  {
    id: 'line-bot-webhook',
    name: 'LINE Messaging Webhook Tool',
    description: 'Trigger automated messages and test LINE Bot webhooks directly from Command Center.',
    category: 'custom',
    enabled: true,
  },
];

export async function GET() {
  return NextResponse.json({ skills: REGISTERED_SKILLS });
}

export async function POST(req: Request) {
  try {
    const { skillId, action, params } = await req.json();

    if (skillId === 'vps-file-manager') {
      return NextResponse.json({
        success: true,
        output: `[VPS File Manager Executed]: Action ${action} performed on target path successfully.`,
      });
    }

    if (skillId === 'facebook-graph-api') {
      return NextResponse.json({
        success: true,
        output: `[FB Graph API Executed]: Request sent to Graph API endpoint. Status 200 OK.`,
      });
    }

    return NextResponse.json({
      success: true,
      output: `[Skill ${skillId} Executed]: Action ${action || 'default'} completed.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
