import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { configManager } from "@/lib/config-manager";

export async function GET() {
  return NextResponse.json(configManager.getConfig());
}

const updateSchema = z.object({
  concepts: z.array(z.string()).optional(),
  queueSize: z.number().int().min(1).max(20).optional(),
  quality: z.enum(["720p", "1080p"]).optional(),
  curateEnabled: z.boolean().optional(),
});

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const result = updateSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid config", details: result.error.issues },
        { status: 400 }
      );
    }
    const updated = configManager.updateConfig(result.data);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
