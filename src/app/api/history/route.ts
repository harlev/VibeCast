import { NextResponse } from "next/server";
import { historyManager } from "@/lib/history-manager";

export async function GET() {
  return NextResponse.json(historyManager.getHistory());
}

export async function DELETE() {
  historyManager.clear();
  return NextResponse.json({ ok: true });
}
