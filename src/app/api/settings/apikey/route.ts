import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const envPath = join(process.cwd(), ".env.local");

const PutBody = z.object({
  apiKey: z.string().min(1, "API key is required"),
});

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "..." + key.slice(-4);
}

async function readEnvFile(): Promise<string> {
  try {
    return await readFile(envPath, "utf-8");
  } catch {
    return "";
  }
}

function getKeyFromEnv(content: string): string | null {
  const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
  return match ? match[1].trim() : null;
}

function setKeyInEnv(content: string, key: string): string {
  const line = `OPENAI_API_KEY=${key}`;
  if (content.match(/^OPENAI_API_KEY=/m)) {
    return content.replace(/^OPENAI_API_KEY=.+$/m, line);
  }
  // Append, ensuring newline before
  const separator = content.length > 0 && !content.endsWith("\n") ? "\n" : "";
  return content + separator + line + "\n";
}

export async function GET() {
  const content = await readEnvFile();
  const key = getKeyFromEnv(content);

  return NextResponse.json({
    configured: key !== null && key.length > 0,
    masked: key ? maskKey(key) : null,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = PutBody.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { apiKey } = parsed.data;

  const content = await readEnvFile();
  const updated = setKeyInEnv(content, apiKey);
  await writeFile(envPath, updated, "utf-8");

  // Set at runtime so it takes effect immediately
  process.env.OPENAI_API_KEY = apiKey;

  return NextResponse.json({
    configured: true,
    masked: maskKey(apiKey),
  });
}
