import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, path, referrer } = body;

    if (!sessionId || !path) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Hash IP for privacy
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const ipHash = crypto.createHash("sha256").update(ip + "pageview-salt").digest("hex").slice(0, 16);

    const userAgent = req.headers.get("user-agent") || "";

    const supabase = createServiceClient();
    await supabase.from("page_views").insert({
      session_id: sessionId.slice(0, 64),
      page_path: path.slice(0, 500),
      referrer: referrer?.slice(0, 1000) || null,
      user_agent: userAgent.slice(0, 500),
      ip_hash: ipHash,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
