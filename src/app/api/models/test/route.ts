import { NextResponse } from 'next/server';
import { callAIProvider } from '@/lib/ai-engine';
import { FavoriteModel, ProviderKeys } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { model, keys }: { model: FavoriteModel; keys: ProviderKeys } = await req.json();
    const startTime = Date.now();

    const testMessage = [{ role: 'user', content: 'Ping connection test' }];
    const res = await callAIProvider(model, testMessage, undefined, keys);

    const latency = Date.now() - startTime;

    if (res.ok || res.status === 200) {
      return NextResponse.json({
        success: true,
        latency,
        status: res.status,
        message: `🟢 การเชื่อมต่อกับ ${model.provider.toUpperCase()} (${model.name}) สำเร็จ! (Latency: ${latency}ms, Status: 200 OK)`,
      });
    } else {
      const errText = await res.text();
      let parsedMessage = errText;
      try {
        const json = JSON.parse(errText);
        parsedMessage = json.error?.message || json.message || errText;
      } catch (e) {}

      return NextResponse.json({
        success: false,
        latency,
        status: res.status,
        message: `🔴 เกิดข้อผิดพลาด (${res.status} ${res.statusText}): ${parsedMessage.slice(0, 200)}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      message: `🔴 ไม่สามารถเชื่อมต่อได้: ${err.message}`,
    });
  }
}
