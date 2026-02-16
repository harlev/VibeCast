import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { autoCurator } from "@/lib/auto-curator";

export async function GET() {
  return NextResponse.json(autoCurator.getStatus());
}

const actionSchema = z.object({
  action: z.enum(["start", "stop", "trigger"]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = actionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid action", details: result.error.issues },
        { status: 400 }
      );
    }

    const { action } = result.data;
    switch (action) {
      case "start":
        autoCurator.start();
        break;
      case "stop":
        autoCurator.stop();
        break;
      case "trigger":
        autoCurator.trigger();
        break;
    }

    return NextResponse.json(autoCurator.getStatus());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
